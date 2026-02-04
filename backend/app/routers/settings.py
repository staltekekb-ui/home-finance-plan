from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import UserSettings
from app.schemas import UserSettingsUpdate, UserSettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_or_create_settings(db: Session) -> UserSettings:
    """Get settings or create default if none exists"""
    settings = db.query(UserSettings).first()
    if not settings:
        settings = UserSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/", response_model=UserSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.put("/", response_model=UserSettingsResponse)
def update_settings(settings: UserSettingsUpdate, db: Session = Depends(get_db)):
    db_settings = get_or_create_settings(db)

    update_data = settings.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_settings, field, value)

    db.commit()
    db.refresh(db_settings)
    return db_settings
