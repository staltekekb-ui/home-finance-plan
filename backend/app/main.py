import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import transactions, upload, reports, export, recurring, budgets, settings, savings, dashboard, accounts
from app.logging_config import setup_logging, get_logger
from app.middleware import RequestLoggingMiddleware

# Setup structured logging
log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(log_level)
logger = get_logger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Домашняя Бухгалтерия",
    description="API для учёта личных финансов",
    version="2.0.0",
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(upload.router)
app.include_router(reports.router)
app.include_router(export.router)
app.include_router(recurring.router)
app.include_router(budgets.router)
app.include_router(settings.router)
app.include_router(savings.router)
app.include_router(dashboard.router)
app.include_router(accounts.router)

logger.info("Application started", extra={"version": "2.0.0"})


@app.get("/")
def root():
    return {"message": "Домашняя Бухгалтерия API", "docs": "/docs"}
