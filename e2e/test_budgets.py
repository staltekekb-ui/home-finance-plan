"""
E2E tests for budget management.

Covers:
- Creating a budget via the Budgets page UI
- Verifying that adding a transaction in a budgeted category updates the
  budget's "spent" display on the Budgets page
"""

import requests
from playwright.sync_api import Page

APP_URL = "http://localhost:8080"


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _create_account(name="Бюджет-счёт", balance=20_000):
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


def _create_budget(category="Еда", monthly_limit=5_000, alert_threshold=0.8):
    resp = requests.post(
        f"{APP_URL}/api/budgets/",
        json={
            "category": category,
            "monthly_limit": monthly_limit,
            "alert_threshold": alert_threshold,
        },
    )
    resp.raise_for_status()
    return resp.json()


def _create_transaction(
    amount,
    description,
    category=None,
    transaction_type="expense",
    date="2024-01-15",
    account_id=None,
):
    resp = requests.post(
        f"{APP_URL}/api/transactions/",
        params={"account_id": account_id} if account_id else {},
        json={
            "amount": amount,
            "description": description,
            "category": category,
            "transaction_type": transaction_type,
            "date": date,
        },
    )
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_create_budget_via_ui(page: Page, db_conn):
    """
    Navigate to the Budgets page, click "Добавить", select a category,
    enter a monthly limit, and save.
    Verify the budget row is persisted in the budgets table.
    """
    page.goto("/budgets")
    page.wait_for_load_state("networkidle")

    page.get_by_role("button", name="Добавить").click()

    # Fill the budget form – heading is "Новый бюджет"
    form = page.locator('form:has(h2:has-text("Новый бюджет"))')
    form.locator("select").nth(0).select_option("Транспорт")        # Категория
    form.locator('input[type="number"]').nth(0).fill("3000")        # Месячный лимит
    form.locator('input[type="number"]').nth(1).fill("80")          # Порог предупреждения

    form.get_by_role("button", name="Сохранить").click()
    # Wait for the form to close (onSuccess sets showForm=false)
    page.locator('form:has(h2:has-text("Новый бюджет"))').wait_for(state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the budget was saved to the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT category, monthly_limit, alert_threshold "
            "FROM budgets WHERE category = %s",
            ("Транспорт",),
        )
        row = cur.fetchone()

    assert row is not None, "Budget was not found in the database"
    assert row[0] == "Транспорт"
    assert row[1] == 3000.0
    assert abs(row[2] - 0.80) < 0.001


def test_budget_reflects_transaction_spending(page: Page, db_conn):
    """
    Create a budget for "Еда" and an expense transaction in the same category
    via the API, then navigate to the Budgets page and verify the UI shows
    the correct "Потрачено" amount for that budget.
    """
    _create_account()
    _create_budget(category="Еда", monthly_limit=5_000)

    # Use the current month so the budget status query picks it up
    from datetime import date
    today_str = date.today().isoformat()
    _create_transaction(1_500, "Покупки в супермаркете", category="Еда", date=today_str)

    page.goto("/budgets")
    page.wait_for_load_state("networkidle")

    # Find the budget card for "Еда" and verify the spent amount
    budget_card = page.locator('.card', has=page.locator('span:has-text("Еда")'))
    spent_text = budget_card.locator('span:has-text("Потрачено:")').text_content()

    assert "1" in spent_text and "500" in spent_text, (
        f"Expected 1500 in spent text, got: '{spent_text}'"
    )


def test_edit_budget_via_ui(page: Page, db_conn):
    """
    Create a budget via the API, then click "Изменить" on the budget card,
    update the monthly limit, and save.
    Verify the updated limit is persisted in the budgets table.
    """
    budget = _create_budget(category="Транспорт", monthly_limit=3_000)

    page.goto("/budgets")
    page.wait_for_load_state("networkidle")

    # Find the budget card and click "Изменить"
    budget_card = page.locator(".card", has=page.locator('span:has-text("Транспорт")'))
    budget_card.get_by_role("button", name="Изменить").click()

    # The edit form renders in-page with heading "Редактировать бюджет"
    form = page.locator('form:has(h2:has-text("Редактировать бюджет"))')
    limit_input = form.locator('input[placeholder="10000"]')
    limit_input.fill("5000")

    form.get_by_role("button", name="Сохранить").click()
    # Wait for the form to close (onSuccess sets editingBudget=null)
    page.locator('form:has(h2:has-text("Редактировать бюджет"))').wait_for(state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the monthly_limit was updated in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT monthly_limit FROM budgets WHERE id = %s", (budget["id"],)
        )
        row = cur.fetchone()

    assert row is not None
    assert row[0] == 5_000.0, f"Expected monthly_limit 5000, got {row[0]}"


def test_delete_budget_via_ui(page: Page, db_conn):
    """
    Create a budget via the API, then delete it through the UI.
    Verify the budget row no longer exists in the budgets table.
    """
    budget = _create_budget(category="Еда", monthly_limit=5_000)

    page.goto("/budgets")
    page.wait_for_load_state("networkidle")

    # Find the budget card and click "Удалить"
    budget_card = page.locator(".card", has=page.locator('span:has-text("Еда")'))
    budget_card.get_by_role("button", name="Удалить").click()

    # Confirm deletion in the modal
    page.wait_for_selector('h3:has-text("Удалить бюджет?")')
    page.locator(".modal-content").get_by_role("button", name="Удалить").click()
    # Wait for modal to close (onSuccess → setDeleteTarget(null) → modal removed)
    page.wait_for_selector('h3:has-text("Удалить бюджет?")', state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the row was removed from the database
    with db_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM budgets WHERE id = %s", (budget["id"],))
        count = cur.fetchone()[0]

    assert count == 0, f"Expected budget {budget['id']} to be deleted"
