import pytest


@pytest.fixture
def sample_budget():
    return {
        "category": "Еда",
        "monthly_limit": 30000.0,
        "alert_threshold": 0.8
    }


def test_create_budget(client, sample_budget):
    response = client.post("/api/budgets/", json=sample_budget)
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == sample_budget["category"]
    assert data["monthly_limit"] == sample_budget["monthly_limit"]
    assert data["alert_threshold"] == sample_budget["alert_threshold"]
    assert "id" in data


def test_create_budget_duplicate_category(client, sample_budget):
    client.post("/api/budgets/", json=sample_budget)
    response = client.post("/api/budgets/", json=sample_budget)
    assert response.status_code == 400
    assert "уже существует" in response.json()["detail"]


def test_get_budgets_empty(client):
    response = client.get("/api/budgets/")
    assert response.status_code == 200
    assert response.json() == []


def test_get_budgets(client, sample_budget):
    client.post("/api/budgets/", json=sample_budget)
    response = client.get("/api/budgets/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["category"] == sample_budget["category"]


def test_get_budgets_status(client, sample_budget, sample_transaction):
    client.post("/api/budgets/", json=sample_budget)
    client.post("/api/transactions/", json=sample_transaction)

    response = client.get("/api/budgets/status")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert "spent" in data[0]
    assert "remaining" in data[0]
    assert "percentage" in data[0]
    assert "is_over_threshold" in data[0]


def test_update_budget(client, sample_budget):
    create_response = client.post("/api/budgets/", json=sample_budget)
    budget_id = create_response.json()["id"]

    update_data = {"monthly_limit": 40000.0}
    response = client.put(f"/api/budgets/{budget_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["monthly_limit"] == 40000.0


def test_update_budget_not_found(client):
    response = client.put("/api/budgets/999", json={"monthly_limit": 40000.0})
    assert response.status_code == 404


def test_delete_budget(client, sample_budget):
    create_response = client.post("/api/budgets/", json=sample_budget)
    budget_id = create_response.json()["id"]

    response = client.delete(f"/api/budgets/{budget_id}")
    assert response.status_code == 200

    get_response = client.get("/api/budgets/")
    assert len(get_response.json()) == 0


def test_delete_budget_not_found(client):
    response = client.delete("/api/budgets/999")
    assert response.status_code == 404
