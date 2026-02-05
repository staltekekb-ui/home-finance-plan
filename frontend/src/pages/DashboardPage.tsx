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
    return <div className="text-center py-8 text-gray-500 dark:text-gray-300">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-50">Обзор</h1>

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
      <div className="card p-4">
        <h2 className="font-semibold text-slate-700 dark:text-gray-50 mb-3">Быстрые действия</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/upload"
            className="btn-primary"
          >
            Добавить транзакцию
          </Link>
          <Link
            to="/transactions"
            className="btn-secondary"
          >
            Все транзакции
          </Link>
          <Link
            to="/reports"
            className="btn-secondary"
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
      <div className="card p-4">
        <div className="text-sm text-gray-500 dark:text-gray-300">Сегодня</div>
        <div className="text-xl font-bold text-red-600 dark:text-red-400">
          {summary.today.toLocaleString('ru-RU')} ₽
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-gray-500 dark:text-gray-300">За неделю</div>
        <div className="text-xl font-bold text-red-600 dark:text-red-400">
          {summary.week.toLocaleString('ru-RU')} ₽
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-gray-500 dark:text-gray-300">За месяц</div>
        <div className="text-xl font-bold text-red-600 dark:text-red-400">
          {summary.month.toLocaleString('ru-RU')} ₽
        </div>
        <div className={`text-xs ${changeColor} dark:opacity-90`}>
          {changeSign}{summary.month_change_percent.toFixed(1)}% к прошлому месяцу
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-gray-500 dark:text-gray-300">Прошлый месяц</div>
        <div className="text-xl font-bold text-gray-600 dark:text-gray-300">
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
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-700 dark:text-gray-50">Бюджеты</h2>
        <Link to="/budgets" className="text-sm text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 font-medium">
          Все бюджеты
        </Link>
      </div>
      <div className="space-y-3">
        {budgets.slice(0, 4).map((budget) => (
          <div key={budget.id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-700 dark:text-gray-50">{budget.category}</span>
              <span className={`font-medium ${budget.is_over_threshold ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-gray-300'}`}>
                {budget.spent.toLocaleString('ru-RU')} / {budget.monthly_limit.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <ProgressBar
              percentage={budget.percentage}
              color={budget.percentage >= 100 ? 'danger' : budget.is_over_threshold ? 'warning' : 'sage'}
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
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-700 dark:text-gray-50">Накопления в этом месяце</h2>
        <Link to="/goals" className="text-sm text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 font-medium">
          Цели
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-300">Доход</div>
          <div className="font-semibold text-green-600 dark:text-green-400">
            {status.income.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-300">Расходы</div>
          <div className="font-semibold text-red-600 dark:text-red-400">
            {status.expenses.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-300">Накоплено</div>
          <div className={`font-semibold ${status.savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {status.savings.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>
      <ProgressBar
        percentage={Math.max(0, percentage)}
        color={status.is_on_track ? 'sage' : 'danger'}
        size="sm"
      />
      <div className="text-xs text-gray-500 dark:text-gray-300 mt-1 font-medium">
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
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-700 dark:text-gray-50">Цели накоплений</h2>
        <Link to="/goals" className="text-sm text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 font-medium">
          Все цели
        </Link>
      </div>
      <div className="space-y-3">
        {goals.slice(0, 3).map((goal) => {
          const percentage = (goal.current_amount / goal.target_amount) * 100;
          return (
            <div key={goal.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700 dark:text-gray-50">{goal.name}</span>
                <span className="font-medium text-slate-600 dark:text-gray-300">
                  {goal.current_amount.toLocaleString('ru-RU')} / {goal.target_amount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <ProgressBar
                percentage={percentage}
                color={goal.is_completed ? 'success' : 'sage'}
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
    <div className="card p-4">
      <h2 className="font-semibold text-slate-700 dark:text-gray-50 mb-3">Топ категории за месяц</h2>
      <div className="space-y-2">
        {categories.map((cat, index) => {
          const percentage = total > 0 ? (cat.amount / total * 100) : 0;
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="w-24 text-sm truncate text-slate-700 dark:text-gray-50">{cat.category}</div>
              <div className="flex-1 bg-cream-300 dark:bg-dark-50/20 rounded-full overflow-hidden">
                <div
                  className="h-4 bg-sage-500 dark:bg-sage-600 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 w-20 text-right font-medium">
                {cat.amount.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
