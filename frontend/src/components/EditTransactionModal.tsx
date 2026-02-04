import { useState, useEffect } from 'react';
import type { Transaction, Category } from '../types';

interface Props {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onSave: (id: number, data: { amount?: number; description?: string; category?: string; date?: string }) => void;
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
  const [date, setDate] = useState('');

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setDescription(transaction.description);
      setCategory(transaction.category || '');
      setDate(transaction.date);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(transaction.id, {
      amount: parseFloat(amount),
      description,
      category: category || undefined,
      date,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Редактировать транзакцию</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Сумма</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Описание</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
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
            <label className="block text-sm text-gray-600 mb-1">Дата</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
