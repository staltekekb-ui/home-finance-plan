import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboardSummary, getDashboardWidgets } from '../api/client';
import ProgressBar from '../components/ProgressBar';

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  const { data: widgets, isLoading: widgetsLoading } = useQuery({
    queryKey: ['dashboard-widgets'],
    queryFn: getDashboardWidgets,
  });

  const isLoading = summaryLoading || widgetsLoading;

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Обзор</h1>

      {/* Summary Cards */}
      {summary && <SummaryWidget summary={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budgets Widget */}
        {widgets?.budgets && widgets.budgets.length > 0 && (
          <BudgetsWidget budgets={widgets.budgets} />
        )}

        {/* Savings Widget */}
        {widgets?.savings_status && (
          <SavingsWidget status={widgets.savings_status} />
        )}

        {/* Goals Widget */}
        {widgets?.goals && widgets.goals.length > 0 && (
          <GoalsWidget goals={widgets.goals} />
        )}

        {/* Top Categories */}
        {summary?.top_categories && summary.top_categories.length > 0 && (
          <TopCategoriesWidget categories={summary.top_categories} />
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="font-medium mb-3">Быстрые действия</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Добавить транзакцию
          </Link>
          <Link
            to="/transactions"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          >
            Все транзакции
          </Link>
          <Link
            to="/reports"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          >
            Отчёты
          </Link>
        </div>
      </div>
    </div>
  );
}

interface SummaryWidgetProps {
  summary: {
    today: number;
    week: number;
    month: number;
    last_month: number;
    month_change_percent: number;
  };
}

function SummaryWidget({ summary }: SummaryWidgetProps) {
  const changeColor = summary.month_change_percent > 0 ? 'text-red-600' : 'text-green-600';
  const changeSign = summary.month_change_percent > 0 ? '+' : '';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">Сегодня</div>
        <div className="text-xl font-bold text-red-600">
          {summary.today.toLocaleString('ru-RU')} ₽
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">За неделю</div>
        <div className="text-xl font-bold text-red-600">
          {summary.week.toLocaleString('ru-RU')} ₽
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">За месяц</div>
        <div className="text-xl font-bold text-red-600">
          {summary.month.toLocaleString('ru-RU')} ₽
        </div>
        <div className={`text-xs ${changeColor}`}>
          {changeSign}{summary.month_change_percent.toFixed(1)}% к прошлому месяцу
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">Прошлый месяц</div>
        <div className="text-xl font-bold text-gray-600">
          {summary.last_month.toLocaleString('ru-RU')} ₽
        </div>
      </div>
    </div>
  );
}

interface BudgetsWidgetProps {
  budgets: Array<{
    id: number;
    category: string;
    monthly_limit: number;
    spent: number;
    percentage: number;
    is_over_threshold: boolean;
  }>;
}

function BudgetsWidget({ budgets }: BudgetsWidgetProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Бюджеты</h2>
        <Link to="/budgets" className="text-sm text-blue-600 hover:text-blue-800">
          Все бюджеты
        </Link>
      </div>
      <div className="space-y-3">
        {budgets.slice(0, 4).map((budget) => (
          <div key={budget.id}>
            <div className="flex justify-between text-sm mb-1">
              <span>{budget.category}</span>
              <span className={budget.is_over_threshold ? 'text-red-600' : ''}>
                {budget.spent.toLocaleString('ru-RU')} / {budget.monthly_limit.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <ProgressBar
              percentage={budget.percentage}
              color={budget.percentage >= 100 ? 'red' : budget.is_over_threshold ? 'yellow' : 'green'}
              showLabel={false}
              size="sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SavingsWidgetProps {
  status: {
    income: number;
    expenses: number;
    savings: number;
    savings_goal: number;
    is_on_track: boolean;
  };
}

function SavingsWidget({ status }: SavingsWidgetProps) {
  const percentage = status.savings_goal > 0
    ? (status.savings / status.savings_goal * 100)
    : (status.income > 0 ? ((status.income - status.expenses) / status.income * 100) : 0);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Накопления в этом месяце</h2>
        <Link to="/goals" className="text-sm text-blue-600 hover:text-blue-800">
          Цели
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <div className="text-xs text-gray-500">Доход</div>
          <div className="font-medium text-green-600">
            {status.income.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Расходы</div>
          <div className="font-medium text-red-600">
            {status.expenses.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Накоплено</div>
          <div className={`font-medium ${status.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {status.savings.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>
      <ProgressBar
        percentage={Math.max(0, percentage)}
        color={status.is_on_track ? 'green' : 'red'}
        size="sm"
      />
      <div className="text-xs text-gray-500 mt-1">
        {status.is_on_track ? 'Вы достигаете цели накоплений' : 'Нужно сократить расходы'}
      </div>
    </div>
  );
}

interface GoalsWidgetProps {
  goals: Array<{
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    is_completed: boolean;
  }>;
}

function GoalsWidget({ goals }: GoalsWidgetProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Цели накоплений</h2>
        <Link to="/goals" className="text-sm text-blue-600 hover:text-blue-800">
          Все цели
        </Link>
      </div>
      <div className="space-y-3">
        {goals.slice(0, 3).map((goal) => {
          const percentage = (goal.current_amount / goal.target_amount) * 100;
          return (
            <div key={goal.id}>
              <div className="flex justify-between text-sm mb-1">
                <span>{goal.name}</span>
                <span>
                  {goal.current_amount.toLocaleString('ru-RU')} / {goal.target_amount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <ProgressBar
                percentage={percentage}
                color={goal.is_completed ? 'green' : 'blue'}
                showLabel={false}
                size="sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TopCategoriesWidgetProps {
  categories: Array<{ category: string; amount: number }>;
}

function TopCategoriesWidget({ categories }: TopCategoriesWidgetProps) {
  const total = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="font-medium mb-3">Топ категории за месяц</h2>
      <div className="space-y-2">
        {categories.map((cat, index) => {
          const percentage = total > 0 ? (cat.amount / total * 100) : 0;
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="w-24 text-sm truncate">{cat.category}</div>
              <div className="flex-1">
                <div
                  className="h-4 bg-blue-500 rounded"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 w-20 text-right">
                {cat.amount.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
