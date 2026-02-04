from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Account, Transaction
from app.schemas import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
)

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.post("/", response_model=AccountResponse)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    db_account = Account(**account.model_dump())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.get("/", response_model=list[AccountResponse])
def get_accounts(
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(Account)
    if active_only:
        query = query.filter(Account.is_active == True)
    return query.order_by(Account.name).all()


@router.get("/total-balance")
def get_total_balance(db: Session = Depends(get_db)):
    """Get total balance across all active accounts"""
    total = db.query(func.sum(Account.balance)).filter(
        Account.is_active == True
    ).scalar() or 0

    # Group by currency
    by_currency = db.query(
        Account.currency,
        func.sum(Account.balance).label('total')
    ).filter(
        Account.is_active == True
    ).group_by(Account.currency).all()

    return {
        "total": total,
        "by_currency": {curr: amount for curr, amount in by_currency},
    }


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Счёт не найден")
    return account


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    account: AccountUpdate,
    db: Session = Depends(get_db),
):
    db_account = db.query(Account).filter(Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Счёт не найден")

    update_data = account.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_account, field, value)

    db.commit()
    db.refresh(db_account)
    return db_account


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    db_account = db.query(Account).filter(Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Счёт не найден")

    # Check if there are transactions linked to this account
    transaction_count = db.query(Transaction).filter(
        Transaction.account_id == account_id
    ).count()

    if transaction_count > 0:
        # Deactivate instead of delete
        db_account.is_active = False
        db.commit()
        return {"message": "Счёт деактивирован (есть связанные транзакции)"}
    else:
        db.delete(db_account)
        db.commit()
        return {"message": "Счёт удалён"}


@router.post("/{account_id}/adjust-balance", response_model=AccountResponse)
def adjust_balance(
    account_id: int,
    amount: float = Query(..., description="Сумма корректировки (+ добавить, - убавить)"),
    db: Session = Depends(get_db),
):
    """Manually adjust account balance (positive to add, negative to subtract)"""
    db_account = db.query(Account).filter(Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Счёт не найден")

    db_account.balance += amount
    db.commit()
    db.refresh(db_account)
    return db_account
