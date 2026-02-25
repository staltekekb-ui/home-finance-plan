"""
E2E tests for account management.

Covers:
- Creating an account via the Accounts page UI
- Verifying that creating an expense transaction correctly decreases account balance
"""

import requests
from playwright.sync_api import Page

APP_URL = "http://localhost:8080"


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _create_account(name="API-счёт", balance=10_000):
    resp = requests.post(
        f"{APP_URL}/api/accounts/",
        json={
            "name": name,
            "account_type": "card",
            "balance": balance,
            "currency": "RUB",
            "color": "green",
        },
    )
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_create_account_via_ui(page: Page, db_conn):
    """
    Navigate to the Accounts page, open the form, fill it in, and save.
    Verify the account row is present in the accounts table.
    """
    page.goto("/accounts")
    page.wait_for_load_state("networkidle")

    # Open the account creation form
    page.get_by_role("button", name="Добавить").click()

    # Fill the form – the AccountForm heading is "Новый счёт"
    form = page.locator('form:has(h2:has-text("Новый счёт"))')
    form.locator('input[placeholder="Например: Сбербанк"]').fill("E2E Тестовый счёт")
    form.locator("select").nth(0).select_option("card")   # Тип счёта → Карта
    form.locator('input[type="number"]').first.fill("5000")  # Баланс
    form.locator("select").nth(1).select_option("RUB")    # Валюта

    form.get_by_role("button", name="Сохранить").click()
    # Wait for the form to close (onSuccess sets showForm=false)
    page.locator('form:has(h2:has-text("Новый счёт"))').wait_for(state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the account exists in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT name, account_type, balance, currency "
            "FROM accounts WHERE name = %s",
            ("E2E Тестовый счёт",),
        )
        row = cur.fetchone()

    assert row is not None, "Account was not found in the database"
    assert row[0] == "E2E Тестовый счёт"
    assert row[1] == "card"
    assert row[2] == 5000.0
    assert row[3] == "RUB"


def test_transaction_updates_account_balance(page: Page, db_conn):
    """
    Create an account via the API with a known balance (10 000 ₽).
    Then add a 500 ₽ expense transaction linked to that account via the UI.
    Verify the account balance in the database has decreased by 500 ₽.
    """
    account = _create_account(name="Баланс-тест счёт", balance=10_000)
    initial_balance = account["balance"]

    page.goto("/upload")
    page.wait_for_load_state("networkidle")

    # Switch to manual entry tab
    page.get_by_role("button", name="Вручную").click()
    page.wait_for_load_state("networkidle")

    # Select the account in the AccountSelectionModal
    page.get_by_role("button", name="Выбрать счёт").click()
    # The modal auto-selects the first (and only) account; just confirm
    page.get_by_role("button", name="Продолжить").click()
    page.wait_for_load_state("networkidle")

    # Fill the transaction form
    form = page.locator('form:has(h2:has-text("Добавить вручную"))')
    form.locator('input[placeholder="0.00"]').fill("500")
    form.locator('input[placeholder="Например: Магнит, продукты"]').fill(
        "Тест обновления баланса"
    )
    # Type: expense (default)
    form.locator("select").nth(0).select_option("expense")
    form.locator('input[type="date"]').fill("2024-01-20")

    form.locator('button[type="submit"]').click()
    # Wait for success message (manual save fires async promise, not a mutation)
    page.wait_for_selector('text=Транзакция успешно добавлена')
    page.wait_for_load_state("networkidle")

    # Verify the account balance was updated in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT balance FROM accounts WHERE id = %s", (account["id"],)
        )
        row = cur.fetchone()

    assert row is not None
    expected_balance = initial_balance - 500
    assert row[0] == expected_balance, (
        f"Expected balance {expected_balance}, got {row[0]}"
    )


def test_edit_account_via_ui(page: Page, db_conn):
    """
    Create an account via the API, then click "Изменить" on the account card,
    change the name in the form, and save.
    Verify the updated name is persisted in the accounts table.
    """
    account = _create_account(name="Счёт для редактирования E2E", balance=5_000)

    page.goto("/accounts")
    page.wait_for_load_state("networkidle")

    # Find the account card and click "Изменить"
    account_card = page.locator(
        ".card", has=page.locator('h3:has-text("Счёт для редактирования E2E")')
    )
    account_card.get_by_role("button", name="Изменить").click()

    # The edit form renders in-page with heading "Редактировать счёт"
    form = page.locator('form:has(h2:has-text("Редактировать счёт"))')
    name_input = form.locator('input[placeholder="Например: Сбербанк"]')
    name_input.fill("Счёт отредактирован E2E")

    form.get_by_role("button", name="Сохранить").click()
    # Wait for the form to close (onSuccess sets editingAccount=null)
    page.locator('form:has(h2:has-text("Редактировать счёт"))').wait_for(state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the name was updated in the database
    with db_conn.cursor() as cur:
        cur.execute("SELECT name FROM accounts WHERE id = %s", (account["id"],))
        row = cur.fetchone()

    assert row is not None
    assert row[0] == "Счёт отредактирован E2E", (
        f"Expected 'Счёт отредактирован E2E', got '{row[0]}'"
    )


def test_delete_account_via_ui(page: Page, db_conn):
    """
    Create an account via the API (no linked transactions), then delete it
    through the UI.  Verify the account is removed or deactivated in the DB.
    """
    account = _create_account(name="Счёт для удаления E2E", balance=1_000)

    page.goto("/accounts")
    page.wait_for_load_state("networkidle")

    # Find the account card and click "Удалить"
    account_card = page.locator(
        ".card", has=page.locator('h3:has-text("Счёт для удаления E2E")')
    )
    account_card.get_by_role("button", name="Удалить").click()

    # Confirm deletion in the modal
    page.wait_for_selector('h3:has-text("Удалить счёт?")')
    page.locator(".modal-content").get_by_role("button", name="Удалить").click()
    # Wait for modal to close (onSuccess sets deleteTarget=null → isOpen=false → modal removed)
    page.wait_for_selector('h3:has-text("Удалить счёт?")', state="detached")
    page.wait_for_load_state("networkidle")

    # Without linked transactions the row is hard-deleted;
    # with linked transactions it is deactivated (is_active = FALSE).
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT is_active FROM accounts WHERE id = %s", (account["id"],)
        )
        row = cur.fetchone()

    assert row is None or row[0] is False, (
        "Account should have been deleted or deactivated"
    )
