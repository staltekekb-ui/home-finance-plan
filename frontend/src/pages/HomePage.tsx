import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, getCategories, deleteTransaction, exportToExcel } from '../api/client';
import type { TransactionFilters } from '../types';
import TransactionList from '../components/TransactionList';

export default function HomePage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel(filters);
    } finally {
      setExporting(false);
    }
  };

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => getTransactions(filters),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Транзакции</h1>
        <div className="text-base sm:text-lg">
          Всего: <span className="font-bold text-red-600">{total.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <h2 className="font-medium text-gray-700">Фильтры</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">С даты</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={filters.date_from || ''}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">По дату</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={filters.date_to || ''}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Категория</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.category || ''}
              onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            >
              <option value="">Все категории</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.label}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => setFilters({})}
          >
            Сбросить фильтры
          </button>
          <button
            className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
          >
            {exporting ? 'Экспорт...' : 'Экспорт в Excel'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Нет транзакций. Загрузите первый скриншот!
        </div>
      ) : (
        <TransactionList
          transactions={transactions}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </div>
  );
}
