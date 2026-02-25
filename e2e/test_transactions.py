"""
E2E tests for transaction CRUD operations.

Covers:
- Creating a transaction via the Manual Entry UI
- Editing a transaction via the Edit modal
- Deleting a transaction via the UI
- Filtering transactions by category
"""

import requests
from playwright.sync_api import Page

APP_URL = "http://localhost:8080"


# ---------------------------------------------------------------------------
# API helpers (used to set up test pre-requisites quickly)
# ---------------------------------------------------------------------------


def _create_account(name="Тест-счёт", balance=10_000):
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


def test_create_transaction_via_ui(page: Page, db_conn):
    """
    Navigate to the Upload page → Manual Entry tab, fill the form and save.
    Verify the row exists in the transactions table.
    """
    # Pre-requisite: at least one account must exist for manual entry to work
    _create_account()

    page.goto("/upload")
    page.wait_for_load_state("networkidle")

    # Switch to the manual entry tab
    page.get_by_role("button", name="Вручную").click()
    page.wait_for_load_state("networkidle")

    # Select account (AccountSelectionModal auto-selects the first account)
    page.get_by_role("button", name="Выбрать счёт").click()
    page.get_by_role("button", name="Продолжить").click()
    page.wait_for_load_state("networkidle")

    # Fill the Manual Entry form
    form = page.locator('form:has(h2:has-text("Добавить вручную"))')
    form.locator('input[placeholder="0.00"]').fill("1500")
    form.locator('input[placeholder="Например: Магнит, продукты"]').fill(
        "E2E-тест магазин"
    )
    # Type: expense (index 0)
    form.locator("select").nth(0).select_option("expense")
    # Category: Еда (index 1)
    form.locator("select").nth(1).select_option("Еда")
    form.locator('input[type="date"]').fill("2024-01-20")

    form.locator('button[type="submit"]').click()
    # Wait for success message (handleManualSave uses .then() not a mutation)
    page.wait_for_selector('text=Транзакция успешно добавлена')
    page.wait_for_load_state("networkidle")

    # Verify the transaction was written to the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT amount, description, category, transaction_type "
            "FROM transactions WHERE description = %s",
            ("E2E-тест магазин",),
        )
        row = cur.fetchone()

    assert row is not None, "Transaction was not found in the database"
    assert row[0] == 1500.0
    assert row[1] == "E2E-тест магазин"
    assert row[2] == "Еда"
    assert row[3] == "expense"


def test_edit_transaction_via_ui(page: Page, db_conn):
    """
    Create a transaction via the API, then edit its description via the UI.
    Verify the updated description is persisted in the database.
    """
    account = _create_account()
    txn = _create_transaction(500, "Оригинальное описание", account_id=account["id"])

    page.goto("/transactions")
    page.wait_for_load_state("networkidle")

    # Click the "Изменить" button on the first transaction card
    page.get_by_role("button", name="Изменить").first.click()

    # Wait for the edit modal to appear
    page.wait_for_selector('h3:has-text("Редактировать транзакцию")')

    # The modal container has shadow-xl class (no .modal-content); scope inputs to it
    modal = page.locator('div.shadow-xl')
    description_field = modal.locator('input[type="text"]')
    description_field.fill("Изменённое описание E2E")
    # Allow React to batch-process the onChange and re-render before submitting
    page.wait_for_timeout(300)

    # Use expect_response to wait for the PUT API call to complete
    with page.expect_response(
        lambda r: f"/api/transactions/{txn['id']}" in r.url
        and r.request.method == "PUT",
        timeout=10_000,
    ) as resp_info:
        modal.locator('button[type="submit"]').click()
    page.wait_for_load_state("networkidle")

    # Verify the description was updated in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT description FROM transactions WHERE id = %s", (txn["id"],)
        )
        row = cur.fetchone()

    assert row is not None
    assert row[0] == "Изменённое описание E2E"


def test_delete_transaction_via_ui(page: Page, db_conn):
    """
    Create a transaction via the API, then delete it through the UI.
    Verify the transaction no longer exists in the database.
    """
    account = _create_account()
    txn = _create_transaction(300, "Транзакция для удаления", account_id=account["id"])

    page.goto("/transactions")
    page.wait_for_load_state("networkidle")

    # Click the "Удалить" button on the transaction card
    page.get_by_role("button", name="Удалить").first.click()

    # Confirm deletion in the modal
    page.wait_for_selector('h3:has-text("Удалить транзакцию?")')
    page.locator('.modal-content').get_by_role("button", name="Удалить").click()
    # Wait for modal to close (onSuccess → setDeleteTarget(null) → modal removed)
    page.wait_for_selector('h3:has-text("Удалить транзакцию?")', state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the row was removed from the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM transactions WHERE id = %s", (txn["id"],)
        )
        count = cur.fetchone()[0]

    assert count == 0, f"Expected transaction {txn['id']} to be deleted, but it still exists"


def test_filter_transactions_by_category(page: Page, db_conn):
    """
    Create two transactions with different categories via the API.
    Apply a category filter in the UI and verify only the matching transaction
    remains visible.
    """
    account = _create_account()
    _create_transaction(
        100, "Продукты в Ашане", category="Еда", account_id=account["id"]
    )
    _create_transaction(
        200, "Поездка на такси", category="Транспорт", account_id=account["id"]
    )

    page.goto("/transactions")
    page.wait_for_load_state("networkidle")

    # The filter section has a category select with default option "Все категории"
    filters_card = page.locator('.card:has(h2:has-text("Фильтры и поиск"))')
    filters_card.locator("select").nth(0).select_option("Еда")
    # Wait for the transport transaction to disappear — confirms the filter applied
    page.locator('text=Поездка на такси').wait_for(state="hidden", timeout=10_000)

    # "Еда" transaction should be visible
    assert page.get_by_text("Продукты в Ашане").is_visible(), (
        "Transaction 'Продукты в Ашане' should be visible after filtering by 'Еда'"
    )
    # "Транспорт" transaction should be hidden
    assert not page.get_by_text("Поездка на такси").is_visible(), (
        "Transaction 'Поездка на такси' should not be visible after filtering by 'Еда'"
    )
