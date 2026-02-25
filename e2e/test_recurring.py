"""
E2E tests for recurring payments.

Covers:
- Creating a recurring payment via the Recurring Payments page UI
- Executing a recurring payment via the UI and verifying a transaction
  is created in the database
"""

import requests
from playwright.sync_api import Page

APP_URL = "http://localhost:8080"


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _create_recurring_payment(
    amount=1_200,
    description="Ежемесячная подписка",
    category="Развлечения",
    frequency="monthly",
    day_of_month=15,
    next_date="2024-02-15",
):
    payload = {
        "amount": amount,
        "description": description,
        "category": category,
        "frequency": frequency,
        "next_date": next_date,
    }
    if frequency == "monthly" and day_of_month:
        payload["day_of_month"] = day_of_month

    resp = requests.post(f"{APP_URL}/api/recurring/", json=payload)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_create_recurring_payment_via_ui(page: Page, db_conn):
    """
    Navigate to the Recurring Payments page, click "Добавить", fill in the
    form, and save.  Verify the payment row exists in recurring_payments.
    """
    page.goto("/recurring")
    page.wait_for_load_state("networkidle")

    page.get_by_role("button", name="Добавить").click()

    # Fill the recurring payment form – heading is "Новый повторяющийся платёж"
    form = page.locator('form:has(h2:has-text("Новый повторяющийся платёж"))')
    form.locator('input[type="number"]').nth(0).fill("2500")      # Сумма
    form.locator('input[type="text"]').fill("E2E Аренда квартиры")  # Описание
    form.locator("select").nth(0).select_option("ЖКХ")            # Категория
    form.locator("select").nth(1).select_option("monthly")        # Периодичность: Ежемесячно

    # "День месяца" appears only when frequency == "monthly"
    page.wait_for_selector('input[placeholder="1-31"]')
    form.locator('input[placeholder="1-31"]').fill("1")           # День месяца

    form.locator('input[type="date"]').fill("2024-02-01")         # Следующая дата

    form.get_by_role("button", name="Сохранить").click()
    # Wait for the form to close (onSuccess sets showForm=false)
    page.locator('form:has(h2:has-text("Новый повторяющийся платёж"))').wait_for(state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the recurring payment was written to the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT amount, description, category, frequency, day_of_month "
            "FROM recurring_payments WHERE description = %s",
            ("E2E Аренда квартиры",),
        )
        row = cur.fetchone()

    assert row is not None, "Recurring payment was not found in the database"
    assert row[0] == 2500.0
    assert row[1] == "E2E Аренда квартиры"
    assert row[2] == "ЖКХ"
    assert row[3] == "monthly"
    assert row[4] == 1


def test_execute_recurring_payment_creates_transaction(page: Page, db_conn):
    """
    Create a recurring payment via the API, then click "Выполнить" in the UI.
    Verify that a new transaction row appears in the transactions table with
    the correct amount and description.
    """
    payment = _create_recurring_payment(
        amount=800,
        description="Стриминг-сервис E2E",
        category="Развлечения",
        frequency="monthly",
        day_of_month=10,
        next_date="2024-02-10",
    )

    page.goto("/recurring")
    page.wait_for_load_state("networkidle")

    # Click "Выполнить" on the payment card; wait for the API response to complete
    payment_card = page.locator(
        '.bg-white', has=page.locator(f'div:has-text("Стриминг-сервис E2E")')
    ).first
    with page.expect_response(
        lambda r: f"/api/recurring/{payment['id']}/execute" in r.url and r.status == 200,
        timeout=10_000,
    ):
        payment_card.get_by_role("button", name="Выполнить").click()

    # Verify a transaction was created in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT amount, description, category "
            "FROM transactions WHERE description = %s",
            (payment["description"],),
        )
        row = cur.fetchone()

    assert row is not None, (
        f"Expected a transaction for '{payment['description']}' to be created"
    )
    assert row[0] == 800.0
    assert row[1] == "Стриминг-сервис E2E"
    assert row[2] == "Развлечения"


def test_edit_recurring_payment_via_ui(page: Page, db_conn):
    """
    Create a recurring payment via the API, then click "Изменить" on its card,
    update the amount, and save.
    Verify the updated amount is persisted in the recurring_payments table.
    """
    payment = _create_recurring_payment(
        amount=500,
        description="Платёж для редактирования E2E",
        category="Развлечения",
        frequency="monthly",
        day_of_month=5,
        next_date="2024-03-05",
    )

    page.goto("/recurring")
    page.wait_for_load_state("networkidle")

    # Find the payment card and click "Изменить"
    payment_card = page.locator(
        ".bg-white", has=page.locator('div:has-text("Платёж для редактирования E2E")')
    ).first
    payment_card.get_by_role("button", name="Изменить").click()

    # The edit form renders in-page with heading "Редактировать платёж"
    form = page.locator('form:has(h2:has-text("Редактировать платёж"))')
    amount_input = form.locator('input[type="number"]').first
    amount_input.fill("750")

    form.get_by_role("button", name="Сохранить").click()
    # Wait for the form to close (onSuccess sets editingPayment=null)
    page.locator('form:has(h2:has-text("Редактировать платёж"))').wait_for(state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the amount was updated in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT amount FROM recurring_payments WHERE id = %s", (payment["id"],)
        )
        row = cur.fetchone()

    assert row is not None
    assert row[0] == 750.0, f"Expected amount 750, got {row[0]}"


def test_delete_recurring_payment_via_ui(page: Page, db_conn):
    """
    Create a recurring payment via the API, then delete it through the UI.
    Verify the payment row no longer exists in recurring_payments.
    """
    payment = _create_recurring_payment(
        amount=300,
        description="Платёж для удаления E2E",
        category="ЖКХ",
        frequency="monthly",
        day_of_month=20,
        next_date="2024-03-20",
    )

    page.goto("/recurring")
    page.wait_for_load_state("networkidle")

    # Find the payment card and click "Удалить"
    payment_card = page.locator(
        ".bg-white", has=page.locator('div:has-text("Платёж для удаления E2E")')
    ).first
    payment_card.get_by_role("button", name="Удалить").click()

    # Confirm deletion in the modal
    page.wait_for_selector('h3:has-text("Удалить повторяющийся платёж?")')
    page.locator(".modal-content").get_by_role("button", name="Удалить").click()
    # Wait for modal to close (onSuccess → setDeleteTarget(null) → modal removed)
    page.wait_for_selector('h3:has-text("Удалить повторяющийся платёж?")', state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the row was removed from the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM recurring_payments WHERE id = %s", (payment["id"],)
        )
        count = cur.fetchone()[0]

    assert count == 0, f"Expected recurring payment {payment['id']} to be deleted"
