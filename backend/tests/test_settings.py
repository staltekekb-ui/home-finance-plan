import pytest


def test_get_settings_default(client):
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["monthly_income"] is None
    assert data["monthly_savings_goal"] is None


def test_update_settings_create(client):
    settings = {
        "monthly_income": 100000.0,
        "monthly_savings_goal": 20000.0
    }
    response = client.put("/api/settings", json=settings)
    assert response.status_code == 200
    data = response.json()
    assert data["monthly_income"] == 100000.0
    assert data["monthly_savings_goal"] == 20000.0


def test_update_settings_update(client):
    settings1 = {"monthly_income": 100000.0}
    client.put("/api/settings", json=settings1)

    settings2 = {"monthly_income": 120000.0, "monthly_savings_goal": 30000.0}
    response = client.put("/api/settings", json=settings2)
    assert response.status_code == 200
    data = response.json()
    assert data["monthly_income"] == 120000.0
    assert data["monthly_savings_goal"] == 30000.0


def test_update_settings_partial(client):
    settings1 = {"monthly_income": 100000.0, "monthly_savings_goal": 20000.0}
    client.put("/api/settings", json=settings1)

    settings2 = {"monthly_savings_goal": 25000.0}
    response = client.put("/api/settings", json=settings2)
    assert response.status_code == 200
    data = response.json()
    assert data["monthly_income"] == 100000.0
    assert data["monthly_savings_goal"] == 25000.0


def test_get_settings_after_update(client):
    settings = {
        "monthly_income": 150000.0,
        "monthly_savings_goal": 40000.0
    }
    client.put("/api/settings", json=settings)

    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["monthly_income"] == 150000.0
    assert data["monthly_savings_goal"] == 40000.0
