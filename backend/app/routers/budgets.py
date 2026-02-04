from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date
from app.database import get_db
from app.models import Budget, Transaction
from app.schemas import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BudgetStatus,
)

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.post("/", response_model=BudgetResponse)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
    # Check if budget for this category already exists
    existing = db.query(Budget).filter(Budget.category == budget.category).first()
    if existing:
        raise HTTPException(status_code=400, detail="Бюджет для этой категории уже существует")

    db_budget = Budget(**budget.model_dump())
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget


@router.get("/", response_model=list[BudgetResponse])
def get_budgets(db: Session = Depends(get_db)):
    return db.query(Budget).order_by(Budget.category).all()


@router.get("/status", response_model=list[BudgetStatus])
def get_budgets_status(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
):
    """Get all budgets with current spending status"""
    today = date.today()
    year = year or today.year
    month = month or today.month

    budgets = db.query(Budget).all()
    result = []

    for budget in budgets:
        # Calculate spent amount for this category in the given month
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.category == budget.category,
            extract('year', Transaction.date) == year,
            extract('month', Transaction.date) == month,
        ).scalar() or 0

        remaining = budget.monthly_limit - spent
        percentage = (spent / budget.monthly_limit * 100) if budget.monthly_limit > 0 else 0

        result.append(BudgetStatus(
            id=budget.id,
            category=budget.category,
            monthly_limit=budget.monthly_limit,
            spent=spent,
            remaining=remaining,
            percentage=round(percentage, 1),
            is_over_threshold=percentage >= budget.alert_threshold * 100,
            alert_threshold=budget.alert_threshold,
        ))

    return result


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(budget_id: int, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Бюджет не найден")
    return budget


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget: BudgetUpdate,
    db: Session = Depends(get_db),
):
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Бюджет не найден")

    update_data = budget.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_budget, field, value)

    db.commit()
    db.refresh(db_budget)
    return db_budget


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Бюджет не найден")

    db.delete(db_budget)
    db.commit()
    return {"message": "Бюджет удалён"}
