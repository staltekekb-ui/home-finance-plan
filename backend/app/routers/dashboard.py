from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta
from app.database import get_db
from app.models import Transaction, Budget, SavingsGoal, UserSettings
from app.schemas import DashboardSummary, DashboardWidgets, BudgetStatus, MonthlySavingsStatus

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_start = today.replace(day=1)

    # Previous month
    if month_start.month == 1:
        last_month_start = month_start.replace(year=month_start.year - 1, month=12)
    else:
        last_month_start = month_start.replace(month=month_start.month - 1)
    last_month_end = month_start - timedelta(days=1)

    # Today's spending
    today_total = db.query(func.sum(Transaction.amount)).filter(
        Transaction.date == today
    ).scalar() or 0

    # Week's spending
    week_total = db.query(func.sum(Transaction.amount)).filter(
        Transaction.date >= week_ago,
        Transaction.date <= today,
    ).scalar() or 0

    # Month's spending
    month_total = db.query(func.sum(Transaction.amount)).filter(
        Transaction.date >= month_start,
        Transaction.date <= today,
    ).scalar() or 0

    # Last month's spending
    last_month_total = db.query(func.sum(Transaction.amount)).filter(
        Transaction.date >= last_month_start,
        Transaction.date <= last_month_end,
    ).scalar() or 0

    # Month change percentage
    if last_month_total > 0:
        # Adjust for partial month
        days_in_month = (today - month_start).days + 1
        days_in_last_month = (last_month_end - last_month_start).days + 1
        adjusted_last_month = last_month_total * (days_in_month / days_in_last_month)
        change_percent = ((month_total - adjusted_last_month) / adjusted_last_month * 100) if adjusted_last_month > 0 else 0
    else:
        change_percent = 0

    # Top categories for this month
    top_categories_query = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.date >= month_start,
        Transaction.date <= today,
        Transaction.category.isnot(None),
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).limit(5).all()

    top_categories = [
        {"category": cat or "Без категории", "amount": total}
        for cat, total in top_categories_query
    ]

    return DashboardSummary(
        today=today_total,
        week=week_total,
        month=month_total,
        last_month=last_month_total,
        month_change_percent=round(change_percent, 1),
        top_categories=top_categories,
    )


@router.get("/widgets", response_model=DashboardWidgets)
def get_dashboard_widgets(db: Session = Depends(get_db)):
    today = date.today()
    year = today.year
    month = today.month

    # Budget statuses
    budgets = db.query(Budget).all()
    budget_statuses = []

    for budget in budgets:
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.category == budget.category,
            extract('year', Transaction.date) == year,
            extract('month', Transaction.date) == month,
        ).scalar() or 0

        remaining = budget.monthly_limit - spent
        percentage = (spent / budget.monthly_limit * 100) if budget.monthly_limit > 0 else 0

        budget_statuses.append(BudgetStatus(
            id=budget.id,
            category=budget.category,
            monthly_limit=budget.monthly_limit,
            spent=spent,
            remaining=remaining,
            percentage=round(percentage, 1),
            is_over_threshold=percentage >= budget.alert_threshold * 100,
            alert_threshold=budget.alert_threshold,
        ))

    # Active savings goals
    goals = db.query(SavingsGoal).filter(
        SavingsGoal.is_completed == False
    ).order_by(SavingsGoal.target_date.nulls_first()).limit(5).all()

    # Monthly savings status
    settings = db.query(UserSettings).first()
    savings_status = None

    if settings and settings.monthly_income:
        expenses = db.query(func.sum(Transaction.amount)).filter(
            extract('year', Transaction.date) == year,
            extract('month', Transaction.date) == month,
        ).scalar() or 0

        savings = settings.monthly_income - expenses
        savings_goal = settings.monthly_savings_goal or 0

        savings_status = MonthlySavingsStatus(
            income=settings.monthly_income,
            expenses=expenses,
            savings=savings,
            savings_goal=savings_goal,
            is_on_track=savings >= savings_goal if savings_goal else True,
        )

    return DashboardWidgets(
        budgets=budget_statuses,
        goals=goals,
        savings_status=savings_status,
    )
