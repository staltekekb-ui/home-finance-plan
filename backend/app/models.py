from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String(500), nullable=False)
    category = Column(String(100), nullable=True)
    transaction_type = Column(String(20), nullable=False, server_default="expense")  # "income" or "expense"
    date = Column(Date, nullable=False)
    image_path = Column(String(500), nullable=True)
    raw_text = Column(Text, nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    account = relationship("Account", back_populates="transactions")


class RecurringPayment(Base):
    __tablename__ = "recurring_payments"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String(500), nullable=False)
    category = Column(String(100), nullable=True)
    frequency = Column(String(50), nullable=False)  # daily, weekly, monthly, yearly
    day_of_month = Column(Integer, nullable=True)  # 1-31 for monthly
    day_of_week = Column(Integer, nullable=True)  # 0-6 for weekly (0=Monday)
    next_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False, unique=True)
    monthly_limit = Column(Float, nullable=False)
    alert_threshold = Column(Float, default=0.8)  # Alert at 80% by default
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    monthly_income = Column(Float, nullable=True)
    monthly_savings_goal = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    target_date = Column(Date, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    account_type = Column(String(50), nullable=False)  # cash, card, savings
    balance = Column(Float, default=0)
    currency = Column(String(10), default="RUB")
    color = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    transactions = relationship("Transaction", back_populates="account")
