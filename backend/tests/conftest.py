import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.config import Settings

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_test_settings():
    return Settings(
        database_url="sqlite:///:memory:",
        openrouter_api_key="",
        openrouter_model="test",
        upload_dir="/tmp/uploads"
    )


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    with patch("app.services.ocr_service.settings", get_test_settings()):
        with TestClient(app) as c:
            yield c
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def sample_transaction():
    return {
        "amount": 1500.50,
        "description": "Пятёрочка",
        "category": "Еда",
        "date": "2024-01-15"
    }
