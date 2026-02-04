# Домашняя Бухгалтерия

Приложение для учёта личных финансов с распознаванием скриншотов банковских приложений.

## Возможности

### Транзакции
- Загрузка скриншотов из банковских приложений (одиночная и пакетная)
- Автоматическое распознавание суммы, описания и даты (OpenRouter API)
- Улучшенное распознавание дат с использованием текущего года и месяца
- Автокатегоризация расходов по ключевым словам
- Ручной ввод транзакций с автодополнением
- Редактирование и удаление с подтверждением
- Поиск по описанию и сортировка
- Drag & drop и вставка из буфера (Ctrl+V)

### Бюджеты
- Установка месячных лимитов по категориям
- Отслеживание расходов с прогресс-баром
- Уведомления при приближении к лимиту

### Накопления и цели
- Создание целей накоплений с целевой суммой и датой
- Отслеживание прогресса достижения целей
- Настройка ежемесячного дохода и цели накоплений
- Виджет статуса накоплений за месяц

### Повторяющиеся платежи
- Создание регулярных платежей (ежедневно, еженедельно, ежемесячно, ежегодно)
- Выполнение платежей одним кликом
- Создание повторяющегося платежа из существующей транзакции

### Счета
- Множественные счета (наличные, карты, накопительные)
- Отслеживание баланса по каждому счёту
- Общий баланс по всем счетам
- Привязка транзакций к счетам

### Dashboard
- Обзор расходов за сегодня, неделю, месяц
- Сравнение с прошлым месяцем
- Виджеты бюджетов, целей и накоплений
- Топ категорий расходов

### Отчёты
- Визуализация расходов (круговые и столбчатые диаграммы)
- Экспорт данных в Excel
- Фильтрация по датам, категориям и счетам

### Прочее
- PWA — работает как приложение на телефоне
- Адаптивный дизайн для мобильных устройств
- Валидация форм с сообщениями об ошибках
- Комплексная обработка ошибок во всех формах
- Оптимизированный рендеринг (React.memo, useCallback)
- Кэширование данных (React Query: 5 мин)

## Технологии

**Backend:**
- Python 3.12
- FastAPI
- PostgreSQL + SQLAlchemy
- Alembic (миграции БД)
- OpenRouter API (доступ к Claude, GPT-4 и другим моделям)
- Структурированное логирование (JSON)

**Frontend:**
- React 18 + TypeScript
- Vite
- TailwindCSS
- Recharts
- React Query (TanStack Query)

**Инфраструктура:**
- Docker + Docker Compose
- Nginx (reverse proxy)

## Быстрый старт

### 1. Клонирование

```bash
git clone https://github.com/staltekekb-ui/home-finance-plan.git
cd home-finance-plan
```

### 2. Настройка окружения

```bash
cp .env.example .env
```

Для распознавания скриншотов добавьте API-ключ OpenRouter в `.env`:

```
OPENROUTER_API_KEY=your-api-key
OPENROUTER_MODEL=anthropic/claude-sonnet-4
```

Доступные модели: `anthropic/claude-sonnet-4`, `openai/gpt-4o`, `google/gemini-pro-vision` и другие.

Без ключа приложение работает в mock-режиме с тестовыми данными.

### 3. Запуск

```bash
docker-compose up --build
```

Приложение доступно по адресу: http://localhost

## Навигация

| Страница | URL | Описание |
|----------|-----|----------|
| Обзор | `/` | Dashboard с виджетами и KPI |
| Транзакции | `/transactions` | Список всех транзакций |
| Добавить | `/upload` | Загрузка скриншотов и ручной ввод |
| Отчёты | `/reports` | Графики и аналитика |
| Бюджеты | `/budgets` | Управление лимитами по категориям |
| Цели | `/goals` | Цели накоплений |
| Счета | `/accounts` | Управление счетами |
| Повторяющиеся | `/recurring` | Регулярные платежи |

## Структура проекта

