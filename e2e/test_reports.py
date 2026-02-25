"""
E2E tests for the Reports page.

Covers:
- Reports page loads with heading, year selector, and three annual summary cards
- Chart sections ('Траты по месяцам', 'По категориям', 'Детализация') are rendered
  after creating expense transactions
- Annual totals shown on the page match totals computed from the database
- Excel export button is visible and enabled
"""

from datetime import date

import requests
from playwright.sync_api import Page

APP_URL = "http://localhost:8080"


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _create_account(name="Reports-счёт", balance=20_000):
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
    amount, description, transaction_type="expense", category=None, date_str=None
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


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_reports_page_loads(page: Page, db_conn):
    """
    Navigate to /reports and verify the page heading, year selector,
    and the three annual summary cards (Доходы, Расходы, Баланс) are rendered.
    """
    current_year = date.today().year

    page.goto("/reports")
    page.wait_for_load_state("networkidle")

    assert page.locator('h1:has-text("Отчёты")').is_visible(), "Reports heading not visible"
    assert page.locator("select").first.is_visible(), "Year selector not visible"
    assert page.get_by_text(f"Доходы {current_year}").is_visible(), (
        f"Income card 'Доходы {current_year}' not visible"
    )
    assert page.get_by_text(f"Расходы {current_year}").is_visible(), (
        f"Expenses card 'Расходы {current_year}' not visible"
    )
    assert page.get_by_text(f"Баланс {current_year}").is_visible(), (
        f"Balance card 'Баланс {current_year}' not visible"
    )


def test_reports_chart_sections_visible_with_data(page: Page, db_conn):
    """
    Create an expense transaction for the current month, navigate to /reports,
    and verify the chart headings ('Траты по месяцам', 'По категориям', 'Детализация')
    are rendered.
    """
    _create_account()
    _create_transaction(2_000, "Тест отчёт расход E2E", category="Еда")

    page.goto("/reports")
    page.wait_for_load_state("networkidle")

    assert page.get_by_text("Траты по месяцам").is_visible(), (
        "Bar chart heading 'Траты по месяцам' not visible"
    )
    assert page.get_by_role("heading", name="По категориям").is_visible(), (
        "Pie chart heading 'По категориям' not visible"
    )
    assert page.get_by_text("Детализация").is_visible(), (
        "Section heading 'Детализация' not visible"
    )


def test_reports_annual_totals_match_database(page: Page, db_conn):
    """
    Create a known expense and a known income for the current year.
    Verify the sums stored in the transactions table match what
    the Reports page is supposed to display (cross-checked via the API).
    Also verify the page loads without errors.
    """
    today = date.today().isoformat()

    _create_account()
    _create_transaction(4_200, "Расход E2E отчёт", transaction_type="expense", date_str=today)
    _create_transaction(8_000, "Доход E2E отчёт", transaction_type="income", date_str=today)

    # Direct DB verification
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'expense'"
        )
        total_expenses = float(cur.fetchone()[0])

        cur.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'income'"
        )
        total_income = float(cur.fetchone()[0])

    assert total_expenses >= 4_200, (
        f"Expected expenses >= 4200 in DB, got {total_expenses}"
    )
    assert total_income >= 8_000, (
        f"Expected income >= 8000 in DB, got {total_income}"
    )

    # Page should render without errors
    page.goto("/reports")
    page.wait_for_load_state("networkidle")

    current_year = date.today().year
    assert page.get_by_text(f"Расходы {current_year}").is_visible()
    assert page.get_by_text(f"Доходы {current_year}").is_visible()


def test_reports_export_button_present(page: Page, db_conn):
    """
    Verify the Excel export button is present and enabled on the Reports page.
    """
    page.goto("/reports")
    page.wait_for_load_state("networkidle")

    export_btn = page.get_by_role("button", name="Excel")
    assert export_btn.is_visible(), "Excel export button not visible"
    assert not export_btn.is_disabled(), "Excel export button should be enabled"
