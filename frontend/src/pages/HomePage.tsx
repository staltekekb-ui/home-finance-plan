import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, getCategories, deleteTransaction, updateTransaction, exportToExcel, createRecurringFromTransaction } from '../api/client';
import type { Transaction, TransactionFilters } from '../types';
import TransactionList from '../components/TransactionList';
import ConfirmModal from '../components/ConfirmModal';
import EditTransactionModal from '../components/EditTransactionModal';

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);

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
      setDeleteTarget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTransaction>[1] }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setEditTarget(null);
    },
    onError: (error: Error) => {
      console.error('Failed to update transaction:', error);
      alert(`Ошибка обновления: ${error.message}`);
    },
  });

  const repeatMutation = useMutation({
    mutationFn: (transactionId: number) => createRecurringFromTransaction(transactionId, 'monthly'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      navigate('/recurring');
    },
  });

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-50">Транзакции</h1>
        <div className="text-base sm:text-lg text-slate-700 dark:text-gray-50">
          Всего: <span className="font-bold text-red-600 dark:text-red-400">{total.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <h2 className="font-semibold text-slate-700 dark:text-gray-50">Фильтры и поиск</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Поиск</label>
            <input
              type="text"
              placeholder="Поиск по описанию..."
              className="input"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">С даты</label>
            <input
              type="date"
              className="input"
              value={filters.date_from || ''}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">По дату</label>
            <input
              type="date"
              className="input"
              value={filters.date_to || ''}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Категория</label>
            <select
              className="input"
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
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Сортировка</label>
            <select
              className="input"
              value={filters.sort_by || 'date'}
              onChange={(e) => setFilters({ ...filters, sort_by: e.target.value as 'date' | 'amount' | 'description' })}
            >
              <option value="date">По дате</option>
              <option value="amount">По сумме</option>
              <option value="description">По описанию</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Порядок</label>
            <select
              className="input"
              value={filters.sort_order || 'desc'}
              onChange={(e) => setFilters({ ...filters, sort_order: e.target.value as 'asc' | 'desc' })}
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
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
        <div className="text-center py-8 text-gray-500 dark:text-gray-300">Загрузка...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-300">
          Нет транзакций. Загрузите первый скриншот!
        </div>
      ) : (
        <TransactionList
          transactions={transactions}
          onDelete={(id) => setDeleteTarget(id)}
          onEdit={(transaction) => setEditTarget(transaction)}
          onRepeat={(transaction) => repeatMutation.mutate(transaction.id)}
        />
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Удалить транзакцию?"
        message="Эта операция необратима. Транзакция будет удалена навсегда."
        confirmText="Удалить"
        cancelText="Отмена"
        danger
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      <EditTransactionModal
        isOpen={editTarget !== null}
        transaction={editTarget}
        categories={categories}
        onSave={(id, data) => updateMutation.mutate({ id, data })}
        onCancel={() => setEditTarget(null)}
      />
    </div>
  );
}
