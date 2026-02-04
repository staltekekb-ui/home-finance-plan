# Домашняя Бухгалтерия

Приложение для учёта личных финансов с распознаванием скриншотов банковских приложений.

## Возможности

- Загрузка скриншотов из банковских приложений
- Автоматическое распознавание суммы, описания и даты (OpenRouter API)
- Автокатегоризация расходов по ключевым словам
- Фильтрация транзакций по датам и категориям
- Визуализация расходов (круговые и столбчатые диаграммы)
- Экспорт данных в Excel
- PWA — работает как приложение на телефоне

## Технологии

**Backend:**
- Python 3.12
- FastAPI
- PostgreSQL + SQLAlchemy
- OpenRouter API (доступ к Claude, GPT-4 и другим моделям)

**Frontend:**
- React 18 + TypeScript
- Vite
- TailwindCSS
- Recharts
- React Query

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

## Структура проекта

```
home-finance-plan/
├── backend/
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # OCR, категоризация
│   │   ├── models.py       # SQLAlchemy модели
│   │   └── schemas.py      # Pydantic схемы
│   └── tests/              # Unit-тесты
├── frontend/
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/          # Страницы
│   │   └── api/            # API клиент
│   └── public/             # PWA иконки
├── nginx/                  # Конфигурация reverse proxy
└── docker-compose.yml
```

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/transactions` | Список транзакций |
| POST | `/api/transactions` | Создать транзакцию |
| PUT | `/api/transactions/{id}` | Обновить транзакцию |
| DELETE | `/api/transactions/{id}` | Удалить транзакцию |
| POST | `/api/upload` | Загрузить скриншот |
| GET | `/api/reports/monthly` | Месячные отчёты |
| GET | `/api/transactions/categories` | Список категорий |
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

## Тестирование

```bash
docker-compose exec backend pytest -v
```

## Лицензия

MIT
