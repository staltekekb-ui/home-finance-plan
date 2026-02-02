import type { MonthlyReport as MonthlyReportType } from '../types';

interface Props {
  report: MonthlyReportType;
}

export default function MonthlyReport({ report }: Props) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">{report.month}</h3>
        <div className="text-lg font-bold text-red-600">
          {report.total.toLocaleString('ru-RU')} ₽
        </div>
      </div>
      <div className="text-sm text-gray-500 mb-2">
        {report.count} транзакций
      </div>
      {Object.keys(report.by_category).length > 0 && (
        <div className="space-y-1">
          {Object.entries(report.by_category)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="text-gray-600">{category}</span>
                <span>{amount.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
