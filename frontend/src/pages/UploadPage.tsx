import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadScreenshot, uploadScreenshotBatch, createTransaction, getCategories, getTransactions, getAccounts, getSavingsGoals, addToSavingsGoal, subtractFromSavingsGoal } from '../api/client';
import type { ParsedTransaction, TransactionCreate } from '../types';
import UploadForm, { type UploadFormRef } from '../components/UploadForm';
import ManualEntryForm from '../components/ManualEntryForm';
import EditParsedTransactionModal from '../components/EditParsedTransactionModal';
import SavingsDistributionModal from '../components/SavingsDistributionModal';
import ExpenseDeductionModal from '../components/ExpenseDeductionModal';

type TabType = 'screenshot' | 'manual';

export default function UploadPage() {
  const queryClient = useQueryClient();
  const uploadFormRef = useRef<UploadFormRef>(null);
  const [activeTab, setActiveTab] = useState<TabType>('screenshot');
  const [batchResults, setBatchResults] = useState<Array<{ data: ParsedTransaction; saved: boolean }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [showExpenseDeduction, setShowExpenseDeduction] = useState(false);
  const [availableForSavings, setAvailableForSavings] = useState(0);
  const [totalExpensesForDeduction, setTotalExpensesForDeduction] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(true),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });

  const { data: savingsGoals = [] } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => getSavingsGoals(false),
  });

  // Auto-select first active account
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);

  // Set default account when accounts load
  useState(() => {
    if (accounts.length > 0 && selectedAccountId === undefined) {
      setSelectedAccountId(accounts[0].id);
    }
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


  const handleUpload = (file: File) => {
    setBatchResults([]);
    uploadMutation.mutate(file);
  };

  const handleBatchUpload = (files: File[]) => {
    setBatchResults([]);
    batchUploadMutation.mutate(files);
  };

  const handleSaveBatchItem = (index: number, data: ParsedTransaction) => {
    createTransaction({
      amount: data.amount,
      description: data.description,
      category: data.category || undefined,
      transaction_type: data.transaction_type,
      date: data.date,
      raw_text: data.raw_text,
    }, selectedAccountId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      setBatchResults(prev => prev.map((r, i) => i === index ? { ...r, saved: true } : r));
    });
  };

  const handleManualSave = (data: TransactionCreate) => {
    createTransaction(data, selectedAccountId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
    });
  };

  const handleSaveAll = async () => {
    const unsavedTransactions = batchResults.filter(r => !r.saved);

    for (const result of unsavedTransactions) {
      await createTransaction({
        amount: result.data.amount,
        description: result.data.description,
        category: result.data.category || undefined,
        transaction_type: result.data.transaction_type,
        date: result.data.date,
        raw_text: result.data.raw_text,
      }, selectedAccountId);
    }

    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['budgets-status'] });

    // Calculate balance from all saved transactions
    const income = batchResults
      .filter(r => r.data.transaction_type === 'income')
      .reduce((sum, r) => sum + r.data.amount, 0);

    const expenses = batchResults
      .filter(r => r.data.transaction_type === 'expense')
      .reduce((sum, r) => sum + r.data.amount, 0);

    const balance = income - expenses;

    setBatchResults([]);
    uploadFormRef.current?.clearFiles();
    setSuccessMessage(`Сохранено ${unsavedTransactions.length} транзакций`);
    setTimeout(() => setSuccessMessage(null), 3000);

    // Store balance for later use after expense deduction
    setPendingBalance(balance);

    // Show expense deduction modal first if there are expenses and goals with funds
    const goalsWithFunds = savingsGoals.filter(g => !g.is_completed && g.current_amount > 0);
    if (expenses > 0 && goalsWithFunds.length > 0) {
      setTotalExpensesForDeduction(expenses);
      setShowExpenseDeduction(true);
    } else if (balance > 0 && savingsGoals.length > 0) {
      // If no expenses to deduct, show distribution modal directly
      setAvailableForSavings(balance);
      setShowDistribution(true);
    }
  };

  const handleUpdateTransaction = (index: number, updatedData: ParsedTransaction) => {
    setBatchResults(prev => prev.map((r, i) =>
      i === index ? { ...r, data: updatedData } : r
    ));
    setEditingIndex(null);
  };

  const handleDistributeSavings = async (distributions: { goalId: number; amount: number }[]) => {
    try {
      for (const dist of distributions) {
        await addToSavingsGoal(dist.goalId, dist.amount);
      }
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setShowDistribution(false);
      setSuccessMessage(`Распределено ${distributions.reduce((sum, d) => sum + d.amount, 0).toLocaleString('ru-RU')} ₽ по целям`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to distribute savings:', error);
      alert('Ошибка при распределении средств');
    }
  };

  const handleExpenseDeduction = async (deductions: { goalId: number; amount: number }[]) => {
    try {
      for (const deduction of deductions) {
        await subtractFromSavingsGoal(deduction.goalId, deduction.amount);
      }
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setShowExpenseDeduction(false);

      const totalDeducted = deductions.reduce((sum, d) => sum + d.amount, 0);
      setSuccessMessage(`Списано ${totalDeducted.toLocaleString('ru-RU')} ₽ с целей`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // After expense deduction, show distribution modal if there's positive balance
      if (pendingBalance > 0 && savingsGoals.length > 0) {
        setAvailableForSavings(pendingBalance);
        setShowDistribution(true);
      }
    } catch (error: any) {
      console.error('Failed to deduct expenses:', error);
      alert(`Ошибка при списании: ${error.message || 'Неизвестная ошибка'}`);
    }
  };

  const handleSkipExpenseDeduction = () => {
    setShowExpenseDeduction(false);
    // After skipping expense deduction, show distribution modal if there's positive balance
    if (pendingBalance > 0 && savingsGoals.length > 0) {
      setAvailableForSavings(pendingBalance);
      setShowDistribution(true);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-50">Добавить транзакцию</h1>

      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-500 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

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
          {accounts.length > 0 && (
            <div className="card p-4">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                Счёт для зачисления/списания
              </label>
              <select
                className="input"
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Без привязки к счёту</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.balance.toLocaleString('ru-RU')} {account.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          <UploadForm
            ref={uploadFormRef}
            onUpload={handleUpload}
            onUploadMultiple={handleBatchUpload}
            isLoading={uploadMutation.isPending || batchUploadMutation.isPending}
            error={uploadMutation.isError ? uploadMutation.error.message : batchUploadMutation.isError ? batchUploadMutation.error.message : null}
          />

          {batchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-slate-700 dark:text-gray-50">
                  Распознанные транзакции ({batchResults.filter(r => !r.saved).length} осталось)
                </h2>
                {batchResults.some(r => !r.saved) && (
                  <button
                    onClick={handleSaveAll}
                    className="btn-primary"
                  >
                    Сохранить все
                  </button>
                )}
              </div>
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
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${
                        result.data.transaction_type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {result.data.transaction_type === 'income' ? '+' : '-'}{result.data.amount.toLocaleString('ru-RU')} ₽
                      </span>
                      {result.saved ? (
                        <span className="text-green-600 dark:text-green-400 text-sm">Сохранено</span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingIndex(index)}
                            className="text-sm text-slate-600 dark:text-gray-300 hover:text-sage-600 dark:hover:text-sage-400 px-3 py-1 border border-slate-300 dark:border-dark-50/30 rounded"
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => handleSaveBatchItem(index, result.data)}
                            className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                          >
                            Сохранить
                          </button>
                        </div>
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
          isSaving={false}
        />
      )}

      <EditParsedTransactionModal
        isOpen={editingIndex !== null}
        transaction={editingIndex !== null ? batchResults[editingIndex]?.data : null}
        categories={categories}
        onSave={(data) => editingIndex !== null && handleUpdateTransaction(editingIndex, data)}
        onCancel={() => setEditingIndex(null)}
      />

      <ExpenseDeductionModal
        isOpen={showExpenseDeduction}
        totalExpenses={totalExpensesForDeduction}
        goals={savingsGoals}
        onDeduct={handleExpenseDeduction}
        onSkip={handleSkipExpenseDeduction}
      />

      <SavingsDistributionModal
        isOpen={showDistribution}
        availableAmount={availableForSavings}
        goals={savingsGoals}
        onDistribute={handleDistributeSavings}
        onSkip={() => setShowDistribution(false)}
      />
    </div>
  );
}
