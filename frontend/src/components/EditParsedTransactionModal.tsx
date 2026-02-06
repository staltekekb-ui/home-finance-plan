import { useState, useEffect } from 'react';
import type { ParsedTransaction, Category } from '../types';

interface Props {
  isOpen: boolean;
  transaction: ParsedTransaction | null;
  categories: Category[];
  onSave: (data: ParsedTransaction) => void;
  onCancel: () => void;
}

export default function EditParsedTransactionModal({
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

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setDescription(transaction.description);
      setCategory(transaction.category || '');
      setTransactionType(transaction.transaction_type);
      setDate(transaction.date);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      amount: parseFloat(amount),
      description,
      category: category || null,
      transaction_type: transactionType,
      date,
      raw_text: transaction.raw_text,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="fixed inset-0" onClick={onCancel} />
      <div className="modal-content p-6">
        <h3 className="text-xl font-bold text-slate-700 dark:text-gray-50 mb-4">Редактировать транзакцию</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Сумма *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Описание *</label>
            <input
              type="text"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
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
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
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
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
