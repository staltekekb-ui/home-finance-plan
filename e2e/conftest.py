"""
E2E test configuration and shared fixtures.

Usage:
    cd /c/workspace/home-finance-plan/e2e
    pip install -r requirements.txt
    playwright install chromium
    pytest -v
"""

import subprocess
import time
from pathlib import Path

import psycopg2
import pytest
import requests
from playwright.sync_api import sync_playwright

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECT_ROOT = str(Path(__file__).parent.parent)
APP_URL = "http://localhost:8080"

DB_HOST = "localhost"
DB_PORT = 5433
DB_NAME = "home_finance"
DB_USER = "postgres"
DB_PASSWORD = "postgres"

# Tables to truncate between tests (order avoids FK conflicts with CASCADE)
TABLES_TO_TRUNCATE = (
    "transactions",
    "accounts",
    "budgets",
    "savings_goals",
    "recurring_payments",
    "user_settings",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def wait_for_app(url: str, timeout: int = 180) -> bool:
    """Poll the API until it responds without a 5xx error."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            resp = requests.get(f"{url}/api/transactions/", timeout=5)
            if resp.status_code < 500:
                return True
        except Exception:
            pass
        time.sleep(3)
    return False


# ---------------------------------------------------------------------------
# Session-scoped fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def docker_env():
    """
    Start the E2E Docker Compose environment once for the entire test session.
    Tears down (including volumes) after all tests have finished.
    """
    subprocess.run(
        [
            "docker-compose",
            "-f",
            "docker-compose.e2e.yml",
            "up",
            "-d",
            "--build",
        ],
        cwd=PROJECT_ROOT,
        check=True,
    )

    if not wait_for_app(APP_URL):
        subprocess.run(
            ["docker-compose", "-f", "docker-compose.e2e.yml", "down", "-v"],
            cwd=PROJECT_ROOT,
        )
        pytest.fail(
            "E2E application did not become available within 180 seconds. "
            "Check docker-compose.e2e.yml service logs."
        )

    yield

    subprocess.run(
        ["docker-compose", "-f", "docker-compose.e2e.yml", "down", "-v"],
        cwd=PROJECT_ROOT,
    )


@pytest.fixture(scope="session")
def browser_session(request, docker_env):
    """Single Chromium browser for the whole test session."""
    headed = request.config.getoption("--headed")
    slow_mo = request.config.getoption("--slowmo")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed, slow_mo=slow_mo)
        yield browser
        browser.close()


# ---------------------------------------------------------------------------
# Function-scoped fixtures (one per test)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="function")
def db_conn(docker_env):
    """
    Psycopg2 connection to the E2E PostgreSQL instance.
    Truncates all application tables after each test to ensure isolation.
    """
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
    conn.autocommit = True

    yield conn

    # Cleanup: wipe all data so next test starts fresh
    try:
        tables = ", ".join(TABLES_TO_TRUNCATE)
        with conn.cursor() as cur:
            cur.execute(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE")
    finally:
        conn.close()


@pytest.fixture(scope="function")
def page(browser_session, db_conn):
    """
    Fresh browser context + page for each test.
    Depends on db_conn so cleanup always runs even if the test crashes.
    """
    context = browser_session.new_context(base_url=APP_URL)
    pg = context.new_page()
    pg.set_default_timeout(15_000)
    pg.goto("/")
    pg.wait_for_load_state("networkidle")
    yield pg
    context.close()
