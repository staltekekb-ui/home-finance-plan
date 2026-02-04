import pytest


@pytest.fixture
def sample_savings_goal():
    return {
        "name": "Отпуск в Турции",
        "target_amount": 100000.0,
        "current_amount": 25000.0,
        "target_date": "2024-07-01"
    }


def test_create_savings_goal(client, sample_savings_goal):
    response = client.post("/api/savings/goals", json=sample_savings_goal)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == sample_savings_goal["name"]
    assert data["target_amount"] == sample_savings_goal["target_amount"]
    assert data["current_amount"] == sample_savings_goal["current_amount"]
    assert data["is_completed"] == False
    assert "id" in data


def test_create_savings_goal_minimal(client):
    goal = {
        "name": "Новый телефон",
        "target_amount": 50000.0
    }
    response = client.post("/api/savings/goals", json=goal)
    assert response.status_code == 200
    data = response.json()
    assert data["current_amount"] == 0.0


def test_get_savings_goals_empty(client):
    response = client.get("/api/savings/goals")
    assert response.status_code == 200
    assert response.json() == []


def test_get_savings_goals(client, sample_savings_goal):
    client.post("/api/savings/goals", json=sample_savings_goal)
    response = client.get("/api/savings/goals")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == sample_savings_goal["name"]


def test_get_savings_goals_include_completed(client, sample_savings_goal):
    sample_savings_goal["current_amount"] = sample_savings_goal["target_amount"]
    client.post("/api/savings/goals", json=sample_savings_goal)

    response = client.get("/api/savings/goals?include_completed=false")
    assert response.status_code == 200
    assert len(response.json()) == 0

    response = client.get("/api/savings/goals?include_completed=true")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_update_savings_goal(client, sample_savings_goal):
    create_response = client.post("/api/savings/goals", json=sample_savings_goal)
    goal_id = create_response.json()["id"]

    update_data = {"name": "Отпуск в Египте", "target_amount": 80000.0}
    response = client.put(f"/api/savings/goals/{goal_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["name"] == "Отпуск в Египте"
    assert response.json()["target_amount"] == 80000.0


def test_update_savings_goal_not_found(client):
    response = client.put("/api/savings/goals/999", json={"name": "Test"})
    assert response.status_code == 404


def test_add_to_savings_goal(client, sample_savings_goal):
    create_response = client.post("/api/savings/goals", json=sample_savings_goal)
    goal_id = create_response.json()["id"]
    initial_amount = create_response.json()["current_amount"]

    response = client.post(f"/api/savings/goals/{goal_id}/add?amount=5000")
    assert response.status_code == 200
    assert response.json()["current_amount"] == initial_amount + 5000


def test_add_to_savings_goal_complete(client, sample_savings_goal):
    sample_savings_goal["current_amount"] = 90000.0
    create_response = client.post("/api/savings/goals", json=sample_savings_goal)
    goal_id = create_response.json()["id"]

    response = client.post(f"/api/savings/goals/{goal_id}/add?amount=15000")
    assert response.status_code == 200
    assert response.json()["is_completed"] == True


def test_delete_savings_goal(client, sample_savings_goal):
    create_response = client.post("/api/savings/goals", json=sample_savings_goal)
    goal_id = create_response.json()["id"]

    response = client.delete(f"/api/savings/goals/{goal_id}")
    assert response.status_code == 200

    get_response = client.get("/api/savings/goals")
    assert len(get_response.json()) == 0


def test_delete_savings_goal_not_found(client):
    response = client.delete("/api/savings/goals/999")
    assert response.status_code == 404


def test_get_monthly_savings_status_no_settings(client):
    response = client.get("/api/savings/monthly-status")
    assert response.status_code == 200
    data = response.json()
    assert data["income"] == 0
    assert data["expenses"] == 0
    assert data["savings"] == 0


def test_get_monthly_savings_status_with_settings(client, sample_transaction):
    client.put("/api/settings", json={"monthly_income": 100000.0, "monthly_savings_goal": 20000.0})
    client.post("/api/transactions/", json=sample_transaction)

    response = client.get("/api/savings/monthly-status")
    assert response.status_code == 200
    data = response.json()
    assert data["income"] == 100000.0
    assert data["savings_goal"] == 20000.0
    assert "expenses" in data
    assert "savings" in data
    assert "is_on_track" in data
