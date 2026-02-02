import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadScreenshot, createTransaction, getCategories } from '../api/client';
import type { ParsedTransaction, TransactionCreate } from '../types';
import UploadForm from '../components/UploadForm';

export default function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [form, setForm] = useState<Partial<TransactionCreate>>({});

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadScreenshot,
    onSuccess: (data) => {
      setParsed(data);
      setForm({
        amount: data.amount,
        description: data.description,
        category: data.category || undefined,
        date: data.date,
        raw_text: data.raw_text,
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate('/');
    },
  });

  const handleUpload = (file: File) => {
    setParsed(null);
    setForm({});
    uploadMutation.mutate(file);
  };

  const handleSave = () => {
    if (form.amount && form.description && form.date) {
      saveMutation.mutate(form as TransactionCreate);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Загрузить скриншот</h1>

      <UploadForm
        onUpload={handleUpload}
        isLoading={uploadMutation.isPending}
        error={uploadMutation.isError ? uploadMutation.error.message : null}
      />

      {parsed && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm space-y-4">
          <h2 className="text-lg font-medium">Проверьте данные</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Сумма</label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded px-3 py-2"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Описание</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Категория
                {parsed?.category && (
                  <span className="ml-2 text-xs text-green-600">(определено автоматически)</span>
                )}
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.category || ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Выберите категорию</option>
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
                value={form.date || ''}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Сохранение...' : 'Сохранить транзакцию'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
