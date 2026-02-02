import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from app.config import get_settings
from app.services.ocr_service import parse_screenshot
from app.schemas import ParsedTransaction

router = APIRouter(prefix="/api", tags=["upload"])
settings = get_settings()


@router.post("/upload", response_model=ParsedTransaction)
async def upload_screenshot(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Файл должен быть изображением")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "image.png").suffix
    filename = f"{uuid.uuid4()}{extension}"
    file_path = upload_dir / filename

    content = await file.read()
    file_path.write_bytes(content)

    try:
        parsed = await parse_screenshot(str(file_path))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка распознавания: {str(e)}")
