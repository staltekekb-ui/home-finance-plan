import { useState, useMemo } from 'react';
import type { Category, TransactionCreate } from '../types';

interface Props {
  categories: Category[];
  recentDescriptions: string[];
  onSave: (data: TransactionCreate) => void;
  isSaving: boolean;
}

export default function ManualEntryForm({ categories, recentDescriptions, onSave, isSaving }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!description || description.length < 2) return [];
    const lower = description.toLowerCase();
    return recentDescriptions
      .filter(d => d.toLowerCase().includes(lower))
      .slice(0, 5);
  }, [description, recentDescriptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !date) return;

    onSave({
      amount: parseFloat(amount),
      description,
      category: category || undefined,
      date,
    });

    setAmount('');
    setDescription('');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const selectSuggestion = (text: string) => {
    setDescription(text);
    setShowSuggestions(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm space-y-4">
      <h2 className="text-lg font-medium">Добавить вручную</h2>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Сумма *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border rounded px-3 py-2"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="relative">
        <label className="block text-sm text-gray-600 mb-1">Описание *</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          placeholder="Например: Магнит, продукты"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          required
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded-b shadow-lg mt-0">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onMouseDown={() => selectSuggestion(s)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
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
        <label className="block text-sm text-gray-600 mb-1">Дата *</label>
        <input
          type="date"
          className="w-full border rounded px-3 py-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSaving || !amount || !description || !date}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {isSaving ? 'Сохранение...' : 'Сохранить транзакцию'}
      </button>
    </form>
  );
}
