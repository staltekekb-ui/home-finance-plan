"""Автоматическое определение категории и типа транзакции по описанию."""

# Категории расходов
EXPENSE_KEYWORDS = {
    "Еда": [
        "пятёрочка", "пятерочка", "pyaterochka", "5ka", "магнит", "magnit",
        "лента", "lenta", "перекрёсток", "перекресток", "perekrestok",
        "дикси", "dixy", "dixis", "ашан", "auchan", "метро", "metro cash",
        "окей", "okey", "вкусвилл", "vkusvill", "азбука вкуса", "мясо",
        "продукты", "супермаркет", "гипермаркет", "grocery", "food",
        "жизньмарт", "zhiznmart"
    ],
    "Транспорт": [
        "яндекс.такси", "яндекс такси", "yandex.taxi", "yandex taxi", "uber", "убер",
        "ситимобил", "citymobil", "gett", "такси", "taxi", "метро", "мосметро",
        "ржд", "rzd", "аэрофлот", "aeroflot", "s7", "победа", "pobeda",
        "бензин", "азс", "лукойл", "lukoil", "газпром", "gazprom", "роснефть",
        "rosneft", "shell", "bp", "каршеринг", "carsharing", "делимобиль",
        "delimobil", "яндекс драйв", "yandex drive", "парковка", "parking"
    ],
    "Развлечения": [
        "кино", "cinema", "театр", "концерт", "netflix", "spotify", "youtube",
        "кинопоиск", "ivi", "okko", "амедиатека", "steam", "playstation", "xbox",
        "боулинг", "бильярд", "клуб", "бар", "паб"
    ],
    "ЖКХ": [
        "жкх", "квартплата", "электричество", "мосэнерго", "водоканал", "газ",
        "отопление", "капремонт", "управляющая компания", "интернет", "ростелеком",
        "мтс", "билайн", "мегафон", "теле2", "связь"
    ],
    "Здоровье": [
        "аптека", "ригла", "горздрав", "36.6", "pharmacy", "поликлиника",
        "больница", "врач", "стоматолог", "анализы", "медицина", "здоровье"
    ],
    "Покупки": [
        "ozon", "озон", "wildberries", "вайлдберриз", "wb", "aliexpress", "ali",
        "amazon", "dns", "днс", "мвидео", "mvideo", "м.видео", "эльдорадо",
        "eldorado", "ситилинк", "citilink", "икеа", "ikea", "леруа", "leroy",
        "lerua", "одежда", "обувь", "zara", "h&m", "uniqlo", "спортмастер",
        "sportmaster"
    ],
    "Образование": [
        "курс", "обучение", "школа", "университет", "книга", "литрес",
        "skillbox", "нетология", "geekbrains", "coursera", "udemy"
    ],
    "Кафе и рестораны": [
        "ресторан", "restaurant", "кафе", "cafe", "кофе", "coffee", "кофейня",
        "starbucks", "старбакс", "макдоналдс", "mcdonalds", "mcd", "бургер кинг",
        "burger king", "kfc", "кфс", "сушишоп", "sushishop", "суши", "sushi",
        "пицца", "pizza", "додо", "dodo", "папа джонс", "papa johns",
        "кофемания", "кофеманія", "shokoladnitsa", "шоколадница"
    ],
    "Снятие наличных": [
        "снятие наличных", "выдача наличных", "cash withdrawal", "atm",
        "банкомат", "получение наличных", "наличные"
    ],
    "Перевод другим лицам": [
        "перевод", "transfer to", "на карту", "по номеру телефона",
        "по номеру", "отправить", "отправка", "переслал", "перевел",
        "на счет", "на счёт", "sbp", "сбп", "система быстрых платежей",
        "p2p", "transfer", "send money"
    ],
}

# Категории доходов
INCOME_KEYWORDS = {
    "Зарплата": [
        "зарплата", "заработная плата", "оплата труда", "salary", "wage",
        "начисление з/п", "начисление зарплаты", "выплата зп"
    ],
    "Перевод от других лиц": [
        "перевод от", "зачисление от", "поступление от", "пополнение от",
        "transfer from", "получен перевод", "поступил перевод", "с карты на",
        "перевод на ваш счет", "перевод на вашу карту"
    ],
    "Внесение наличных": [
        "внесение наличных", "пополнение наличными", "cash deposit",
        "внесение", "внес наличные", "пополнение счета наличными"
    ],
    "Фриланс": [
        "фриланс", "freelance", "upwork", "fiverr", "заказ", "проект",
        "услуги", "выполнение работ"
    ],
    "Инвестиции": [
        "дивиденды", "купон", "dividend", "инвестиции", "акции", "облигации",
        "доход от инвестиций", "брокер", "тинькофф инвестиции"
    ],
}


def categorize_transaction(description: str) -> tuple[str | None, str]:
    """
    Определяет категорию и тип транзакции по описанию.
    Returns: (category, transaction_type)
    transaction_type: "income" or "expense"
    """
    description_lower = description.lower()

    # Special handling for transfers: check direction indicators
    # If contains "от" (from), it's income; otherwise check expense keywords first
    has_from_indicator = any(word in description_lower for word in ["от ", " от", "зачисление", "поступление", "получен"])

    if has_from_indicator:
        # Check income keywords first for transfers FROM others
        for category, keywords in INCOME_KEYWORDS.items():
            for keyword in keywords:
                if keyword in description_lower:
                    return (category, "income")

    # Check expense keywords (including transfers TO others)
    for category, keywords in EXPENSE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in description_lower:
                return (category, "expense")

    # Check remaining income keywords
    for category, keywords in INCOME_KEYWORDS.items():
        for keyword in keywords:
            if keyword in description_lower:
                return (category, "income")

    # Default to expense with no category
    return (None, "expense")


# For backward compatibility
def categorize(description: str) -> str | None:
    """Определяет категорию по описанию транзакции (старая функция для совместимости)."""
    category, _ = categorize_transaction(description)
    return category


# Mock категории для тестирования
MOCK_CATEGORIES = {
    "Пятёрочка": ("Еда", "expense"),
    "Яндекс.Такси": ("Транспорт", "expense"),
    "Ozon": ("Покупки", "expense"),
    "Лента": ("Еда", "expense"),
    "Аптека Ригла": ("Здоровье", "expense"),
    "DNS": ("Покупки", "expense"),
    "Кофемания": ("Кафе и рестораны", "expense"),
    "МВидео": ("Покупки", "expense"),
    "Зарплата": ("Зарплата", "income"),
    "Перевод от Иванова": ("Перевод от других лиц", "income"),
}
