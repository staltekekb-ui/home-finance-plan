"""
E2E tests for the Dashboard page.

Covers:
- Dashboard page loads with four expense summary cards
- Quick Actions block renders with correct links
- Budgets widget appears after creating a budget + matching transaction
- Goals widget appears after creating a savings goal
- Dashboard API summary reflects today's expenses
"""

from datetime import date

import requests
from playwright.sync_api import Page

APP_URL = "http://localhost:8080"


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _create_account(name="Dashboard-счёт", balance=10_000):
    resp = requests.post(
        f"{APP_URL}/api/accounts/",
        json={
            "name": name,
            "account_type": "card",
            "balance": balance,
            "currency": "RUB",
            "color": "blue",
        },
    )
    resp.raise_for_status()
    return resp.json()


def _create_transaction(
    amount, description, category=None, transaction_type="expense", date_str=None
):
    resp = requests.post(
        f"{APP_URL}/api/transactions/",
        json={
            "amount": amount,
            "description": description,
            "category": category,
            "transaction_type": transaction_type,
            "date": date_str or date.today().isoformat(),
        },
    )
    resp.raise_for_status()
    return resp.json()


def _create_budget(category="Еда", monthly_limit=5_000):
    resp = requests.post(
        f"{APP_URL}/api/budgets/",
        json={
            "category": category,
            "monthly_limit": monthly_limit,
            "alert_threshold": 0.8,
        },
    )
    resp.raise_for_status()
    return resp.json()


def _create_goal(name="Тест-цель", target_amount=50_000, current_amount=10_000):
    resp = requests.post(
        f"{APP_URL}/api/savings/goals",
        json={
            "name": name,
            "target_amount": target_amount,
            "current_amount": current_amount,
        },
    )
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_dashboard_loads_summary_cards(page: Page, db_conn):
    """
    Navigate to the dashboard (/) and verify the four expense summary cards
    (Сегодня, За неделю, За месяц, Прошлый месяц) are rendered.
    """
    page.goto("/")
    page.wait_for_load_state("networkidle")

    assert page.locator('h1:has-text("Обзор")').is_visible(), "Dashboard heading 'Обзор' not visible"
    assert page.get_by_text("Сегодня").first.is_visible(), "Summary card 'Сегодня' not visible"
    assert page.get_by_text("За неделю").first.is_visible(), "Summary card 'За неделю' not visible"
    assert page.get_by_text("За месяц").first.is_visible(), "Summary card 'За месяц' not visible"
    assert page.get_by_text("Прошлый месяц").first.is_visible(), "Summary card 'Прошлый месяц' not visible"


def test_dashboard_quick_actions_visible(page: Page, db_conn):
    """
    Verify the Quick Actions card is rendered with the expected links.
    """
    page.goto("/")
    page.wait_for_load_state("networkidle")

    assert page.get_by_text("Быстрые действия").is_visible(), (
        "'Быстрые действия' block not visible"
    )
    assert page.get_by_role("link", name="Добавить транзакцию").is_visible(), (
        "Link 'Добавить транзакцию' not visible"
    )
    assert page.get_by_role("link", name="Все транзакции").is_visible(), (
        "Link 'Все транзакции' not visible"
    )
    assert page.locator('.card', has=page.locator('h2:has-text("Быстрые действия")')).get_by_role("link", name="Отчёты").is_visible(), (
        "Link 'Отчёты' not visible in Quick Actions"
    )


def test_dashboard_shows_budget_widget(page: Page, db_conn):
    """
    Create a budget and a matching expense transaction for the current month,
    then verify the Dashboard shows the Budgets widget with the correct category.
    """
    _create_account()
    _create_budget(category="Еда", monthly_limit=5_000)
    _create_transaction(1_000, "Покупки E2E", category="Еда")

    page.goto("/")
    page.wait_for_load_state("networkidle")

    assert page.get_by_role("heading", name="Бюджеты").is_visible(), "Budgets widget heading not visible"
    assert page.get_by_text("Еда").first.is_visible(), (
        "Budget category 'Еда' not visible in Budgets widget"
    )


def test_dashboard_shows_goals_widget(page: Page, db_conn):
    """
    Create a savings goal, then verify the Dashboard shows the Goals widget
    with the correct goal name.
    """
    _create_goal(name="Отпуск E2E Dashboard", target_amount=100_000, current_amount=20_000)

    page.goto("/")
    page.wait_for_load_state("networkidle")

    assert page.get_by_text("Цели накоплений").is_visible(), (
        "Goals widget heading not visible"
    )
    assert page.get_by_text("Отпуск E2E Dashboard").is_visible(), (
        "Goal name not visible in Goals widget"
    )


def test_dashboard_summary_api_reflects_todays_expense(page: Page, db_conn):
    """
    Create an expense for today, then verify the /api/dashboard/summary endpoint
    returns a 'today' value that includes the new expense.
    Also check the Dashboard page loads without errors.
    """
    _create_transaction(3_500, "Тест сегодня E2E", category="Еда")

    # Verify via API that the summary includes today's expense
    resp = requests.get(f"{APP_URL}/api/dashboard/summary")
    resp.raise_for_status()
    summary = resp.json()

    assert summary["today"] >= 3_500, (
        f"Expected today's expense >= 3500, got {summary['today']}"
    )

    # Also check the page renders the summary cards without errors
    page.goto("/")
    page.wait_for_load_state("networkidle")
    assert page.get_by_text("Сегодня").is_visible()
