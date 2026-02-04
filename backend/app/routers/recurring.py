from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from app.database import get_db
from app.models import RecurringPayment, Transaction
from app.schemas import (
    RecurringPaymentCreate,
    RecurringPaymentUpdate,
    RecurringPaymentResponse,
    TransactionResponse,
)

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


def calculate_next_date(current_date: date, frequency: str, day_of_month: int = None, day_of_week: int = None) -> date:
    """Calculate the next occurrence date based on frequency"""
    if frequency == "daily":
        return current_date + timedelta(days=1)
    elif frequency == "weekly":
        return current_date + timedelta(weeks=1)
    elif frequency == "monthly":
        next_date = current_date + relativedelta(months=1)
        if day_of_month:
            try:
                next_date = next_date.replace(day=min(day_of_month, 28))
            except ValueError:
                pass
        return next_date
    elif frequency == "yearly":
        return current_date + relativedelta(years=1)
    return current_date + timedelta(days=30)


@router.post("/", response_model=RecurringPaymentResponse)
def create_recurring_payment(payment: RecurringPaymentCreate, db: Session = Depends(get_db)):
    db_payment = RecurringPayment(**payment.model_dump())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.get("/", response_model=list[RecurringPaymentResponse])
def get_recurring_payments(
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(RecurringPayment)
    if active_only:
        query = query.filter(RecurringPayment.is_active == True)
    return query.order_by(RecurringPayment.next_date).all()


@router.get("/{payment_id}", response_model=RecurringPaymentResponse)
def get_recurring_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(RecurringPayment).filter(RecurringPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Повторяющийся платёж не найден")
    return payment


@router.put("/{payment_id}", response_model=RecurringPaymentResponse)
def update_recurring_payment(
    payment_id: int,
    payment: RecurringPaymentUpdate,
    db: Session = Depends(get_db),
):
    db_payment = db.query(RecurringPayment).filter(RecurringPayment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Повторяющийся платёж не найден")

    update_data = payment.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_payment, field, value)

    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.delete("/{payment_id}")
def delete_recurring_payment(payment_id: int, db: Session = Depends(get_db)):
    db_payment = db.query(RecurringPayment).filter(RecurringPayment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Повторяющийся платёж не найден")

    db.delete(db_payment)
    db.commit()
    return {"message": "Повторяющийся платёж удалён"}


@router.post("/{payment_id}/execute")
def execute_recurring_payment(payment_id: int, db: Session = Depends(get_db)):
    """Execute a recurring payment - create a transaction and update next_date"""
    db_payment = db.query(RecurringPayment).filter(RecurringPayment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Повторяющийся платёж не найден")

    if not db_payment.is_active:
        raise HTTPException(status_code=400, detail="Платёж не активен")

    # Create transaction
    transaction = Transaction(
        amount=db_payment.amount,
        description=db_payment.description,
        category=db_payment.category,
        date=date.today(),
    )
    db.add(transaction)

    # Update next date
    db_payment.next_date = calculate_next_date(
        db_payment.next_date,
        db_payment.frequency,
        db_payment.day_of_month,
        db_payment.day_of_week,
    )

    db.commit()
    db.refresh(transaction)
    db.refresh(db_payment)

    return {
        "transaction": transaction,
        "recurring_payment": db_payment,
    }


@router.post("/from-transaction/{transaction_id}", response_model=RecurringPaymentResponse)
def create_from_transaction(
    transaction_id: int,
    frequency: str = "monthly",
    db: Session = Depends(get_db),
):
    """Create a recurring payment from an existing transaction"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")

    # Calculate next date based on frequency
    next_date = calculate_next_date(date.today(), frequency)

    db_payment = RecurringPayment(
        amount=transaction.amount,
        description=transaction.description,
        category=transaction.category,
        frequency=frequency,
        day_of_month=transaction.date.day if frequency == "monthly" else None,
        next_date=next_date,
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment
