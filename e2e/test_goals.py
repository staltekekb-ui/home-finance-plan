"""
E2E tests for savings goals.

Covers:
- Creating a savings goal via the Goals page UI
- Adding an amount to an existing goal via the UI and verifying the
  current_amount update in the database
"""

import requests
from playwright.sync_api import Page

APP_URL = "http://localhost:8080"


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _create_goal(name="API Цель", target_amount=50_000, current_amount=0):
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


def test_create_goal_via_ui(page: Page, db_conn):
    """
    Navigate to the Goals page, click "Добавить цель", fill in the form,
    and save.  Verify the goal row exists in the savings_goals table.
    """
    page.goto("/goals")
    page.wait_for_load_state("networkidle")

    page.get_by_role("button", name="Добавить цель").click()

    # Fill the goal form – heading is "Новая цель"
    form = page.locator('form:has(h2:has-text("Новая цель"))')
    form.locator('input[placeholder="Например: Отпуск в Турции"]').fill(
        "E2E Тест-цель отпуск"
    )
    form.locator('input[placeholder="100000"]').fill("75000")   # Целевая сумма
    form.locator('input[placeholder="0"]').fill("5000")         # Уже накоплено
    form.locator('input[type="date"]').fill("2025-12-31")       # Дата достижения

    form.get_by_role("button", name="Сохранить").click()
    # Wait for the form to close (onSuccess sets showForm=false)
    page.locator('form:has(h2:has-text("Новая цель"))').wait_for(state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the goal was stored in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT name, target_amount, current_amount "
            "FROM savings_goals WHERE name = %s",
            ("E2E Тест-цель отпуск",),
        )
        row = cur.fetchone()

    assert row is not None, "Goal was not found in the database"
    assert row[0] == "E2E Тест-цель отпуск"
    assert row[1] == 75_000.0
    assert row[2] == 5_000.0


def test_add_amount_to_goal_via_ui(page: Page, db_conn):
    """
    Create a savings goal via the API, then use the UI "Добавить" button to
    add money to it.  Verify the current_amount increased in the database.
    """
    goal = _create_goal(name="Накопления на авто", target_amount=100_000, current_amount=10_000)

    page.goto("/goals")
    page.wait_for_load_state("networkidle")

    # Click the "Добавить" button on the goal card
    goal_card = page.locator('.card', has=page.locator(f'h3:has-text("Накопления на авто")'))
    goal_card.get_by_role("button", name="Добавить").click()

    # Fill in the amount in the "Добавить к" modal
    page.wait_for_selector('h3:has-text("Добавить к")')
    page.locator('input[placeholder="Сумма"]').fill("15000")
    page.get_by_role("button", name="Добавить").last.click()
    # Wait for the add-amount modal to close (onSuccess sets addAmountTarget=null)
    page.wait_for_selector('h3:has-text("Добавить к")', state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the current_amount was updated in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT current_amount FROM savings_goals WHERE id = %s",
            (goal["id"],),
        )
        row = cur.fetchone()

    assert row is not None
    expected = 10_000 + 15_000
    assert row[0] == expected, (
        f"Expected current_amount {expected}, got {row[0]}"
    )


def test_edit_goal_via_ui(page: Page, db_conn):
    """
    Create a savings goal via the API, then click "Изменить" on the goal card,
    update the target amount, and save.
    Verify the updated target_amount is persisted in the savings_goals table.
    """
    goal = _create_goal(
        name="Цель для редактирования E2E",
        target_amount=50_000,
        current_amount=5_000,
    )

    page.goto("/goals")
    page.wait_for_load_state("networkidle")

    # Find the goal card and click "Изменить"
    goal_card = page.locator(
        ".card", has=page.locator('h3:has-text("Цель для редактирования E2E")')
    )
    goal_card.get_by_role("button", name="Изменить").click()

    # The edit form renders in-page with heading "Редактировать цель"
    form = page.locator('form:has(h2:has-text("Редактировать цель"))')
    target_input = form.locator('input[placeholder="100000"]')
    target_input.fill("75000")

    form.get_by_role("button", name="Сохранить").click()
    # Wait for the form to close (onSuccess sets editingGoal=null)
    page.locator('form:has(h2:has-text("Редактировать цель"))').wait_for(state="detached")
    page.wait_for_load_state("networkidle")

    # Verify target_amount was updated in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT target_amount FROM savings_goals WHERE id = %s", (goal["id"],)
        )
        row = cur.fetchone()

    assert row is not None
    assert row[0] == 75_000.0, f"Expected target_amount 75000, got {row[0]}"


def test_delete_goal_via_ui(page: Page, db_conn):
    """
    Create a savings goal via the API, then delete it through the UI.
    Verify the goal row no longer exists in the savings_goals table.
    """
    goal = _create_goal(
        name="Цель для удаления E2E",
        target_amount=10_000,
        current_amount=0,
    )

    page.goto("/goals")
    page.wait_for_load_state("networkidle")

    # Find the goal card and click "Удалить"
    goal_card = page.locator(
        ".card", has=page.locator('h3:has-text("Цель для удаления E2E")')
    )
    goal_card.get_by_role("button", name="Удалить").click()

    # Confirm deletion in the modal
    page.wait_for_selector('h3:has-text("Удалить цель?")')
    page.locator(".modal-content").get_by_role("button", name="Удалить").click()
    # Wait for modal to close (onSuccess → setDeleteTarget(null) → modal removed)
    page.wait_for_selector('h3:has-text("Удалить цель?")', state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the row was removed from the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM savings_goals WHERE id = %s", (goal["id"],)
        )
        count = cur.fetchone()[0]

    assert count == 0, f"Expected goal {goal['id']} to be deleted"
