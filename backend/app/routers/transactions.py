from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date
from typing import Optional
from app.database import get_db
from app.models import Transaction, Account
from app.schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    MonthlyReport,
    CategoryEnum,
)
from app.logging_config import get_logger

router = APIRouter(prefix="/api/transactions", tags=["transactions"])
logger = get_logger(__name__)


@router.post("/", response_model=TransactionResponse)
def create_transaction(
    transaction: TransactionCreate,
    account_id: Optional[int] = Query(None, description="ID счёта"),
    db: Session = Depends(get_db),
):
    logger.info(f"Creating transaction", extra={
        "amount": transaction.amount,
        "description": transaction.description,
        "date": str(transaction.date),
        "account_id": account_id,
    })
    data = transaction.model_dump()
    if account_id:
        data['account_id'] = account_id
        # Update account balance
        account = db.query(Account).filter(Account.id == account_id).first()
        if account:
            account.balance -= transaction.amount

    db_transaction = Transaction(**data)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    logger.info(f"Transaction created successfully", extra={"transaction_id": db_transaction.id})
    return db_transaction


@router.get("/", response_model=list[TransactionResponse])
def get_transactions(
    date_from: Optional[date] = Query(None, description="Начальная дата фильтра"),
    date_to: Optional[date] = Query(None, description="Конечная дата фильтра"),
    category: Optional[str] = Query(None, description="Фильтр по категории"),
    search: Optional[str] = Query(None, description="Поиск по описанию"),
    account_id: Optional[int] = Query(None, description="Фильтр по счёту"),
    sort_by: Optional[str] = Query("date", description="Поле для сортировки: date, amount, description"),
    sort_order: Optional[str] = Query("desc", description="Порядок сортировки: asc, desc"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)

    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)
    if category:
        query = query.filter(Transaction.category == category)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    if account_id:
        query = query.filter(Transaction.account_id == account_id)

    # Sorting
    sort_column = getattr(Transaction, sort_by, Transaction.date)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return query.offset(skip).limit(limit).all()


@router.get("/categories")
def get_categories():
    return [{"value": e.name, "label": e.value} for e in CategoryEnum]


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int, transaction: TransactionUpdate, db: Session = Depends(get_db)
):
    logger.info(f"Updating transaction {transaction_id}", extra={
        "update_data": transaction.model_dump(exclude_unset=True)
    })
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not db_transaction:
        logger.warning(f"Transaction not found: {transaction_id}")
        raise HTTPException(status_code=404, detail="Транзакция не найдена")

    update_data = transaction.model_dump(exclude_unset=True)
    logger.info(f"Update data parsed", extra={"fields": list(update_data.keys()), "date": str(update_data.get('date'))})
    for field, value in update_data.items():
        setattr(db_transaction, field, value)

    db.commit()
    db.refresh(db_transaction)
    logger.info(f"Transaction updated successfully", extra={"transaction_id": transaction_id})
    return db_transaction


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")

    db.delete(db_transaction)
    db.commit()
    return {"message": "Транзакция удалена"}
