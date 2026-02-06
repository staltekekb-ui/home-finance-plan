import io


def test_upload_screenshot(client):
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    fake_image.name = "test.png"

    response = client.post(
        "/api/upload",
        files={"file": ("test.png", fake_image, "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    # API now returns array of transactions
    assert isinstance(data, list)
    assert len(data) > 0
    # Check first transaction
    transaction = data[0]
    assert "amount" in transaction
    assert "description" in transaction
    assert "date" in transaction
    assert "raw_text" in transaction


def test_upload_non_image(client):
    fake_file = io.BytesIO(b"not an image")

    response = client.post(
        "/api/upload",
        files={"file": ("test.txt", fake_file, "text/plain")}
    )
    assert response.status_code == 400
