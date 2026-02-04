import pytest
from datetime import date


@pytest.fixture
def sample_recurring():
    return {
        "amount": 500.0,
        "description": "Подписка Netflix",
        "category": "Развлечения",
        "frequency": "monthly",
        "day_of_month": 15,
        "next_date": "2024-02-15"
    }


def test_create_recurring_payment(client, sample_recurring):
    response = client.post("/api/recurring/", json=sample_recurring)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == sample_recurring["amount"]
    assert data["description"] == sample_recurring["description"]
    assert data["frequency"] == "monthly"
    assert data["is_active"] == True
    assert "id" in data


def test_create_recurring_weekly(client):
    recurring = {
        "amount": 200.0,
        "description": "Уборка",
        "category": "ЖКХ",
        "frequency": "weekly",
        "day_of_week": 6,
        "next_date": "2024-02-10"
    }
    response = client.post("/api/recurring/", json=recurring)
    assert response.status_code == 200
    assert response.json()["day_of_week"] == 6


def test_get_recurring_payments_empty(client):
    response = client.get("/api/recurring/")
    assert response.status_code == 200
    assert response.json() == []


def test_get_recurring_payments(client, sample_recurring):
    client.post("/api/recurring/", json=sample_recurring)
    response = client.get("/api/recurring/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["description"] == sample_recurring["description"]


def test_get_recurring_payments_filter_active(client, sample_recurring):
    create_response = client.post("/api/recurring/", json=sample_recurring)
    payment_id = create_response.json()["id"]
    client.put(f"/api/recurring/{payment_id}", json={"is_active": False})

    response = client.get("/api/recurring/?active_only=true")
    assert response.status_code == 200
    assert len(response.json()) == 0

    response = client.get("/api/recurring/?active_only=false")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_recurring_payment_by_id(client, sample_recurring):
    create_response = client.post("/api/recurring/", json=sample_recurring)
    payment_id = create_response.json()["id"]

    response = client.get(f"/api/recurring/{payment_id}")
    assert response.status_code == 200
    assert response.json()["id"] == payment_id


def test_get_recurring_payment_not_found(client):
    response = client.get("/api/recurring/999")
    assert response.status_code == 404


def test_update_recurring_payment(client, sample_recurring):
    create_response = client.post("/api/recurring/", json=sample_recurring)
    payment_id = create_response.json()["id"]

    update_data = {"amount": 600.0, "description": "Подписка HBO"}
    response = client.put(f"/api/recurring/{payment_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["amount"] == 600.0
    assert response.json()["description"] == "Подписка HBO"


def test_update_recurring_payment_not_found(client):
    response = client.put("/api/recurring/999", json={"amount": 100.0})
    assert response.status_code == 404


def test_delete_recurring_payment(client, sample_recurring):
    create_response = client.post("/api/recurring/", json=sample_recurring)
    payment_id = create_response.json()["id"]

    response = client.delete(f"/api/recurring/{payment_id}")
    assert response.status_code == 200

    get_response = client.get("/api/recurring/")
    assert len(get_response.json()) == 0


def test_delete_recurring_payment_not_found(client):
    response = client.delete("/api/recurring/999")
    assert response.status_code == 404


def test_execute_recurring_payment(client, sample_recurring):
    create_response = client.post("/api/recurring/", json=sample_recurring)
    payment_id = create_response.json()["id"]

    response = client.post(f"/api/recurring/{payment_id}/execute")
    assert response.status_code == 200
    data = response.json()
    assert "transaction" in data
    assert "recurring_payment" in data
    assert data["transaction"]["amount"] == sample_recurring["amount"]
    assert data["transaction"]["description"] == sample_recurring["description"]


def test_execute_recurring_payment_inactive(client, sample_recurring):
    sample_recurring["is_active"] = False
    create_response = client.post("/api/recurring/", json=sample_recurring)
    payment_id = create_response.json()["id"]
    client.put(f"/api/recurring/{payment_id}", json={"is_active": False})

    response = client.post(f"/api/recurring/{payment_id}/execute")
    assert response.status_code == 400
    assert "не активен" in response.json()["detail"]


def test_execute_recurring_payment_not_found(client):
    response = client.post("/api/recurring/999/execute")
    assert response.status_code == 404


def test_create_recurring_from_transaction(client, sample_transaction):
    create_response = client.post("/api/transactions/", json=sample_transaction)
    transaction_id = create_response.json()["id"]

    response = client.post(f"/api/recurring/from-transaction/{transaction_id}?frequency=monthly")
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == sample_transaction["amount"]
    assert data["description"] == sample_transaction["description"]
    assert data["category"] == sample_transaction["category"]
    assert data["frequency"] == "monthly"


def test_create_recurring_from_transaction_not_found(client):
    response = client.post("/api/recurring/from-transaction/999?frequency=monthly")
    assert response.status_code == 404
