from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from enum import Enum


class CategoryEnum(str, Enum):
    food = "Еда"
    transport = "Транспорт"
    entertainment = "Развлечения"
    utilities = "ЖКХ"
    health = "Здоровье"
    shopping = "Покупки"
    education = "Образование"
    cafe = "Кафе и рестораны"
    other = "Другое"


class TransactionBase(BaseModel):
    amount: float
    description: str
    category: Optional[str] = None
    date: date


class TransactionCreate(TransactionBase):
    image_path: Optional[str] = None
    raw_text: Optional[str] = None


class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[date] = None


class TransactionResponse(TransactionBase):
    id: int
    image_path: Optional[str] = None
    raw_text: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ParsedTransaction(BaseModel):
    amount: float
    description: str
    category: Optional[str] = None
    date: date
    raw_text: str


class MonthlyReport(BaseModel):
    month: str
    total: float
    count: int
    by_category: dict[str, float]
