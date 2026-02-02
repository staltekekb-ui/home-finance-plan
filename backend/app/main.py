from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import transactions, upload, reports, export

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Домашняя Бухгалтерия",
    description="API для учёта личных финансов",
    version="1.0.0",
)

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


@app.get("/")
def root():
    return {"message": "Домашняя Бухгалтерия API", "docs": "/docs"}
