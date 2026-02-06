from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date
from app.database import get_db
from app.models import SavingsGoal, UserSettings, Transaction
from app.schemas import (
    SavingsGoalCreate,
    SavingsGoalUpdate,
    SavingsGoalResponse,
    MonthlySavingsStatus,
)

router = APIRouter(prefix="/api/savings", tags=["savings"])


@router.post("/goals", response_model=SavingsGoalResponse)
def create_goal(goal: SavingsGoalCreate, db: Session = Depends(get_db)):
    db_goal = SavingsGoal(**goal.model_dump())

    # Auto-complete if current >= target
    if db_goal.current_amount >= db_goal.target_amount:
        db_goal.is_completed = True

    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal


@router.get("/goals", response_model=list[SavingsGoalResponse])
def get_goals(
    include_completed: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(SavingsGoal)
    if not include_completed:
        query = query.filter(SavingsGoal.is_completed == False)
    return query.order_by(SavingsGoal.target_date.nulls_first()).all()


@router.get("/goals/{goal_id}", response_model=SavingsGoalResponse)
def get_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    return goal


@router.put("/goals/{goal_id}", response_model=SavingsGoalResponse)
def update_goal(
    goal_id: int,
    goal: SavingsGoalUpdate,
    db: Session = Depends(get_db),
):
    db_goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")

    update_data = goal.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_goal, field, value)

    # Auto-complete if current >= target
    if db_goal.current_amount >= db_goal.target_amount:
        db_goal.is_completed = True

    db.commit()
    db.refresh(db_goal)
    return db_goal


@router.post("/goals/{goal_id}/add", response_model=SavingsGoalResponse)
def add_to_goal(
    goal_id: int,
    amount: float = Query(..., gt=0),
    db: Session = Depends(get_db),
):
    """Add amount to a savings goal"""
    db_goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")

    db_goal.current_amount += amount

    # Auto-complete if current >= target
    if db_goal.current_amount >= db_goal.target_amount:
        db_goal.is_completed = True

    db.commit()
    db.refresh(db_goal)
    return db_goal


@router.post("/goals/{goal_id}/subtract", response_model=SavingsGoalResponse)
def subtract_from_goal(
    goal_id: int,
    amount: float = Query(..., gt=0),
    db: Session = Depends(get_db),
):
    """Subtract amount from a savings goal (for spending from savings)"""
    db_goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")

    if db_goal.current_amount < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Недостаточно средств в цели. Доступно: {db_goal.current_amount}"
        )

    db_goal.current_amount -= amount

    # Mark as incomplete if it was completed before
    if db_goal.is_completed and db_goal.current_amount < db_goal.target_amount:
        db_goal.is_completed = False

    db.commit()
    db.refresh(db_goal)
    return db_goal


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    db_goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")

    db.delete(db_goal)
    db.commit()
    return {"message": "Цель удалена"}


@router.get("/monthly-status", response_model=MonthlySavingsStatus)
def get_monthly_status(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
):
    """Get savings status for the current or specified month"""
    today = date.today()
    year = year or today.year
    month = month or today.month

    # Get user settings
    settings = db.query(UserSettings).first()
    income = settings.monthly_income if settings else 0
    savings_goal = settings.monthly_savings_goal if settings else 0

    # Calculate expenses for the month
    expenses = db.query(func.sum(Transaction.amount)).filter(
        extract('year', Transaction.date) == year,
        extract('month', Transaction.date) == month,
    ).scalar() or 0

    # Calculate savings
    savings = income - expenses if income else 0

    return MonthlySavingsStatus(
        income=income or 0,
        expenses=expenses,
        savings=savings,
        savings_goal=savings_goal or 0,
        is_on_track=savings >= savings_goal if savings_goal else True,
    )
