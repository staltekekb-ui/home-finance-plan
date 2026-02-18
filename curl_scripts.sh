#!/bin/bash
# ============================================================
# Home Finance Plan API - curl scripts
# Base URL: http://localhost
#
# Правило слэшей (FastAPI):
#   POST на коллекцию: /api/resource/  (с trailing slash)
#   GET/PUT/DELETE на элемент: /api/resource/123  (без trailing slash)
#   GET на коллекцию: /api/resource  (без — curl -L для redirect)
# ============================================================

BASE="http://localhost"

# ============================================================
# 1. ACCOUNTS (Счета)
# ============================================================

# 1.1 Получить все счета
curl -sL "${BASE}/api/accounts" | python -m json.tool

# 1.2 Получить все счета (включая неактивные)
curl -sL "${BASE}/api/accounts?active_only=false" | python -m json.tool

# 1.3 Получить счёт по ID
curl -sL "${BASE}/api/accounts/15" | python -m json.tool

# 1.4 Получить общий баланс
curl -sL "${BASE}/api/accounts/total-balance" | python -m json.tool

# 1.5 Создать обычный счёт (карта)
curl -s -X POST "${BASE}/api/accounts/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Сбербанк карта",
    "account_type": "card",
    "currency": "RUB",
    "balance": 25000,
    "color": "green"
  }' | python -m json.tool

# 1.6 Создать счёт наличных
curl -s -X POST "${BASE}/api/accounts/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Наличные",
    "account_type": "cash",
    "currency": "RUB",
    "balance": 5000,
    "color": "yellow"
  }' | python -m json.tool

# 1.7 Создать накопительный счёт
curl -s -X POST "${BASE}/api/accounts/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Накопительный Тинькофф",
    "account_type": "savings",
    "currency": "RUB",
    "balance": 100000,
    "color": "blue"
  }' | python -m json.tool

# 1.8 Создать кредитную карту
curl -s -X POST "${BASE}/api/accounts/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tinkoff Platinum",
    "account_type": "credit_card",
    "currency": "RUB",
    "balance": 0,
    "color": "purple",
    "credit_limit": 300000,
    "interest_rate": 29.9,
    "billing_day": 20,
    "grace_period_days": 55,
    "minimum_payment_percent": 8,
    "card_last_digits": "4567",
    "card_keywords": "Tinkoff,Platinum"
  }' | python -m json.tool

# 1.9 Обновить счёт (подставьте нужный ID)
curl -s -X PUT "${BASE}/api/accounts/15" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Моя зарплатная карта (обновлено)",
    "balance": 55000
  }' | python -m json.tool

# 1.10 Корректировка баланса (+5000)
curl -s -X POST "${BASE}/api/accounts/15/adjust-balance?amount=5000" | python -m json.tool

# 1.11 Корректировка баланса (-2000)
curl -s -X POST "${BASE}/api/accounts/15/adjust-balance?amount=-2000" | python -m json.tool

# 1.12 Удалить счёт (деактивирует, если есть транзакции)
curl -s -X DELETE "${BASE}/api/accounts/18" | python -m json.tool


# ============================================================
# 2. TRANSACTIONS (Транзакции)
# ============================================================

# 2.1 Получить все транзакции
curl -sL "${BASE}/api/transactions" | python -m json.tool

# 2.2 Получить транзакции с фильтрами по дате
curl -sL "${BASE}/api/transactions?date_from=2026-02-01&date_to=2026-02-28&limit=50" | python -m json.tool

# 2.3 Поиск по описанию
curl -sL "${BASE}/api/transactions?search=кредит" | python -m json.tool

# 2.4 Фильтр по категории
curl -sL "${BASE}/api/transactions?category=food" | python -m json.tool

# 2.5 Фильтр по счёту
curl -sL "${BASE}/api/transactions?account_id=15" | python -m json.tool

# 2.6 Сортировка по сумме (по убыванию)
curl -sL "${BASE}/api/transactions?sort_by=amount&sort_order=desc" | python -m json.tool

# 2.7 Получить транзакцию по ID
curl -sL "${BASE}/api/transactions/1" | python -m json.tool

# 2.8 Получить список категорий
curl -sL "${BASE}/api/transactions/categories" | python -m json.tool

# 2.9 Создать транзакцию-расход (без привязки к счёту)
curl -s -X POST "${BASE}/api/transactions/" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500.50,
    "description": "Покупка продуктов в Пятёрочке",
    "category": "food",
    "transaction_type": "expense",
    "date": "2026-02-18"
  }' | python -m json.tool

# 2.10 Создать транзакцию-расход (с привязкой к счёту — баланс уменьшится)
curl -s -X POST "${BASE}/api/transactions/?account_id=15" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 3200,
    "description": "Оплата ЖКХ",
    "category": "utilities",
    "transaction_type": "expense",
    "date": "2026-02-18"
  }' | python -m json.tool

