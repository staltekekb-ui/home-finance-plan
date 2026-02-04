import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecurringPayments,
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
  executeRecurringPayment,
  getCategories,
} from '../api/client';
import type { RecurringPayment, RecurringPaymentCreate, Category } from '../types';
import RecurringPaymentCard from '../components/RecurringPaymentCard';
import ConfirmModal from '../components/ConfirmModal';
import FormError from '../components/FormError';
import { validateAmount, validateRequired, validateDate, validateDayOfMonth, hasErrors, ValidationErrors } from '../utils/validation';

export default function RecurringPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RecurringPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: () => getRecurringPayments(false),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createMutation = useMutation({
    mutationFn: createRecurringPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecurringPaymentCreate> }) =>
      updateRecurringPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      setEditingPayment(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecurringPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      setDeleteTarget(null);
    },
  });

  const executeMutation = useMutation({
    mutationFn: executeRecurringPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const activePayments = payments.filter(p => p.is_active);
  const inactivePayments = payments.filter(p => !p.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Повторяющиеся платежи</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Добавить
        </button>
      </div>

      {(showForm || editingPayment) && (
        <RecurringPaymentForm
          categories={categories}
          initialData={editingPayment}
          onSubmit={(data) => {
            if (editingPayment) {
              updateMutation.mutate({ id: editingPayment.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingPayment(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : activePayments.length === 0 && inactivePayments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Нет повторяющихся платежей
        </div>
      ) : (
        <>
          {activePayments.length > 0 && (
            <div className="space-y-3">
              {activePayments.map((payment) => (
                <RecurringPaymentCard
                  key={payment.id}
                  payment={payment}
                  onExecute={() => executeMutation.mutate(payment.id)}
                  onEdit={() => setEditingPayment(payment)}
                  onDelete={() => setDeleteTarget(payment.id)}
                />
              ))}
            </div>
          )}

          {inactivePayments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-gray-500">Неактивные</h2>
              {inactivePayments.map((payment) => (
                <RecurringPaymentCard
                  key={payment.id}
                  payment={payment}
                  onExecute={() => {}}
                  onEdit={() => setEditingPayment(payment)}
                  onDelete={() => setDeleteTarget(payment.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Удалить повторяющийся платёж?"
        message="Эта операция необратима."
        confirmText="Удалить"
        danger
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface FormProps {
  categories: Category[];
  initialData: RecurringPayment | null;
  onSubmit: (data: RecurringPaymentCreate) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function RecurringPaymentForm({ categories, initialData, onSubmit, onCancel, isLoading }: FormProps) {
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [frequency, setFrequency] = useState(initialData?.frequency || 'monthly');
  const [dayOfMonth, setDayOfMonth] = useState(initialData?.day_of_month?.toString() || '');
  const [nextDate, setNextDate] = useState(
    initialData?.next_date || new Date().toISOString().split('T')[0]
  );
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (): ValidationErrors => {
    return {
      amount: validateAmount(amount),
      description: validateRequired(description, 'Описание'),
      nextDate: validateDate(nextDate),
      dayOfMonth: frequency === 'monthly' ? validateDayOfMonth(dayOfMonth) : undefined,
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
    setTouched({ amount: true, description: true, nextDate: true, dayOfMonth: true });

    if (hasErrors(validationErrors)) {
      return;
    }

    const data: any = {
      amount: parseFloat(amount),
      description,
      category: category || undefined,
      frequency,
      next_date: nextDate,
    };
    if (frequency === 'monthly' && dayOfMonth) {
      data.day_of_month = parseInt(dayOfMonth);
    }
    if (initialData) {
      data.is_active = isActive;
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm space-y-4">
      <h2 className="text-lg font-medium">
        {initialData ? 'Редактировать платёж' : 'Новый повторяющийся платёж'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Сумма *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className={`w-full border rounded px-3 py-2 ${touched.amount && errors.amount ? 'border-red-500' : ''}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => handleBlur('amount')}
          />
          {touched.amount && <FormError message={errors.amount} />}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Описание *</label>
          <input
            type="text"
            className={`w-full border rounded px-3 py-2 ${touched.description && errors.description ? 'border-red-500' : ''}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => handleBlur('description')}
          />
          {touched.description && <FormError message={errors.description} />}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Категория</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Без категории</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.label}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Периодичность *</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
          >
            <option value="daily">Ежедневно</option>
            <option value="weekly">Еженедельно</option>
            <option value="monthly">Ежемесячно</option>
            <option value="yearly">Ежегодно</option>
          </select>
        </div>
        {frequency === 'monthly' && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">День месяца</label>
            <input
              type="number"
              min="1"
              max="31"
              className={`w-full border rounded px-3 py-2 ${touched.dayOfMonth && errors.dayOfMonth ? 'border-red-500' : ''}`}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              onBlur={() => handleBlur('dayOfMonth')}
              placeholder="1-31"
            />
            {touched.dayOfMonth && <FormError message={errors.dayOfMonth} />}
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Следующая дата *</label>
          <input
            type="date"
            className={`w-full border rounded px-3 py-2 ${touched.nextDate && errors.nextDate ? 'border-red-500' : ''}`}
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            onBlur={() => handleBlur('nextDate')}
          />
          {touched.nextDate && <FormError message={errors.nextDate} />}
        </div>
        {initialData && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="isActive" className="text-sm text-gray-600">Активен</label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
