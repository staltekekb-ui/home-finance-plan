import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBudgetsStatus,
  createBudget,
  updateBudget,
  deleteBudget,
  getCategories,
} from '../api/client';
import type { BudgetStatus, BudgetCreate, Category } from '../types';
import ProgressBar from '../components/ProgressBar';
import ConfirmModal from '../components/ConfirmModal';
import FormError from '../components/FormError';
import { validateRequired, validatePositiveNumber, validatePercentage, hasErrors, ValidationErrors } from '../utils/validation';

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetStatus | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<{text: string; emoji: string} | null>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets-status'],
    queryFn: () => getBudgetsStatus(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const usedCategories = budgets.map(b => b.category);
  const availableCategories = categories.filter(c => !usedCategories.includes(c.label));

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setShowForm(false);

      const encouragements = [
        { text: 'Отлично! Бюджет создан! Теперь расходы под контролем! 💪', emoji: '📊' },
        { text: 'Прекрасно! Планирование бюджета — ключ к финансовой свободе! ✨', emoji: '🎯' },
        { text: 'Браво! Вы на пути к разумному управлению деньгами! 🎉', emoji: '💼' },
        { text: 'Супер! Следите за лимитами и достигайте целей! 🚀', emoji: '📈' },
      ];
      const random = encouragements[Math.floor(Math.random() * encouragements.length)];
      setSuccessMessage(random);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BudgetCreate> }) =>
      updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setEditingBudget(null);

      const encouragements = [
        { text: 'Бюджет обновлён! Продолжайте контролировать расходы! 👍', emoji: '✅' },
        { text: 'Изменения сохранены! Вы мудро управляете деньгами! 💡', emoji: '🎯' },
      ];
      const random = encouragements[Math.floor(Math.random() * encouragements.length)];
      setSuccessMessage(random);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setDeleteTarget(null);
    },
  });

  const totalLimit = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-50">Бюджеты</h1>
        <button
          onClick={() => setShowForm(true)}
          disabled={availableCategories.length === 0}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Добавить
        </button>
      </div>

      {successMessage && (
        <div className="card p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500 animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{successMessage.emoji}</div>
            <p className="text-green-800 dark:text-green-200 font-medium flex-1">
              {successMessage.text}
            </p>
          </div>
        </div>
      )}

      {budgets.length > 0 && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-600 dark:text-gray-300 font-medium">Общий бюджет</span>
            <span className="font-bold text-slate-700 dark:text-gray-50">
              {totalSpent.toLocaleString('ru-RU')} / {totalLimit.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <ProgressBar
            percentage={(totalSpent / totalLimit) * 100}
            color={totalSpent > totalLimit ? 'danger' : totalSpent > totalLimit * 0.8 ? 'warning' : 'sage'}
            showLabel={false}
            variant="semicircle"
          />
        </div>
      )}

      {(showForm || editingBudget) && (
        <BudgetForm
          categories={editingBudget ? categories : availableCategories}
          initialData={editingBudget}
          onSubmit={(data) => {
            if (editingBudget) {
              updateMutation.mutate({ id: editingBudget.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingBudget(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Нет бюджетов. Создайте первый!
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={() => setEditingBudget(budget)}
              onDelete={() => setDeleteTarget(budget.id)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Удалить бюджет?"
        message="Эта операция необратима."
        confirmText="Удалить"
        danger
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface BudgetCardProps {
  budget: BudgetStatus;
  onEdit: () => void;
  onDelete: () => void;
}

function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const getColor = () => {
    if (budget.percentage >= 100) return 'danger';
    if (budget.is_over_threshold) return 'warning';
    return 'sage';
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700 dark:text-gray-50 text-lg">{budget.category}</span>
          {budget.is_over_threshold && (
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              budget.percentage >= 100 ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
            }`}>
              {budget.percentage >= 100 ? 'Превышен' : 'Внимание'}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="text-slate-500 dark:text-gray-300 hover:text-sage-600 dark:hover:text-sage-400 text-sm font-medium transition-colors"
          >
            Изменить
          </button>
          <button
            onClick={onDelete}
            className="text-slate-500 dark:text-gray-300 hover:text-danger text-sm font-medium transition-colors"
          >
            Удалить
          </button>
        </div>
      </div>
      <div className="flex justify-between text-sm text-slate-600 dark:text-gray-300 mb-3 font-medium">
        <span>Потрачено: {budget.spent.toLocaleString('ru-RU')} ₽</span>
        <span>Лимит: {budget.monthly_limit.toLocaleString('ru-RU')} ₽</span>
      </div>
      <ProgressBar percentage={budget.percentage} color={getColor()} />
      <div className="text-sm text-gray-500 mt-1">
        Осталось: {budget.remaining.toLocaleString('ru-RU')} ₽
      </div>
    </div>
  );
}

interface FormProps {
  categories: Category[];
  initialData: BudgetStatus | null;
  onSubmit: (data: BudgetCreate) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function BudgetForm({ categories, initialData, onSubmit, onCancel, isLoading }: FormProps) {
  const [category, setCategory] = useState(initialData?.category || '');
  const [monthlyLimit, setMonthlyLimit] = useState(initialData?.monthly_limit.toString() || '');
  const [alertThreshold, setAlertThreshold] = useState(
    ((initialData?.alert_threshold || 0.8) * 100).toString()
  );
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (): ValidationErrors => {
    return {
      category: initialData ? undefined : validateRequired(category, 'Категория'),
      monthlyLimit: validatePositiveNumber(monthlyLimit, 'Лимит'),
      alertThreshold: validatePercentage(alertThreshold),
    };
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const newErrors = validate();
    setErrors(newErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({ category: true, monthlyLimit: true, alertThreshold: true });

    if (hasErrors(validationErrors)) {
      return;
    }

    onSubmit({
      category,
      monthly_limit: parseFloat(monthlyLimit),
      alert_threshold: parseFloat(alertThreshold) / 100,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-medium text-slate-700 dark:text-gray-50">
        {initialData ? 'Редактировать бюджет' : 'Новый бюджет'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Категория *</label>
          <select
            className={`input ${touched.category && errors.category ? 'input-error' : ''}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onBlur={() => handleBlur('category')}
            disabled={!!initialData}
          >
            <option value="">Выберите категорию</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.label}>
                {cat.label}
              </option>
            ))}
          </select>
          {touched.category && <FormError message={errors.category} />}
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Месячный лимит *</label>
          <input
            type="number"
            className={`input ${touched.monthlyLimit && errors.monthlyLimit ? 'input-error' : ''}`}
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            onBlur={() => handleBlur('monthlyLimit')}
            placeholder="10000"
          />
          {touched.monthlyLimit && <FormError message={errors.monthlyLimit} />}
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Порог предупреждения (%)</label>
          <input
            type="number"
            className={`input ${touched.alertThreshold && errors.alertThreshold ? 'input-error' : ''}`}
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
            onBlur={() => handleBlur('alertThreshold')}
            placeholder="80"
          />
          {touched.alertThreshold && <FormError message={errors.alertThreshold} />}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
