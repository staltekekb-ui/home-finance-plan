def test_create_transaction(client, sample_transaction):
    response = client.post("/api/transactions/", json=sample_transaction)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == sample_transaction["amount"]
    assert data["description"] == sample_transaction["description"]
    assert data["category"] == sample_transaction["category"]
    assert "id" in data


def test_get_transactions_empty(client):
    response = client.get("/api/transactions/")
    assert response.status_code == 200
    assert response.json() == []


def test_get_transactions(client, sample_transaction):
    client.post("/api/transactions/", json=sample_transaction)
    response = client.get("/api/transactions/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["description"] == sample_transaction["description"]


def test_get_transaction_by_id(client, sample_transaction):
    create_response = client.post("/api/transactions/", json=sample_transaction)
    transaction_id = create_response.json()["id"]

    response = client.get(f"/api/transactions/{transaction_id}")
    assert response.status_code == 200
    assert response.json()["id"] == transaction_id


def test_get_transaction_not_found(client):
    response = client.get("/api/transactions/999")
    assert response.status_code == 404


def test_update_transaction(client, sample_transaction):
    create_response = client.post("/api/transactions/", json=sample_transaction)
    transaction_id = create_response.json()["id"]

    update_data = {"amount": 2000.00, "description": "Лента"}
    response = client.put(f"/api/transactions/{transaction_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 2000.00
    assert data["description"] == "Лента"
    assert data["category"] == sample_transaction["category"]


def test_delete_transaction(client, sample_transaction):
    create_response = client.post("/api/transactions/", json=sample_transaction)
    transaction_id = create_response.json()["id"]

    response = client.delete(f"/api/transactions/{transaction_id}")
    assert response.status_code == 200

    get_response = client.get(f"/api/transactions/{transaction_id}")
    assert get_response.status_code == 404


def test_get_categories(client):
    response = client.get("/api/transactions/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert all("value" in cat and "label" in cat for cat in data)


def test_filter_by_date(client, sample_transaction):
    client.post("/api/transactions/", json=sample_transaction)

    response = client.get("/api/transactions/?date_from=2024-01-01&date_to=2024-01-31")
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = client.get("/api/transactions/?date_from=2024-02-01&date_to=2024-02-28")
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_filter_by_category(client, sample_transaction):
    client.post("/api/transactions/", json=sample_transaction)

    response = client.get("/api/transactions/?category=Еда")
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = client.get("/api/transactions/?category=Транспорт")
    assert response.status_code == 200
    assert len(response.json()) == 0
