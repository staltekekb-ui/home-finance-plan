import { useState, useEffect } from 'react';
import type { Transaction, Category } from '../types';
import FormError from './FormError';
import { validateAmount, validateRequired, validateDate, hasErrors, ValidationErrors } from '../utils/validation';

interface Props {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onSave: (id: number, data: { amount?: number; description?: string; category?: string; transaction_type?: 'income' | 'expense'; date?: string }) => void;
  onCancel: () => void;
}

export default function EditTransactionModal({
  isOpen,
  transaction,
  categories,
  onSave,
  onCancel,
}: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setDescription(transaction.description);
      setCategory(transaction.category || '');
      setTransactionType(transaction.transaction_type);
      setDate(transaction.date);
      setErrors({});
      setTouched({});
      setSaveError(null);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const validate = (): ValidationErrors => {
    return {
      amount: validateAmount(amount),
      description: validateRequired(description, 'Описание'),
      date: validateDate(date),
    };
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const newErrors = validate();
    setErrors(newErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({ amount: true, description: true, date: true });

    if (hasErrors(validationErrors)) {
      return;
    }

    try {
      onSave(transaction.id, {
        amount: parseFloat(amount),
        description,
        category: category || undefined,
        transaction_type: transactionType,
        date,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка сохранения');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-gray-50">Редактировать транзакцию</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Сумма *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={`input ${touched.amount && errors.amount ? 'input-error' : ''}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => handleBlur('amount')}
            />
            {touched.amount && <FormError message={errors.amount} />}
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Описание *</label>
            <input
              type="text"
              className={`input ${touched.description && errors.description ? 'input-error' : ''}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleBlur('description')}
            />
            {touched.description && <FormError message={errors.description} />}
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Тип операции *</label>
            <select
              className="input"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as 'income' | 'expense')}
            >
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Категория</label>
            <select
              className="input"
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
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Дата *</label>
            <input
              type="date"
              className={`input ${touched.date && errors.date ? 'input-error' : ''}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => handleBlur('date')}
            />
            {touched.date && <FormError message={errors.date} />}
          </div>
          {saveError && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              Ошибка: {saveError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border dark:border-dark-50/30 rounded"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
