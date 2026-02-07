import { useState, useEffect } from 'react';
import type { Category, Account } from '../types';

interface Props {
  isOpen: boolean;
  categories: Category[];
  accounts: Account[];
  onDelete: (params: {
    date_from?: string;
    date_to?: string;
    category?: string;
    account_id?: number;
    transaction_type?: string;
  }) => void;
  onCancel: () => void;
  isDeleting: boolean;
}

type PeriodType = 'today' | 'week' | 'month' | 'last_month' | 'custom' | 'all';

export default function BulkDeleteModal({
  isOpen,
  categories,
  accounts,
  onDelete,
  onCancel,
  isDeleting,
}: Props) {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState<number | undefined>(undefined);
  const [transactionType, setTransactionType] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setPeriod('month');
      setDateFrom('');
      setDateTo('');
      setCategory('');
      setAccountId(undefined);
      setTransactionType('');
      setConfirmed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-calculate dates based on period
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    switch (period) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0];
        setDateFrom(todayStr);
        setDateTo(todayStr);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(day - 7);
        setDateFrom(weekAgo.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthStart = new Date(year, month, 1);
        setDateFrom(monthStart.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'last_month':
        const lastMonthStart = new Date(year, month - 1, 1);
        const lastMonthEnd = new Date(year, month, 0);
        setDateFrom(lastMonthStart.toISOString().split('T')[0]);
        setDateTo(lastMonthEnd.toISOString().split('T')[0]);
        break;
      case 'all':
        setDateFrom('');
        setDateTo('');
        break;
      case 'custom':
        // Keep current values
        break;
    }
  }, [period]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;

    const params: any = {};
    if (dateFrom && period !== 'all') params.date_from = dateFrom;
    if (dateTo && period !== 'all') params.date_to = dateTo;
    if (category) params.category = category;
    if (accountId) params.account_id = accountId;
    if (transactionType) params.transaction_type = transactionType;

    onDelete(params);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-2xl p-6">
        <h2 className="text-xl font-bold text-slate-700 dark:text-gray-50 mb-4">
          Массовое удаление транзакций
        </h2>

        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">
                Внимание! Необратимая операция
              </h4>
              <p className="text-sm text-red-700 dark:text-red-200">
                Удаленные транзакции невозможно восстановить. Балансы счетов будут автоматически пересчитаны.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">
              Период
            </label>
            <select
              className="input"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
            >
              <option value="today">Сегодня</option>
              <option value="week">Эта неделя</option>
              <option value="month">Этот месяц</option>
              <option value="last_month">Прошлый месяц</option>
              <option value="custom">Произвольный период</option>
              <option value="all">Все транзакции</option>
            </select>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2">
                  Дата с
                </label>
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2">
                  Дата по
                </label>
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          {period !== 'custom' && period !== 'all' && (
            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
              Период: {dateFrom} — {dateTo}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2">
                Категория (опционально)
              </label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Все категории</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.label}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2">
                Счёт (опционально)
              </label>
              <select
                className="input"
                value={accountId || ''}
                onChange={(e) => setAccountId(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Все счета</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2">
                Тип (опционально)
              </label>
              <select
                className="input"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
              >
                <option value="">Все типы</option>
                <option value="income">Доходы</option>
                <option value="expense">Расходы</option>
              </select>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded">
            <input
              type="checkbox"
              id="confirm-delete"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500 mt-0.5"
            />
            <label htmlFor="confirm-delete" className="text-sm text-slate-700 dark:text-gray-200 font-medium cursor-pointer">
              Я понимаю, что это действие необратимо и транзакции будут удалены навсегда
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isDeleting}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!confirmed || isDeleting}
              className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isDeleting ? 'Удаление...' : 'Удалить транзакции'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
