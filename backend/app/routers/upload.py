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


async def process_uploaded_file(file: UploadFile) -> tuple[str, ParsedTransaction | None, str | None]:
    """Process a single uploaded file and return (filename, parsed_result, error)"""
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"Invalid file type: {file.content_type}", extra={"filename": file.filename})
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
        parsed = await parse_screenshot(str(file_path))
        logger.info(f"Screenshot parsed successfully", extra={
            "filename": file.filename,
            "amount": parsed.amount,
            "category": parsed.category,
        })
        return (file.filename or filename, parsed, None)
    except Exception as e:
        logger.error(f"Failed to parse screenshot: {str(e)}", extra={"filename": file.filename}, exc_info=True)
        return (file.filename or filename, None, f"Ошибка распознавания: {str(e)}")


@router.post("/upload", response_model=ParsedTransaction)
async def upload_screenshot(file: UploadFile = File(...)):
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
        parsed = await parse_screenshot(str(file_path))
        logger.info(f"Screenshot parsed successfully", extra={
            "amount": parsed.amount,
            "description": parsed.description,
            "category": parsed.category,
        })
        return parsed
    except Exception as e:
        logger.error(f"Failed to parse screenshot: {str(e)}", extra={"filename": filename}, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка распознавания: {str(e)}")


@router.post("/upload/batch")
async def upload_batch(files: List[UploadFile] = File(...)):
    """Upload multiple screenshots and parse them all"""
    logger.info(f"Batch upload started", extra={"file_count": len(files)})
    results = []
    success_count = 0
    for file in files:
        filename, parsed, error = await process_uploaded_file(file)
        if parsed:
            success_count += 1
        results.append({
            "filename": filename,
            "success": parsed is not None,
            "data": parsed.model_dump() if parsed else None,
            "error": error,
        })
    logger.info(f"Batch upload completed", extra={
        "total": len(files),
        "success": success_count,
        "failed": len(files) - success_count,
    })
    return {"results": results}
