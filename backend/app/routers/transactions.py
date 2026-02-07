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
    BulkDeleteRequest,
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
            # Income increases balance, expense decreases it
            if transaction.transaction_type == 'income':
                account.balance += transaction.amount
            else:
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


@router.post("/check-duplicates")
def check_duplicates(
    transactions: list[TransactionCreate],
    db: Session = Depends(get_db),
):
    """Проверяет список транзакций на наличие дубликатов в базе данных.

    Возвращает список с индексами дубликатов и информацией о похожих транзакциях.
    Дубликаты определяются по: дате, сумме и описанию (с допуском ±1 день и ±0.01 ₽)
    """
    logger.info(f"Checking {len(transactions)} transactions for duplicates")

    duplicates = []

    for idx, transaction in enumerate(transactions):
        # Проверяем транзакции с такой же датой (±1 день), суммой (±0.01) и похожим описанием
        similar_transactions = db.query(Transaction).filter(
            Transaction.date >= transaction.date.replace(day=max(1, transaction.date.day - 1)),
            Transaction.date <= transaction.date.replace(day=min(31, transaction.date.day + 1)),
            Transaction.amount >= transaction.amount - 0.01,
            Transaction.amount <= transaction.amount + 0.01,
            Transaction.description.ilike(f"%{transaction.description}%"),
            Transaction.transaction_type == transaction.transaction_type,
        ).all()

        if similar_transactions:
            duplicates.append({
                "index": idx,
                "transaction": transaction.model_dump(),
                "similar_count": len(similar_transactions),
                "similar_transactions": [
                    {
                        "id": t.id,
                        "date": str(t.date),
                        "amount": t.amount,
                        "description": t.description,
                        "category": t.category,
                    }
                    for t in similar_transactions[:3]  # Показываем максимум 3 похожих
                ]
            })

    logger.info(f"Found {len(duplicates)} potential duplicates")
    return {
        "total_checked": len(transactions),
        "duplicates_found": len(duplicates),
        "duplicates": duplicates,
    }


@router.post("/bulk-delete")
def bulk_delete_transactions(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
):
    """Массовое удаление транзакций по критериям или списку ID.

    Может удалять транзакции:
    - По списку ID (transaction_ids)
    - По фильтрам (date_from, date_to, category, account_id, transaction_type)

    Возвращает количество удаленных транзакций и обновленные балансы счетов.
    """
    logger.info(f"Bulk delete request", extra={
        "transaction_ids": request.transaction_ids,
        "date_from": str(request.date_from) if request.date_from else None,
        "date_to": str(request.date_to) if request.date_to else None,
        "category": request.category,
        "account_id": request.account_id,
        "transaction_type": request.transaction_type,
    })

    query = db.query(Transaction)

    # Если указаны конкретные ID, используем их
    if request.transaction_ids:
        query = query.filter(Transaction.id.in_(request.transaction_ids))
    else:
        # Иначе используем фильтры
        if request.date_from:
            query = query.filter(Transaction.date >= request.date_from)
        if request.date_to:
            query = query.filter(Transaction.date <= request.date_to)
        if request.category:
            query = query.filter(Transaction.category == request.category)
        if request.account_id:
            query = query.filter(Transaction.account_id == request.account_id)
        if request.transaction_type:
            query = query.filter(Transaction.transaction_type == request.transaction_type)

    # Получаем транзакции для пересчета балансов
    transactions_to_delete = query.all()

    if not transactions_to_delete:
        logger.info("No transactions found to delete")
        return {
            "deleted_count": 0,
            "affected_accounts": []
        }

    # Группируем транзакции по счетам для пересчета балансов
    accounts_affected = {}
    for transaction in transactions_to_delete:
        if transaction.account_id:
            if transaction.account_id not in accounts_affected:
                accounts_affected[transaction.account_id] = {"income": 0, "expense": 0}

            if transaction.transaction_type == "income":
                accounts_affected[transaction.account_id]["income"] += transaction.amount
            else:
                accounts_affected[transaction.account_id]["expense"] += transaction.amount

    # Удаляем транзакции
    deleted_count = query.delete(synchronize_session=False)

    # Пересчитываем балансы счетов
    for account_id, amounts in accounts_affected.items():
        account = db.query(Account).filter(Account.id == account_id).first()
        if account:
            # Откатываем изменения: убираем доходы, возвращаем расходы
            account.balance -= amounts["income"]
            account.balance += amounts["expense"]

    db.commit()

    logger.info(f"Bulk deleted {deleted_count} transactions", extra={
        "affected_accounts": list(accounts_affected.keys())
    })

    return {
        "deleted_count": deleted_count,
        "affected_accounts": list(accounts_affected.keys())
    }
