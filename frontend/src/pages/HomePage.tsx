import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, getCategories, getAccounts, deleteTransaction, updateTransaction, exportToExcel, createRecurringFromTransaction, bulkDeleteTransactions } from '../api/client';
import type { Transaction, TransactionFilters } from '../types';
import TransactionList from '../components/TransactionList';
import ConfirmModal from '../components/ConfirmModal';
import EditTransactionModal from '../components/EditTransactionModal';
import BulkDeleteModal from '../components/BulkDeleteModal';
import HintCard from '../components/HintCard';

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDeleteSelected, setShowDeleteSelected] = useState(false);

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

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(true),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      setDeleteTarget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTransaction>[1] }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
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

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteTransactions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      setShowBulkDelete(false);
      setShowDeleteSelected(false);
      setSelectedIds(new Set());
      setSelectionMode(false);
      alert(`Удалено транзакций: ${data.deleted_count}`);
    },
    onError: (error: Error) => {
      console.error('Failed to bulk delete:', error);
      alert(`Ошибка удаления: ${error.message}`);
    },
  });

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const handleBulkDelete = (params: any) => {
    bulkDeleteMutation.mutate(params);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    bulkDeleteMutation.mutate({ transaction_ids: Array.from(selectedIds) });
  };

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
        <div className="flex flex-wrap gap-3">
          <button
            className="text-sm text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300 font-medium"
            onClick={() => setFilters({})}
          >
            Сбросить фильтры
          </button>
          <button
            className="text-sm bg-green-600 dark:bg-green-500 text-white px-3 py-1 rounded hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
          >
            {exporting ? 'Экспорт...' : 'Экспорт в Excel'}
          </button>
          <button
            className="text-sm bg-orange-600 dark:bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowBulkDelete(true)}
            disabled={transactions.length === 0}
          >
            Массовое удаление
          </button>
          <button
            className={`text-sm px-3 py-1 rounded transition-colors ${
              selectionMode
                ? 'bg-sage-600 dark:bg-sage-500 text-white hover:bg-sage-700 dark:hover:bg-sage-600'
                : 'bg-gray-600 dark:bg-gray-500 text-white hover:bg-gray-700 dark:hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedIds(new Set());
              }
            }}
            disabled={transactions.length === 0}
          >
            {selectionMode ? 'Отменить выбор' : 'Выбрать транзакции'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-300">Загрузка...</div>
      ) : transactions.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500 dark:text-gray-300">
            Нет транзакций. Загрузите первый скриншот!
          </div>
          <HintCard
            icon="📸"
            title="Начните с добавления транзакций"
            message="Загрузите скриншот из банковского приложения или PDF выгрузку, и система автоматически распознает все транзакции. Можно также добавить вручную!"
            actionText="Добавить транзакцию"
            onAction={() => navigate('/upload')}
            variant="info"
          />
        </div>
      ) : (
        <>
          {selectionMode && (
            <div className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 dark:text-gray-300">
                    Выбrano: <span className="font-bold">{selectedIds.size}</span> из {transactions.length}
                  </span>
                  <button
                    className="text-sm text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300 font-medium"
                    onClick={handleSelectAll}
                  >
                    {selectedIds.size === transactions.length ? 'Снять выбор' : 'Выбрать все'}
                  </button>
                </div>
                <button
                  className="text-sm bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  onClick={() => setShowDeleteSelected(true)}
                  disabled={selectedIds.size === 0}
                >
                  Удалить выбранные ({selectedIds.size})
                </button>
              </div>
            </div>
          )}
          <TransactionList
            transactions={transactions}
            onDelete={(id) => setDeleteTarget(id)}
            onEdit={(transaction) => setEditTarget(transaction)}
            onRepeat={(transaction) => repeatMutation.mutate(transaction.id)}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            selectionMode={selectionMode}
          />
        </>
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

      <BulkDeleteModal
        isOpen={showBulkDelete}
        categories={categories}
        accounts={accounts}
        onDelete={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
        isDeleting={bulkDeleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={showDeleteSelected}
        title={`Удалить выбранные транзакции?`}
        message={`Вы собираетесь удалить ${selectedIds.size} транзакций. Эта операция необратима.`}
        confirmText="Удалить"
        cancelText="Отмена"
        danger
        onConfirm={handleDeleteSelected}
        onCancel={() => setShowDeleteSelected(false)}
      />
    </div>
  );
}
