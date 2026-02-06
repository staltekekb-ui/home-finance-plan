import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMonthlyReports, exportToExcel } from '../api/client';
import MonthlyReport from '../components/MonthlyReport';
import { MonthlyBarChart, CategoryBreakdownChart } from '../components/Charts';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [exporting, setExporting] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', year],
    queryFn: () => getMonthlyReports(year),
  });

  const yearExpenses = reports.reduce((sum, r) => sum + r.total, 0);
  const yearIncome = reports.reduce((sum, r) => sum + r.income, 0);
  const yearBalance = yearIncome - yearExpenses;
  const totalTransactions = reports.reduce((sum, r) => sum + r.count + r.income_count, 0);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-50">Отчёты</h1>
        <div className="flex gap-2">
          <select
            className="input"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {exporting ? 'Экспорт...' : 'Excel'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 sm:p-6">
          <div className="text-sm text-gray-500 dark:text-gray-300 text-center">Доходы {year}</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 text-center mt-2">
            +{yearIncome.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="text-sm text-gray-500 dark:text-gray-300 text-center">Расходы {year}</div>
          <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 text-center mt-2">
            -{yearExpenses.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="text-sm text-gray-500 dark:text-gray-300 text-center">Баланс {year}</div>
          <div className={`text-2xl sm:text-3xl font-bold text-center mt-2 ${
            yearBalance >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {yearBalance >= 0 ? '+' : ''}{yearBalance.toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-300 mt-1 text-center">
            {totalTransactions} транзакций
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-300">Загрузка...</div>
      ) : (
        <>
          {/* Графики */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-4 sm:p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-50 mb-4">Траты по месяцам</h2>
              <MonthlyBarChart reports={reports} />
            </div>
            <div className="card p-4 sm:p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-50 mb-4">По категориям</h2>
              <CategoryBreakdownChart reports={reports} />
            </div>
          </div>

          {/* Детализация по месяцам */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-50">Детализация</h2>
            {reports
              .filter((r) => r.count > 0)
              .map((report) => (
                <MonthlyReport key={report.month} report={report} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