# 2.11 Создать транзакцию-доход (зарплата на счёт)
curl -s -X POST "${BASE}/api/transactions/?account_id=15" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150000,
    "description": "Зарплата за февраль",
    "category": "salary",
    "transaction_type": "income",
    "date": "2026-02-10"
  }' | python -m json.tool

# 2.12 Создать транзакцию-перевод
curl -s -X POST "${BASE}/api/transactions/" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "description": "Перевод другу",
    "category": "transfer_to_others",
    "transaction_type": "expense",
    "date": "2026-02-17"
  }' | python -m json.tool

# 2.13 Обновить транзакцию (подставьте ID)
curl -s -X PUT "${BASE}/api/transactions/1" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "description": "Покупка продуктов (исправлено)",
    "category": "food"
  }' | python -m json.tool

# 2.14 Удалить транзакцию
curl -s -X DELETE "${BASE}/api/transactions/1" | python -m json.tool

# 2.15 Проверка дубликатов
curl -s -X POST "${BASE}/api/transactions/check-duplicates" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "amount": 1500.50,
      "description": "Покупка продуктов в Пятёрочке",
      "transaction_type": "expense",
      "date": "2026-02-18"
    },
    {
      "amount": 500,
      "description": "Кофе",
      "transaction_type": "expense",
      "date": "2026-02-17"
    }
  ]' | python -m json.tool

# 2.16 Массовое удаление по ID
curl -s -X POST "${BASE}/api/transactions/bulk-delete" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_ids": [10, 11, 12]
  }' | python -m json.tool

# 2.17 Массовое удаление по фильтрам
curl -s -X POST "${BASE}/api/transactions/bulk-delete" \
  -H "Content-Type: application/json" \
  -d '{
    "date_from": "2026-01-01",
    "date_to": "2026-01-31",
    "category": "other",
    "transaction_type": "expense"
  }' | python -m json.tool


# ============================================================
# 3. UPLOAD (Загрузка файлов / OCR)
# ============================================================

# 3.1 Загрузить скриншот (замените путь на реальный файл)
curl -s -X POST "${BASE}/api/upload" \
  -F "file=@/path/to/screenshot.png" | python -m json.tool

# 3.2 Загрузить PDF
curl -s -X POST "${BASE}/api/upload" \
  -F "file=@/path/to/bank_statement.pdf" | python -m json.tool

# 3.3 Пакетная загрузка нескольких файлов
curl -s -X POST "${BASE}/api/upload/batch" \
  -F "files=@/path/to/file1.png" \
  -F "files=@/path/to/file2.png" \
  -F "files=@/path/to/file3.pdf" | python -m json.tool


# ============================================================
# 4. DASHBOARD (Дашборд)
# ============================================================

# 4.1 Сводка: расходы за сегодня, неделю, месяц + топ категорий
curl -sL "${BASE}/api/dashboard/summary" | python -m json.tool

# 4.2 Виджеты: бюджеты, цели накоплений, статус сбережений
curl -sL "${BASE}/api/dashboard/widgets" | python -m json.tool


# ============================================================
# 5. REPORTS (Отчёты)
# ============================================================

# 5.1 Месячный отчёт за текущий год
curl -sL "${BASE}/api/reports/monthly" | python -m json.tool

# 5.2 Месячный отчёт за конкретный год
curl -sL "${BASE}/api/reports/monthly?year=2025" | python -m json.tool


# ============================================================
# 6. EXPORT (Экспорт)
# ============================================================

# 6.1 Экспорт всех транзакций в Excel
curl -sL "${BASE}/api/export/excel" -o transactions.xlsx && echo "OK: transactions.xlsx saved"

# 6.2 Экспорт с фильтрами по дате
curl -sL "${BASE}/api/export/excel?date_from=2026-02-01&date_to=2026-02-28" -o feb_2026.xlsx && echo "OK: feb_2026.xlsx saved"

# 6.3 Экспорт по категории
curl -sL "${BASE}/api/export/excel?category=food" -o food_transactions.xlsx && echo "OK: food_transactions.xlsx saved"


# ============================================================
# 7. RECURRING (Регулярные платежи)
# ============================================================

# 7.1 Получить все активные регулярные платежи
curl -sL "${BASE}/api/recurring" | python -m json.tool

# 7.2 Получить все (включая неактивные)
curl -sL "${BASE}/api/recurring?active_only=false" | python -m json.tool

# 7.3 Получить по ID
curl -sL "${BASE}/api/recurring/2" | python -m json.tool

# 7.4 Создать ежемесячный платёж
curl -s -X POST "${BASE}/api/recurring/" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 15000,
    "description": "Аренда квартиры",
    "category": "utilities",
    "frequency": "monthly",
    "day_of_month": 5,
    "next_date": "2026-03-05"
  }' | python -m json.tool

# 7.5 Создать еженедельный платёж
curl -s -X POST "${BASE}/api/recurring/" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "description": "Подписка на фитнес",
    "category": "health",
    "frequency": "weekly",
    "day_of_week": 1,
    "next_date": "2026-02-24"
  }' | python -m json.tool

