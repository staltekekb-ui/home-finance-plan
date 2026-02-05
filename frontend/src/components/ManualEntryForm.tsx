import { useState, useMemo } from 'react';
import type { Category, TransactionCreate } from '../types';
import FormError from './FormError';
import { validateAmount, validateRequired, validateDate, hasErrors, ValidationErrors } from '../utils/validation';

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
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const suggestions = useMemo(() => {
    if (!description || description.length < 2) return [];
    const lower = description.toLowerCase();
    return recentDescriptions
      .filter(d => d.toLowerCase().includes(lower))
      .slice(0, 5);
  }, [description, recentDescriptions]);

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
    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({ amount: true, description: true, date: true });

    if (hasErrors(validationErrors)) {
      return;
    }

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
    setErrors({});
    setTouched({});
  };

  const selectSuggestion = (text: string) => {
    setDescription(text);
    setShowSuggestions(false);
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-50">Добавить вручную</h2>

      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Сумма *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          className={`input ${touched.amount && errors.amount ? 'input-error' : ''}`}
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => handleBlur('amount')}
        />
        {touched.amount && <FormError message={errors.amount} />}
      </div>

      <div className="relative">
        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Описание *</label>
        <input
          type="text"
          className={`input ${touched.description && errors.description ? 'input-error' : ''}`}
          placeholder="Например: Магнит, продукты"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
            handleBlur('description');
          }}
        />
        {touched.description && <FormError message={errors.description} />}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white dark:bg-dark-100 border dark:border-dark-50/30 rounded-b shadow-lg mt-0">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-50 cursor-pointer text-sm text-slate-700 dark:text-gray-50"
                onMouseDown={() => selectSuggestion(s)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
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

      <button
        type="submit"
        disabled={isSaving}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Сохранение...' : 'Сохранить транзакцию'}
      </button>
    </form>
  );
}
