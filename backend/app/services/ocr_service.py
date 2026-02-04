import random
import base64
import json
import httpx
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

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


async def parse_screenshot(image_path: str) -> ParsedTransaction:
    """Распознаёт скриншот банковского приложения с автокатегоризацией."""

    if not settings.openrouter_api_key:
        mock = random.choice(MOCK_TRANSACTIONS)
        category = MOCK_CATEGORIES.get(mock["description"])
        return ParsedTransaction(
            amount=mock["amount"],
            description=mock["description"],
            category=category,
            date=date.today(),
            raw_text="[MOCK MODE] API ключ не настроен"
        )

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

    prompt = """Проанализируй этот скриншот из банковского приложения.
Извлеки информацию о транзакции и верни ТОЛЬКО JSON в формате:
{
    "amount": <сумма как число, без валюты>,
    "description": "<описание/название магазина/получатель>",
    "date": "<дата в формате YYYY-MM-DD>"
}

Если дата не видна, используй сегодняшнюю дату.
Верни ТОЛЬКО JSON, без дополнительного текста."""

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openrouter_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{media_type};base64,{base64_image}"
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ],
                "max_tokens": 1024,
            }
        )
        response.raise_for_status()
        result = response.json()

    response_text = result["choices"][0]["message"]["content"].strip()
    raw_response = response_text

    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
        response_text = response_text.strip()

    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        raise ValueError(
            f"Не удалось распознать транзакцию на изображении. "
            f"Убедитесь, что это скриншот банковского приложения с информацией о платеже. "
            f"Ответ модели: {raw_response[:200]}"
        )

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
