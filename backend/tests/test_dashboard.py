import pytest
from datetime import date, timedelta


def test_get_dashboard_summary_empty(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["today"] == 0
    assert data["week"] == 0
    assert data["month"] == 0
    assert data["last_month"] == 0
    assert data["top_categories"] == []


def test_get_dashboard_summary_with_transactions(client):
    today = date.today().isoformat()
    transaction = {
        "amount": 1500.0,
        "description": "Продукты",
        "category": "Еда",
        "date": today
    }
    client.post("/api/transactions/", json=transaction)

    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["today"] == 1500.0
    assert data["week"] >= 1500.0
    assert data["month"] >= 1500.0


def test_get_dashboard_summary_top_categories(client):
    today = date.today().isoformat()

    transactions = [
        {"amount": 3000.0, "description": "Еда 1", "category": "Еда", "date": today},
        {"amount": 2000.0, "description": "Еда 2", "category": "Еда", "date": today},
        {"amount": 1500.0, "description": "Такси", "category": "Транспорт", "date": today},
        {"amount": 500.0, "description": "Кино", "category": "Развлечения", "date": today},
    ]

    for t in transactions:
        client.post("/api/transactions/", json=t)

    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()

    assert len(data["top_categories"]) <= 5
    categories = [c["category"] for c in data["top_categories"]]
    assert "Еда" in categories


def test_get_dashboard_widgets_empty(client):
    response = client.get("/api/dashboard/widgets")
    assert response.status_code == 200
    data = response.json()
    assert data["budgets"] == []
    assert data["goals"] == []
    assert data["savings_status"] is None


def test_get_dashboard_widgets_with_budgets(client):
    budget = {
        "category": "Еда",
        "monthly_limit": 30000.0,
        "alert_threshold": 0.8
    }
    client.post("/api/budgets/", json=budget)

    response = client.get("/api/dashboard/widgets")
    assert response.status_code == 200
    data = response.json()

    assert len(data["budgets"]) == 1
    assert data["budgets"][0]["category"] == "Еда"
    assert data["budgets"][0]["monthly_limit"] == 30000.0
    assert "spent" in data["budgets"][0]
    assert "remaining" in data["budgets"][0]
    assert "percentage" in data["budgets"][0]


def test_get_dashboard_widgets_with_goals(client):
    goal = {
        "name": "Отпуск",
        "target_amount": 100000.0,
        "current_amount": 25000.0
    }
    client.post("/api/savings/goals", json=goal)

    response = client.get("/api/dashboard/widgets")
    assert response.status_code == 200
    data = response.json()

    assert len(data["goals"]) == 1
    assert data["goals"][0]["name"] == "Отпуск"


def test_get_dashboard_widgets_with_savings_status(client):
    client.put("/api/settings", json={"monthly_income": 100000.0, "monthly_savings_goal": 20000.0})

    today = date.today().isoformat()
    transaction = {
        "amount": 30000.0,
        "description": "Расходы",
        "category": "Другое",
        "date": today
    }
    client.post("/api/transactions/", json=transaction)

    response = client.get("/api/dashboard/widgets")
    assert response.status_code == 200
    data = response.json()

    assert data["savings_status"] is not None
    assert data["savings_status"]["income"] == 100000.0
    assert data["savings_status"]["savings_goal"] == 20000.0
    assert "expenses" in data["savings_status"]
    assert "savings" in data["savings_status"]
    assert "is_on_track" in data["savings_status"]


def test_get_dashboard_widgets_goals_exclude_completed(client):
    goal1 = {
        "name": "Активная цель",
        "target_amount": 100000.0,
        "current_amount": 25000.0
    }
    goal2 = {
        "name": "Выполненная цель",
        "target_amount": 50000.0,
        "current_amount": 50000.0
    }
    client.post("/api/savings/goals", json=goal1)
    client.post("/api/savings/goals", json=goal2)

    response = client.get("/api/dashboard/widgets")
    assert response.status_code == 200
    data = response.json()

    assert len(data["goals"]) == 1
    assert data["goals"][0]["name"] == "Активная цель"
