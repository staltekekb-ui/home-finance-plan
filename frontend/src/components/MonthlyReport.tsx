import type { MonthlyReport as MonthlyReportType } from '../types';

interface Props {
  report: MonthlyReportType;
}

export default function MonthlyReport({ report }: Props) {
  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-slate-700 dark:text-gray-50">{report.month}</h3>
        <div className="text-lg font-bold text-red-600 dark:text-red-400">
          {report.total.toLocaleString('ru-RU')} ₽
        </div>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-300 mb-2">
        {report.count} транзакций
      </div>
      {Object.keys(report.by_category).length > 0 && (
        <div className="space-y-1">
          {Object.entries(report.by_category)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">{category}</span>
                <span className="text-slate-700 dark:text-gray-50 font-medium">{amount.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
