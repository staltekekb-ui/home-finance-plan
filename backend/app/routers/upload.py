import os
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from app.config import get_settings
from app.services.ocr_service import parse_screenshot
from app.schemas import ParsedTransaction
from app.logging_config import get_logger

router = APIRouter(prefix="/api", tags=["upload"])
settings = get_settings()
logger = get_logger(__name__)


async def process_uploaded_file(file: UploadFile) -> tuple[str, List[ParsedTransaction] | None, str | None]:
    """Process a single uploaded file and return (filename, parsed_results, error)"""
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"Invalid file type: {file.content_type}", extra={"original_name": file.filename})
        return (file.filename or "unknown", None, "Файл должен быть изображением")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "image.png").suffix
    filename = f"{uuid.uuid4()}{extension}"
    file_path = upload_dir / filename

    content = await file.read()
    file_path.write_bytes(content)

    try:
        logger.info(f"Processing screenshot: {file.filename}", extra={"saved_as": filename})
        parsed_transactions = await parse_screenshot(str(file_path))
        logger.info(f"Screenshot parsed successfully", extra={
            "original_name": file.filename,
            "transaction_count": len(parsed_transactions),
        })
        return (file.filename or filename, parsed_transactions, None)
    except Exception as e:
        logger.error(f"Failed to parse screenshot: {str(e)}", extra={"original_name": file.filename}, exc_info=True)
        return (file.filename or filename, None, f"Ошибка распознавания: {str(e)}")


@router.post("/upload", response_model=List[ParsedTransaction])
async def upload_screenshot(file: UploadFile = File(...)):
    """Upload a single screenshot and extract all transactions from it"""
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"Upload rejected: invalid file type", extra={"content_type": file.content_type})
        raise HTTPException(status_code=400, detail="Файл должен быть изображением")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "image.png").suffix
    filename = f"{uuid.uuid4()}{extension}"
    file_path = upload_dir / filename

    content = await file.read()
    file_path.write_bytes(content)

    try:
        logger.info(f"Processing single screenshot", extra={"original_name": file.filename, "saved_as": filename})
        parsed_transactions = await parse_screenshot(str(file_path))
        logger.info(f"Screenshot parsed successfully", extra={
            "transaction_count": len(parsed_transactions),
        })
        return parsed_transactions
    except Exception as e:
        logger.error(f"Failed to parse screenshot: {str(e)}", extra={"saved_as": filename}, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка распознавания: {str(e)}")


@router.post("/upload/batch")
async def upload_batch(files: List[UploadFile] = File(...)):
    """Upload multiple screenshots and parse them all. Each screenshot can contain multiple transactions."""
    logger.info(f"Batch upload started", extra={"file_count": len(files)})
    results = []
    success_count = 0
    total_transactions = 0

    for file in files:
        filename, parsed_transactions, error = await process_uploaded_file(file)
        if parsed_transactions:
            success_count += 1
            total_transactions += len(parsed_transactions)
        results.append({
            "filename": filename,
            "success": parsed_transactions is not None,
            "data": [t.model_dump() for t in parsed_transactions] if parsed_transactions else None,
            "error": error,
        })

    logger.info(f"Batch upload completed", extra={
        "total_files": len(files),
        "success_files": success_count,
        "failed_files": len(files) - success_count,
        "total_transactions": total_transactions,
    })
    return {"results": results}
