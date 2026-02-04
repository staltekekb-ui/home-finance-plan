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
    account_id: Optional[int] = None
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


# Recurring Payments
class RecurringPaymentBase(BaseModel):
    amount: float
    description: str
    category: Optional[str] = None
    frequency: str  # daily, weekly, monthly, yearly
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    next_date: date


class RecurringPaymentCreate(RecurringPaymentBase):
    pass


class RecurringPaymentUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    frequency: Optional[str] = None
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    next_date: Optional[date] = None
    is_active: Optional[bool] = None


class RecurringPaymentResponse(RecurringPaymentBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Budgets
class BudgetBase(BaseModel):
    category: str
    monthly_limit: float
    alert_threshold: Optional[float] = 0.8


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    monthly_limit: Optional[float] = None
    alert_threshold: Optional[float] = None


class BudgetResponse(BudgetBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetStatus(BaseModel):
    id: int
    category: str
    monthly_limit: float
    spent: float
    remaining: float
    percentage: float
    is_over_threshold: bool
    alert_threshold: float


# User Settings
class UserSettingsBase(BaseModel):
    monthly_income: Optional[float] = None
    monthly_savings_goal: Optional[float] = None


class UserSettingsUpdate(UserSettingsBase):
    pass


class UserSettingsResponse(UserSettingsBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Savings Goals
class SavingsGoalBase(BaseModel):
    name: str
    target_amount: float
    target_date: Optional[date] = None


class SavingsGoalCreate(SavingsGoalBase):
    current_amount: Optional[float] = 0


class SavingsGoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[date] = None
    is_completed: Optional[bool] = None


class SavingsGoalResponse(SavingsGoalBase):
    id: int
    current_amount: float
    is_completed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MonthlySavingsStatus(BaseModel):
    income: float
    expenses: float
    savings: float
    savings_goal: float
    is_on_track: bool


# Accounts
class AccountBase(BaseModel):
    name: str
    account_type: str  # cash, card, savings
    currency: Optional[str] = "RUB"
    color: Optional[str] = None


class AccountCreate(AccountBase):
    balance: Optional[float] = 0


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    balance: Optional[float] = None
    currency: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class AccountResponse(AccountBase):
    id: int
    balance: float
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Dashboard
class DashboardSummary(BaseModel):
    today: float
    week: float
    month: float
    last_month: float
    month_change_percent: float
    top_categories: list[dict]


class DashboardWidgets(BaseModel):
    budgets: list[BudgetStatus]
    goals: list[SavingsGoalResponse]
    savings_status: Optional[MonthlySavingsStatus] = None
