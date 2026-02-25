"""
E2E tests for user settings.

Covers:
- Opening the Settings modal from the Goals page and saving monthly income
  and monthly savings goal; verifying the values in the user_settings table
- Reopening the modal and verifying that previously saved values are
  pre-populated in the form inputs
"""

import requests
from playwright.sync_api import Page

APP_URL = "http://localhost:8080"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_save_settings_via_ui(page: Page, db_conn):
    """
    Navigate to /goals, open the Settings modal via the "Настройки" button,
    fill in monthly income (80 000 ₽) and monthly savings goal (15 000 ₽),
    and save.
    Verify the values are persisted:
      - in the user_settings table (via direct DB query)
      - via the GET /api/settings endpoint
    """
    page.goto("/goals")
    page.wait_for_load_state("networkidle")

    # Open the settings modal
    page.get_by_role("button", name="Настройки").click()
    page.wait_for_selector('h3:has-text("Настройки")')

    # Fill in the inputs (unique placeholders when no goal form is open)
    page.locator('input[placeholder="100000"]').fill("80000")
    page.locator('input[placeholder="20000"]').fill("15000")

    page.get_by_role("button", name="Сохранить").click()
    # Wait for the settings modal to close (onSuccess calls onClose)
    page.wait_for_selector('h3:has-text("Настройки")', state="detached")
    page.wait_for_load_state("networkidle")

    # Verify via the settings API endpoint
    resp = requests.get(f"{APP_URL}/api/settings")
    resp.raise_for_status()
    settings = resp.json()

    assert settings["monthly_income"] == 80_000, (
        f"Expected monthly_income 80000, got {settings['monthly_income']}"
    )
    assert settings["monthly_savings_goal"] == 15_000, (
        f"Expected monthly_savings_goal 15000, got {settings['monthly_savings_goal']}"
    )

    # Also verify directly in the database
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT monthly_income, monthly_savings_goal FROM user_settings LIMIT 1"
        )
        row = cur.fetchone()

    assert row is not None, "No row found in user_settings table"
    assert row[0] == 80_000.0, f"Expected DB monthly_income 80000, got {row[0]}"
    assert row[1] == 15_000.0, f"Expected DB monthly_savings_goal 15000, got {row[1]}"


def test_settings_form_prepopulated_with_saved_values(page: Page, db_conn):
    """
    Save settings via the API, then open the Settings modal via the UI and
    verify the form inputs are pre-populated with the previously saved values.
    """
    # Seed settings directly via the API
    resp = requests.put(
        f"{APP_URL}/api/settings",
        json={"monthly_income": 60_000, "monthly_savings_goal": 10_000},
    )
    resp.raise_for_status()

    page.goto("/goals")
    page.wait_for_load_state("networkidle")

    # Open the settings modal
    page.get_by_role("button", name="Настройки").click()
    page.wait_for_selector('h3:has-text("Настройки")')

    # The inputs should reflect the previously saved values
    income_val = page.locator('input[placeholder="100000"]').input_value()
    savings_val = page.locator('input[placeholder="20000"]').input_value()

    assert income_val == "60000", (
        f"Expected income input to show '60000', got '{income_val}'"
    )
    assert savings_val == "10000", (
        f"Expected savings goal input to show '10000', got '{savings_val}'"
    )


def test_settings_cancel_does_not_save(page: Page, db_conn):
    """
    Seed settings with known values, open the Settings modal, change the income
    value, then click "Отмена". Verify the original values are unchanged.
    Note: GET /api/settings auto-creates a row when none exists, so we cannot
    check for an empty table — we check that unsaved changes are not persisted.
    """
    # Seed initial settings via API
    resp = requests.put(
        f"{APP_URL}/api/settings",
        json={"monthly_income": 50_000, "monthly_savings_goal": 8_000},
    )
    resp.raise_for_status()

    page.goto("/goals")
    page.wait_for_load_state("networkidle")

    page.get_by_role("button", name="Настройки").click()
    page.wait_for_selector('h3:has-text("Настройки")')

    # Change the income to something else and cancel
    page.locator('input[placeholder="100000"]').fill("99999")

    page.get_by_role("button", name="Отмена").click()
    page.wait_for_selector('h3:has-text("Настройки")', state="detached")
    page.wait_for_load_state("networkidle")

    # Verify the original values are still in the database (cancel did not save)
    with db_conn.cursor() as cur:
        cur.execute("SELECT monthly_income FROM user_settings LIMIT 1")
        row = cur.fetchone()

    assert row is not None, "user_settings row should exist"
    assert row[0] == 50_000.0, (
        f"Expected monthly_income 50000 (unchanged after cancel), got {row[0]}"
    )
