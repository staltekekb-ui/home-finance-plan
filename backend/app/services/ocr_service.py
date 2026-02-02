import random
from datetime import date, datetime
from pathlib import Path
from app.config import get_settings
from app.schemas import ParsedTransaction
from app.services.categorizer import categorize, MOCK_CATEGORIES

settings = get_settings()

MOCK_TRANSACTIONS = [
    {"amount": 1250.00, "description": "Пятёрочка"},
    {"amount": 350.00, "description": "Яндекс.Такси"},
    {"amount": 890.00, "description": "Ozon"},
    {"amount": 2100.00, "description": "Лента"},
    {"amount": 450.00, "description": "Аптека Ригла"},
    {"amount": 1800.00, "description": "DNS"},
    {"amount": 320.00, "description": "Кофемания"},
    {"amount": 5500.00, "description": "МВидео"},
]


async def parse_screenshot(image_path: str) -> ParsedTransaction:
    """Распознаёт скриншот банковского приложения с автокатегоризацией."""

    if not settings.anthropic_api_key:
        mock = random.choice(MOCK_TRANSACTIONS)
        category = MOCK_CATEGORIES.get(mock["description"])
        return ParsedTransaction(
            amount=mock["amount"],
            description=mock["description"],
            category=category,
            date=date.today(),
            raw_text="[MOCK MODE] API ключ не настроен"
        )

    import anthropic
    import base64
    import json

    image_data = Path(image_path).read_bytes()
    base64_image = base64.standard_b64encode(image_data).decode("utf-8")

    extension = Path(image_path).suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    media_type = media_types.get(extension, "image/png")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": base64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": """Проанализируй этот скриншот из банковского приложения.
Извлеки информацию о транзакции и верни ТОЛЬКО JSON в формате:
{
    "amount": <сумма как число, без валюты>,
    "description": "<описание/название магазина/получатель>",
    "date": "<дата в формате YYYY-MM-DD>"
}

Если дата не видна, используй сегодняшнюю дату.
Верни ТОЛЬКО JSON, без дополнительного текста."""
                    }
                ],
            }
        ],
    )

    response_text = message.content[0].text.strip()

    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
        response_text = response_text.strip()

    data = json.loads(response_text)

    if isinstance(data["date"], str):
        parsed_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
    else:
        parsed_date = date.today()

    description = data["description"]
    category = categorize(description)

    return ParsedTransaction(
        amount=float(data["amount"]),
        description=description,
        category=category,
        date=parsed_date,
        raw_text=response_text
    )
