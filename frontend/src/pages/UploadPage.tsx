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
  const [batchResults, setBatchResults] = useState<Array<{ data: ParsedTransaction; saved: boolean }>>([]);

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
    onSuccess: (transactions) => {
      // Convert array of transactions to batch results format
      const results = transactions.map(transaction => ({
        data: transaction,
        saved: false,
      }));
      setBatchResults(results);
    },
  });

  const batchUploadMutation = useMutation({
    mutationFn: uploadScreenshotBatch,
    onSuccess: (data) => {
      // Flatten all transactions from all files
      const successResults = data.results
        .filter(r => r.success && r.data && r.data.length > 0)
        .flatMap(r => r.data!.map(transaction => ({
          data: transaction,
          saved: false,
        })));
      setBatchResults(successResults);
    },
  });

  const saveMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (batchResults.length === 0) {
        navigate('/transactions');
      }
    },
  });

  const handleUpload = (file: File) => {
    setBatchResults([]);
    uploadMutation.mutate(file);
  };

  const handleBatchUpload = (files: File[]) => {
    setBatchResults([]);
    batchUploadMutation.mutate(files);
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
    saveMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-50">Добавить транзакцию</h1>

      <div className="flex border-b border-gray-200 dark:border-dark-50/30">
        <button
          className={`px-4 py-2 -mb-px ${
            activeTab === 'screenshot'
              ? 'border-b-2 border-sage-600 text-sage-600 dark:border-sage-400 dark:text-sage-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'
          }`}
          onClick={() => setActiveTab('screenshot')}
        >
          Из скриншота
        </button>
        <button
          className={`px-4 py-2 -mb-px ${
            activeTab === 'manual'
              ? 'border-b-2 border-sage-600 text-sage-600 dark:border-sage-400 dark:text-sage-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'
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

          {batchResults.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-slate-700 dark:text-gray-50">Распознанные транзакции ({batchResults.filter(r => !r.saved).length} осталось)</h2>
              {batchResults.map((result, index) => (
                <div
                  key={index}
                  className={`card p-4 ${result.saved ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-700 dark:text-gray-50">{result.data.description}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {result.data.date} • {result.data.category || 'Без категории'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        -{result.data.amount.toLocaleString('ru-RU')} ₽
                      </span>
                      {result.saved ? (
                        <span className="text-green-600 dark:text-green-400 text-sm">Сохранено</span>
                      ) : (
                        <button
                          onClick={() => handleSaveBatchItem(index, result.data)}
                          disabled={saveMutation.isPending}
                          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50"
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
