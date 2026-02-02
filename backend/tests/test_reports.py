def test_monthly_report_empty(client):
    response = client.get("/api/reports/monthly")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 12
    assert all(r["total"] == 0 and r["count"] == 0 for r in data)


def test_monthly_report_with_transactions(client):
    transactions = [
        {"amount": 1000, "description": "Магазин 1", "category": "Еда", "date": "2024-01-10"},
        {"amount": 500, "description": "Магазин 2", "category": "Еда", "date": "2024-01-20"},
        {"amount": 2000, "description": "Такси", "category": "Транспорт", "date": "2024-02-15"},
    ]
    for t in transactions:
        client.post("/api/transactions/", json=t)

    response = client.get("/api/reports/monthly?year=2024")
    assert response.status_code == 200
    data = response.json()

    january = next(r for r in data if "Январь" in r["month"])
    assert january["total"] == 1500
    assert january["count"] == 2
    assert january["by_category"]["Еда"] == 1500

    february = next(r for r in data if "Февраль" in r["month"])
    assert february["total"] == 2000
    assert february["count"] == 1
    assert february["by_category"]["Транспорт"] == 2000


def test_monthly_report_filter_by_year(client):
    client.post("/api/transactions/", json={
        "amount": 1000, "description": "Test", "date": "2023-05-10"
    })
    client.post("/api/transactions/", json={
        "amount": 2000, "description": "Test", "date": "2024-05-10"
    })

    response_2023 = client.get("/api/reports/monthly?year=2023")
    may_2023 = next(r for r in response_2023.json() if "Май" in r["month"])
    assert may_2023["total"] == 1000

    response_2024 = client.get("/api/reports/monthly?year=2024")
    may_2024 = next(r for r in response_2024.json() if "Май" in r["month"])
    assert may_2024["total"] == 2000
