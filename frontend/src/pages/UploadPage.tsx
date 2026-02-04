import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadScreenshot, uploadScreenshotBatch, createTransaction, getCategories, getTransactions } from '../api/client';
import type { ParsedTransaction, TransactionCreate } from '../types';
import UploadForm from '../components/UploadForm';
import ManualEntryForm from '../components/ManualEntryForm';

type TabType = 'screenshot' | 'manual';

export default function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('screenshot');
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [batchResults, setBatchResults] = useState<Array<{ data: ParsedTransaction; saved: boolean }>>([]);
  const [form, setForm] = useState<Partial<TransactionCreate>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });

  const recentDescriptions = [...new Set(transactions.map(t => t.description))].slice(0, 50);

  const uploadMutation = useMutation({
    mutationFn: uploadScreenshot,
    onSuccess: (data) => {
      setParsed(data);
      setBatchResults([]);
      setForm({
        amount: data.amount,
        description: data.description,
        category: data.category || undefined,
        date: data.date,
        raw_text: data.raw_text,
      });
    },
  });

  const batchUploadMutation = useMutation({
    mutationFn: uploadScreenshotBatch,
    onSuccess: (data) => {
      setParsed(null);
      const successResults = data.results
        .filter(r => r.success && r.data)
        .map(r => ({ data: r.data!, saved: false }));
      setBatchResults(successResults);
    },
  });

  const saveMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSaveError(null);
      if (batchResults.length === 0) {
        navigate('/transactions');
      }
    },
    onError: (error: Error) => {
      setSaveError(error.message);
    },
  });

  const handleUpload = (file: File) => {
    setParsed(null);
    setBatchResults([]);
    setForm({});
    setSaveError(null);
    uploadMutation.mutate(file);
  };

  const handleBatchUpload = (files: File[]) => {
    setParsed(null);
    setBatchResults([]);
    setForm({});
    setSaveError(null);
    batchUploadMutation.mutate(files);
  };

  const handleSave = () => {
    setSaveError(null);
    if (!form.amount || !form.description || !form.date) {
      setSaveError('Заполните все обязательные поля');
      return;
    }
    if (form.amount <= 0) {
      setSaveError('Сумма должна быть больше нуля');
      return;
    }
    saveMutation.mutate(form as TransactionCreate);
  };

  const handleSaveBatchItem = (index: number, data: ParsedTransaction) => {
    saveMutation.mutate({
      amount: data.amount,
      description: data.description,
      category: data.category || undefined,
      date: data.date,
      raw_text: data.raw_text,
    }, {
      onSuccess: () => {
        setBatchResults(prev => prev.map((r, i) => i === index ? { ...r, saved: true } : r));
      }
    });
  };

  const handleManualSave = (data: TransactionCreate) => {
    setSaveError(null);
    saveMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setSaveError(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Добавить транзакцию</h1>

      <div className="flex border-b">
        <button
          className={`px-4 py-2 -mb-px ${
            activeTab === 'screenshot'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('screenshot')}
        >
          Из скриншота
        </button>
        <button
          className={`px-4 py-2 -mb-px ${
            activeTab === 'manual'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('manual')}
        >
          Вручную
        </button>
      </div>

      {activeTab === 'screenshot' && (
        <>
          <UploadForm
            onUpload={handleUpload}
            onUploadMultiple={handleBatchUpload}
            isLoading={uploadMutation.isPending || batchUploadMutation.isPending}
            error={uploadMutation.isError ? uploadMutation.error.message : batchUploadMutation.isError ? batchUploadMutation.error.message : null}
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

                {saveError && (
                  <div className="text-red-600 text-sm mt-2">
                    Ошибка: {saveError}
                  </div>
                )}
              </div>
            </div>
          )}

          {batchResults.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Распознанные транзакции ({batchResults.filter(r => !r.saved).length} осталось)</h2>
              {batchResults.map((result, index) => (
                <div
                  key={index}
                  className={`bg-white p-4 rounded-lg shadow-sm ${result.saved ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{result.data.description}</div>
                      <div className="text-sm text-gray-500">
                        {result.data.date} • {result.data.category || 'Без категории'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-red-600">
                        -{result.data.amount.toLocaleString('ru-RU')} ₽
                      </span>
                      {result.saved ? (
                        <span className="text-green-600 text-sm">Сохранено</span>
                      ) : (
                        <button
                          onClick={() => handleSaveBatchItem(index, result.data)}
                          disabled={saveMutation.isPending}
                          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Сохранить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'manual' && (
        <ManualEntryForm
          categories={categories}
          recentDescriptions={recentDescriptions}
          onSave={handleManualSave}
          isSaving={saveMutation.isPending}
        />
      )}
    </div>
  );
}