```
home-finance-plan/
├── backend/
│   ├── app/
│   │   ├── routers/              # API эндпоинты
│   │   │   ├── transactions.py   # CRUD транзакций
│   │   │   ├── upload.py         # Загрузка скриншотов
│   │   │   ├── reports.py        # Отчёты
│   │   │   ├── export.py         # Экспорт в Excel
│   │   │   ├── recurring.py      # Повторяющиеся платежи
│   │   │   ├── budgets.py        # Бюджеты
│   │   │   ├── savings.py        # Цели накоплений
│   │   │   ├── settings.py       # Настройки пользователя
│   │   │   ├── dashboard.py      # Dashboard API
│   │   │   └── accounts.py       # Счета
│   │   ├── services/             # Бизнес-логика
│   │   │   ├── ocr_service.py    # Распознавание скриншотов
│   │   │   └── categorizer.py    # Автокатегоризация
│   │   ├── models.py             # SQLAlchemy модели
│   │   ├── schemas.py            # Pydantic схемы
│   │   ├── database.py           # Подключение к БД
│   │   ├── config.py             # Настройки приложения
│   │   ├── logging_config.py     # Конфигурация логирования
│   │   ├── middleware.py         # HTTP middleware
│   │   └── main.py               # Точка входа FastAPI
│   ├── alembic/                  # Миграции базы данных
│   │   ├── versions/             # Файлы миграций
│   │   └── env.py                # Конфигурация Alembic
│   ├── tests/                    # Unit-тесты
│   │   ├── test_transactions.py
│   │   ├── test_budgets.py
│   │   ├── test_savings.py
│   │   ├── test_accounts.py
│   │   ├── test_recurring.py
│   │   ├── test_dashboard.py
│   │   └── test_settings.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/           # React компоненты
│   │   │   ├── TransactionCard.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   ├── UploadForm.tsx
│   │   │   ├── ManualEntryForm.tsx
│   │   │   ├── EditTransactionModal.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── RecurringPaymentCard.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   └── FormError.tsx
│   │   ├── pages/                # Страницы приложения
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── HomePage.tsx      # Транзакции
│   │   │   ├── UploadPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── BudgetsPage.tsx
│   │   │   ├── GoalsPage.tsx
│   │   │   ├── AccountsPage.tsx
│   │   │   └── RecurringPage.tsx
│   │   ├── api/
│   │   │   └── client.ts         # API клиент
│   │   ├── lib/
│   │   │   └── queryClient.ts    # Конфигурация React Query
│   │   ├── utils/
│   │   │   └── validation.ts     # Функции валидации
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript типы
│   │   ├── App.tsx               # Главный компонент
│   │   └── main.tsx              # Точка входа
│   └── public/                   # PWA иконки
├── nginx/                        # Конфигурация reverse proxy
└── docker-compose.yml
```

## API Endpoints

### Транзакции
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/transactions` | Список транзакций (фильтры: date_from, date_to, category, search, account_id, sort_by, sort_order) |
| POST | `/api/transactions` | Создать транзакцию |
| PUT | `/api/transactions/{id}` | Обновить транзакцию |
| DELETE | `/api/transactions/{id}` | Удалить транзакцию |
| GET | `/api/transactions/categories` | Список категорий |

### Загрузка
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/upload` | Загрузить один скриншот |
| POST | `/api/upload/batch` | Загрузить несколько скриншотов |

### Повторяющиеся платежи
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/recurring` | Список повторяющихся платежей |
| POST | `/api/recurring` | Создать платёж |
| PUT | `/api/recurring/{id}` | Обновить платёж |
| DELETE | `/api/recurring/{id}` | Удалить платёж |
| POST | `/api/recurring/{id}/execute` | Выполнить платёж |
| POST | `/api/recurring/from-transaction/{id}` | Создать из транзакции |

### Бюджеты
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/budgets` | Список бюджетов |
| GET | `/api/budgets/status` | Статус бюджетов с расходами |
| POST | `/api/budgets` | Создать бюджет |
| PUT | `/api/budgets/{id}` | Обновить бюджет |
| DELETE | `/api/budgets/{id}` | Удалить бюджет |

### Накопления
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/savings/goals` | Список целей |
| POST | `/api/savings/goals` | Создать цель |
| PUT | `/api/savings/goals/{id}` | Обновить цель |
| POST | `/api/savings/goals/{id}/add` | Добавить к накоплениям |
| DELETE | `/api/savings/goals/{id}` | Удалить цель |
| GET | `/api/savings/monthly-status` | Статус накоплений за месяц |

### Счета
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/accounts` | Список счетов |
| GET | `/api/accounts/total-balance` | Общий баланс |
| POST | `/api/accounts` | Создать счёт |
| PUT | `/api/accounts/{id}` | Обновить счёт |
| DELETE | `/api/accounts/{id}` | Удалить/деактивировать счёт |

### Настройки
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/settings` | Получить настройки |
| PUT | `/api/settings` | Обновить настройки |

### Dashboard
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/dashboard/summary` | Сводка расходов |
| GET | `/api/dashboard/widgets` | Данные для виджетов |

### Отчёты и экспорт
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/reports/monthly` | Месячные отчёты |
| GET | `/api/export/excel` | Экспорт в Excel |

## Категории расходов

- Еда
- Транспорт
- Развлечения
- ЖКХ
- Здоровье
- Покупки
- Образование
- Кафе и рестораны
- Другое

## Разработка

### Миграции базы данных

```bash
# Применить миграции
docker-compose exec backend alembic upgrade head

# Создать новую миграцию
docker-compose exec backend alembic revision --autogenerate -m "description"

# Откатить миграцию
docker-compose exec backend alembic downgrade -1
```

### Тестирование

```bash
docker-compose exec backend pytest -v
```

Все 81 теста проходят успешно, покрывая:
- CRUD операции для всех сущностей (транзакции, счета, бюджеты, цели)
- Повторяющиеся платежи и их выполнение
- Dashboard виджеты и аналитику
- Автокомплит целей накоплений
- Валидацию и обработку ошибок

### Логирование

Приложение использует структурированное JSON-логирование. Пример вывода:

```json
{
  "timestamp": "2026-02-05T12:00:00Z",
  "level": "INFO",
  "logger": "app.routers.upload",
  "message": "Screenshot parsed successfully",
  "request_id": "abc123",
  "amount": 1500.0,
  "category": "Еда"
}
```

## Лицензия

MIT
