import pytest


@pytest.fixture
def sample_account():
    return {
        "name": "Основная карта",
        "account_type": "card",
        "balance": 50000.0,
        "currency": "RUB",
        "color": "#4CAF50"
    }


def test_create_account(client, sample_account):
    response = client.post("/api/accounts/", json=sample_account)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == sample_account["name"]
    assert data["account_type"] == sample_account["account_type"]
    assert data["balance"] == sample_account["balance"]
    assert data["is_active"] == True
    assert "id" in data


def test_create_account_minimal(client):
    account = {
        "name": "Наличные",
        "account_type": "cash"
    }
    response = client.post("/api/accounts/", json=account)
    assert response.status_code == 200
    data = response.json()
    assert data["balance"] == 0.0
    assert data["currency"] == "RUB"


def test_get_accounts_empty(client):
    response = client.get("/api/accounts/")
    assert response.status_code == 200
    assert response.json() == []


def test_get_accounts(client, sample_account):
    client.post("/api/accounts/", json=sample_account)
    response = client.get("/api/accounts/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == sample_account["name"]


def test_get_accounts_include_inactive(client, sample_account):
    create_response = client.post("/api/accounts/", json=sample_account)
    account_id = create_response.json()["id"]
    client.put(f"/api/accounts/{account_id}", json={"is_active": False})

    response = client.get("/api/accounts/?active_only=true")
    assert response.status_code == 200
    assert len(response.json()) == 0

    response = client.get("/api/accounts/?active_only=false")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_account_by_id(client, sample_account):
    create_response = client.post("/api/accounts/", json=sample_account)
    account_id = create_response.json()["id"]

    response = client.get(f"/api/accounts/{account_id}")
    assert response.status_code == 200
    assert response.json()["id"] == account_id


def test_get_account_not_found(client):
    response = client.get("/api/accounts/999")
    assert response.status_code == 404


def test_get_total_balance(client, sample_account):
    client.post("/api/accounts/", json=sample_account)
    sample_account["name"] = "Вторая карта"
    sample_account["balance"] = 30000.0
    client.post("/api/accounts/", json=sample_account)

    response = client.get("/api/accounts/total-balance")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 80000.0
    assert "by_currency" in data
    assert data["by_currency"]["RUB"] == 80000.0


def test_update_account(client, sample_account):
    create_response = client.post("/api/accounts/", json=sample_account)
    account_id = create_response.json()["id"]

    update_data = {"name": "Зарплатная карта", "balance": 75000.0}
    response = client.put(f"/api/accounts/{account_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["name"] == "Зарплатная карта"
    assert response.json()["balance"] == 75000.0


def test_update_account_not_found(client):
    response = client.put("/api/accounts/999", json={"name": "Test"})
    assert response.status_code == 404


def test_delete_account_without_transactions(client, sample_account):
    create_response = client.post("/api/accounts/", json=sample_account)
    account_id = create_response.json()["id"]

    response = client.delete(f"/api/accounts/{account_id}")
    assert response.status_code == 200
    assert "удалён" in response.json()["message"]

    get_response = client.get(f"/api/accounts/{account_id}")
    assert get_response.status_code == 404


def test_delete_account_with_transactions(client, sample_account, sample_transaction):
    create_response = client.post("/api/accounts/", json=sample_account)
    account_id = create_response.json()["id"]

    # Pass account_id as query parameter, not in body
    client.post(f"/api/transactions/?account_id={account_id}", json=sample_transaction)

    response = client.delete(f"/api/accounts/{account_id}")
    assert response.status_code == 200
    assert "деактивирован" in response.json()["message"]

    get_response = client.get(f"/api/accounts/{account_id}")
    assert response.status_code == 200
    assert get_response.json()["is_active"] == False


def test_delete_account_not_found(client):
    response = client.delete("/api/accounts/999")
    assert response.status_code == 404


def test_adjust_balance(client, sample_account):
    create_response = client.post("/api/accounts/", json=sample_account)
    account_id = create_response.json()["id"]
    initial_balance = create_response.json()["balance"]

    response = client.post(f"/api/accounts/{account_id}/adjust-balance?amount=5000")
    assert response.status_code == 200
    assert response.json()["balance"] == initial_balance + 5000

    response = client.post(f"/api/accounts/{account_id}/adjust-balance?amount=-3000")
    assert response.status_code == 200
    assert response.json()["balance"] == initial_balance + 5000 - 3000


def test_adjust_balance_not_found(client):
    response = client.post("/api/accounts/999/adjust-balance?amount=5000")
    assert response.status_code == 404