# 7.6 Создать ежегодный платёж
curl -s -X POST "${BASE}/api/recurring/" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 6000,
    "description": "Страховка авто (ОСАГО)",
    "category": "other",
    "frequency": "yearly",
    "next_date": "2026-09-01"
  }' | python -m json.tool

# 7.7 Обновить регулярный платёж
curl -s -X PUT "${BASE}/api/recurring/2" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 32000,
    "description": "Кредит (обновлённая сумма)"
  }' | python -m json.tool

# 7.8 Выполнить регулярный платёж (создаёт транзакцию + сдвигает дату)
curl -s -X POST "${BASE}/api/recurring/2/execute" | python -m json.tool

# 7.9 Создать регулярный из существующей транзакции (подставьте ID)
curl -s -X POST "${BASE}/api/recurring/from-transaction/1?frequency=monthly" | python -m json.tool

# 7.10 Удалить регулярный платёж
curl -s -X DELETE "${BASE}/api/recurring/1" | python -m json.tool


# ============================================================
# 8. BUDGETS (Бюджеты)
# ============================================================

# 8.1 Получить все бюджеты
curl -sL "${BASE}/api/budgets" | python -m json.tool

# 8.2 Получить статус бюджетов (с текущими расходами)
curl -sL "${BASE}/api/budgets/status" | python -m json.tool

# 8.3 Статус за конкретный месяц
curl -sL "${BASE}/api/budgets/status?year=2026&month=1" | python -m json.tool

# 8.4 Получить бюджет по ID
curl -sL "${BASE}/api/budgets/1" | python -m json.tool

# 8.5 Создать бюджет на еду
curl -s -X POST "${BASE}/api/budgets/" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "food",
    "monthly_limit": 30000,
    "alert_threshold": 0.8
  }' | python -m json.tool

# 8.6 Создать бюджет на транспорт
curl -s -X POST "${BASE}/api/budgets/" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "transport",
    "monthly_limit": 10000,
    "alert_threshold": 0.9
  }' | python -m json.tool

# 8.7 Создать бюджет на развлечения
curl -s -X POST "${BASE}/api/budgets/" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "entertainment",
    "monthly_limit": 15000,
    "alert_threshold": 0.7
  }' | python -m json.tool

# 8.8 Обновить бюджет (подставьте ID)
curl -s -X PUT "${BASE}/api/budgets/1" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_limit": 35000,
    "alert_threshold": 0.85
  }' | python -m json.tool

# 8.9 Удалить бюджет
curl -s -X DELETE "${BASE}/api/budgets/1" | python -m json.tool


# ============================================================
# 9. SAVINGS (Цели накоплений)
# ============================================================

# 9.1 Получить активные цели
curl -sL "${BASE}/api/savings/goals" | python -m json.tool

# 9.2 Получить все цели (включая выполненные)
curl -sL "${BASE}/api/savings/goals?include_completed=true" | python -m json.tool

# 9.3 Получить цель по ID
curl -sL "${BASE}/api/savings/goals/1" | python -m json.tool

# 9.4 Статус накоплений за текущий месяц
curl -sL "${BASE}/api/savings/monthly-status" | python -m json.tool

# 9.5 Создать цель — Отпуск
curl -s -X POST "${BASE}/api/savings/goals" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Отпуск в Турции",
    "target_amount": 200000,
    "current_amount": 0,
    "target_date": "2026-07-01"
  }' | python -m json.tool

# 9.6 Создать цель — Новый ноутбук
curl -s -X POST "${BASE}/api/savings/goals" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новый MacBook Pro",
    "target_amount": 250000,
    "current_amount": 50000,
    "target_date": "2026-12-31"
  }' | python -m json.tool

# 9.7 Создать цель — Подушка безопасности (без дедлайна)
curl -s -X POST "${BASE}/api/savings/goals" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Подушка безопасности",
    "target_amount": 500000,
    "current_amount": 120000
  }' | python -m json.tool

# 9.8 Пополнить цель (+10000) — подставьте ID цели
curl -s -X POST "${BASE}/api/savings/goals/1/add?amount=10000" | python -m json.tool

# 9.9 Снять с цели (-5000)
curl -s -X POST "${BASE}/api/savings/goals/1/subtract?amount=5000" | python -m json.tool

# 9.10 Обновить цель
curl -s -X PUT "${BASE}/api/savings/goals/1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Отпуск в Египте",
    "target_amount": 150000
  }' | python -m json.tool

# 9.11 Удалить цель
curl -s -X DELETE "${BASE}/api/savings/goals/1" | python -m json.tool


# ============================================================
# 10. SETTINGS (Настройки пользователя)
# ============================================================

# 10.1 Получить настройки
curl -sL "${BASE}/api/settings" | python -m json.tool

# 10.2 Установить доход и цель накоплений
curl -s -X PUT "${BASE}/api/settings/" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_income": 150000,
    "monthly_savings_goal": 30000
  }' | python -m json.tool

# 10.3 Обновить только доход
curl -s -X PUT "${BASE}/api/settings/" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_income": 180000
  }' | python -m json.tool
