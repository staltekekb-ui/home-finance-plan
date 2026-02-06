import type { MonthlyReport as MonthlyReportType } from '../types';

interface Props {
  report: MonthlyReportType;
}

export default function MonthlyReport({ report }: Props) {
  const balance = report.income - report.total;
  const hasIncome = report.income > 0;
  const hasExpenses = report.total > 0;

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-slate-700 dark:text-gray-50">{report.month}</h3>
        <div className="flex gap-4 items-center">
          {hasIncome && (
            <div className="text-sm">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Доход</div>
              <div className="font-bold text-green-600 dark:text-green-400">
                +{report.income.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          )}
          {hasExpenses && (
            <div className="text-sm">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Расход</div>
              <div className="font-bold text-red-600 dark:text-red-400">
                -{report.total.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          )}
          <div className="text-sm">
            <div className="text-gray-500 dark:text-gray-400 text-xs">Баланс</div>
            <div className={`font-bold ${
              balance >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-300 mb-3">
        {report.count + report.income_count} транзакций
      </div>

      {/* Expense Categories */}
      {Object.keys(report.by_category).length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Расходы по категориям:</div>
          <div className="space-y-1">
            {Object.entries(report.by_category)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{category}</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">-{amount.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Income Categories */}
      {Object.keys(report.income_by_category).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Доходы по категориям:</div>
          <div className="space-y-1">
            {Object.entries(report.income_by_category)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={`income-${category}`} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{category}</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">+{amount.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
