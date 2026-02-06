import random
import base64
import json
import httpx
from datetime import date, datetime
from pathlib import Path
from app.config import get_settings
from app.schemas import ParsedTransaction
from app.services.categorizer import categorize_transaction, MOCK_CATEGORIES

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


async def parse_screenshot(image_path: str) -> list[ParsedTransaction]:
    """Распознаёт скриншот банковского приложения с автокатегоризацией.
    Возвращает список транзакций (может быть одна или несколько)."""

    if not settings.openrouter_api_key:
        # Return 1-3 mock transactions
        num_transactions = random.randint(1, 3)
        transactions = []
        for _ in range(num_transactions):
            mock = random.choice(MOCK_TRANSACTIONS)
            category_data = MOCK_CATEGORIES.get(mock["description"], (None, "expense"))
            category, transaction_type = category_data if isinstance(category_data, tuple) else (category_data, "expense")
            transactions.append(ParsedTransaction(
                amount=mock["amount"],
                description=mock["description"],
                category=category,
                transaction_type=transaction_type,
                date=date.today(),
                raw_text="[MOCK MODE] API ключ не настроен"
            ))
        return transactions

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

    # Get current date for context
    today = date.today()
    current_year = today.year
    current_month = today.month
    current_day = today.day

    prompt = f"""Проанализируй этот скриншот из банковского приложения.
Извлеки информацию о ВСЕХ транзакциях на скриншоте и верни ТОЛЬКО JSON массив в формате:
[
    {{
        "amount": <сумма как число, без валюты>,
        "description": "<описание/название магазина/получатель>",
        "transaction_type": "<income или expense>",
        "date": "<дата в формате YYYY-MM-DD>"
    }},
    ...
]

ВАЖНО ПРО ТИП ТРАНЗАКЦИИ:
- transaction_type должен быть "income" для ДОХОДОВ (зарплата, переводы от других лиц, пополнения)
- transaction_type должен быть "expense" для РАСХОДОВ (покупки, оплата услуг, снятие наличных)
- Обрати внимание на знак операции: "+" это доход (income), "-" это расход (expense)
- Снятие наличных = expense (расход)
- Зачисление зарплаты = income (доход)
- Перевод от другого лица = income (доход)

ВАЖНО ПРО КОЛИЧЕСТВО:
- Если на скриншоте ОДНА транзакция - верни массив с одним элементом
- Если на скриншоте НЕСКОЛЬКО транзакций (например, список операций или выписка) - верни массив со всеми транзакциями
- Если это чек из магазина с несколькими товарами - это ОДНА транзакция, верни общую сумму

ВАЖНЫЕ ПРАВИЛА ДЛЯ ДАТЫ:
- Сегодня: {today.strftime('%Y-%m-%d')} (год: {current_year}, месяц: {current_month}, день: {current_day})
- Если на скриншоте указан только день и месяц (например "29 фев" или "29.02"), используй ТЕКУЩИЙ ГОД {current_year}
- Если на скриншоте указан только день (например "29"), используй ТЕКУЩИЙ МЕСЯЦ {current_month} и ГОД {current_year}
- Если дата вообще не видна, используй сегодняшнюю дату: {today.strftime('%Y-%m-%d')}
- Если видно, что транзакция была вчера/позавчера, вычти соответствующее количество дней от сегодняшней даты
- НИКОГДА не используй старые года (2024, 2023 и т.д.) если год явно не написан на скриншоте

Верни ТОЛЬКО JSON массив, без дополнительного текста."""

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

    # Log the raw response for debugging
    print(f"[OCR DEBUG] Raw response from API: {raw_response}")

    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
        response_text = response_text.strip()

    print(f"[OCR DEBUG] Cleaned response: {response_text}")

    try:
        data = json.loads(response_text)
        print(f"[OCR DEBUG] Parsed data: {data}")
    except json.JSONDecodeError as e:
        print(f"[OCR DEBUG] JSON parsing error: {e}")
        raise ValueError(
            f"Не удалось распознать транзакции на изображении. "
            f"Убедитесь, что это скриншот банковского приложения с информацией о платеже. "
            f"Ответ модели: {raw_response[:200]}"
        )

    # Ensure data is a list
    if not isinstance(data, list):
        # If model returned a single object instead of array, wrap it
        data = [data]

    transactions = []
    for item in data:
        if isinstance(item["date"], str):
            parsed_date = datetime.strptime(item["date"], "%Y-%m-%d").date()
        else:
            parsed_date = date.today()

        description = item["description"]
        # Get transaction_type from API response or determine from description
        transaction_type = item.get("transaction_type", "expense")

        # Auto-categorize based on description
        category, auto_type = categorize_transaction(description)

        # If no category from keywords, try to use what we got from API
        if category is None:
            category = item.get("category")

        # Prefer API's transaction_type, but validate with auto-detection
        if transaction_type not in ["income", "expense"]:
            transaction_type = auto_type

        transactions.append(ParsedTransaction(
            amount=float(item["amount"]),
            description=description,
            category=category,
            transaction_type=transaction_type,
            date=parsed_date,
            raw_text=response_text
        ))

    return transactions
