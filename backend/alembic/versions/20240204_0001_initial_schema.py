"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-02-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create transactions table
    op.create_table('transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transactions_id'), 'transactions', ['id'], unique=False)
    op.create_index(op.f('ix_transactions_date'), 'transactions', ['date'], unique=False)
    op.create_index(op.f('ix_transactions_category'), 'transactions', ['category'], unique=False)

    # Create recurring_payments table
    op.create_table('recurring_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('frequency', sa.String(), nullable=False),
        sa.Column('day_of_month', sa.Integer(), nullable=True),
        sa.Column('day_of_week', sa.Integer(), nullable=True),
        sa.Column('next_date', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recurring_payments_id'), 'recurring_payments', ['id'], unique=False)

    # Create budgets table
    op.create_table('budgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('monthly_limit', sa.Float(), nullable=False),
        sa.Column('alert_threshold', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category')
    )
    op.create_index(op.f('ix_budgets_id'), 'budgets', ['id'], unique=False)

    # Create user_settings table
    op.create_table('user_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('monthly_income', sa.Float(), nullable=True),
        sa.Column('monthly_savings_goal', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_settings_id'), 'user_settings', ['id'], unique=False)

    # Create savings_goals table
    op.create_table('savings_goals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('target_amount', sa.Float(), nullable=False),
        sa.Column('current_amount', sa.Float(), nullable=True),
        sa.Column('target_date', sa.Date(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_savings_goals_id'), 'savings_goals', ['id'], unique=False)

    # Create accounts table
    op.create_table('accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('account_type', sa.String(), nullable=False),
        sa.Column('balance', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_accounts_id'), 'accounts', ['id'], unique=False)

    # Add foreign key for transactions.account_id
    op.create_foreign_key('fk_transactions_account_id', 'transactions', 'accounts', ['account_id'], ['id'])


def downgrade() -> None:
    # Drop foreign key
    op.drop_constraint('fk_transactions_account_id', 'transactions', type_='foreignkey')

    # Drop tables
    op.drop_index(op.f('ix_accounts_id'), table_name='accounts')
    op.drop_table('accounts')

    op.drop_index(op.f('ix_savings_goals_id'), table_name='savings_goals')
    op.drop_table('savings_goals')

    op.drop_index(op.f('ix_user_settings_id'), table_name='user_settings')
    op.drop_table('user_settings')

    op.drop_index(op.f('ix_budgets_id'), table_name='budgets')
    op.drop_table('budgets')

    op.drop_index(op.f('ix_recurring_payments_id'), table_name='recurring_payments')
    op.drop_table('recurring_payments')

    op.drop_index(op.f('ix_transactions_category'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_date'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_id'), table_name='transactions')
    op.drop_table('transactions')
