from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date
from typing import Optional
from collections import defaultdict
from app.database import get_db
from app.models import Transaction
from app.schemas import MonthlyReport

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/monthly", response_model=list[MonthlyReport])
def get_monthly_report(
    year: Optional[int] = Query(None, description="Год для отчёта"),
    db: Session = Depends(get_db),
):
    if year is None:
        year = date.today().year

    transactions = (
        db.query(Transaction)
        .filter(extract("year", Transaction.date) == year)
        .all()
    )

    monthly_data: dict[int, dict] = defaultdict(lambda: {"total": 0, "count": 0, "by_category": defaultdict(float)})

    for t in transactions:
        month = t.date.month
        monthly_data[month]["total"] += t.amount
        monthly_data[month]["count"] += 1
        category = t.category or "Без категории"
        monthly_data[month]["by_category"][category] += t.amount

    month_names = [
        "", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ]

    result = []
    for month in range(1, 13):
        data = monthly_data[month]
        result.append(MonthlyReport(
            month=f"{month_names[month]} {year}",
            total=round(data["total"], 2),
            count=data["count"],
            by_category=dict(data["by_category"]),
        ))

    return result
