import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { uploadScreenshot, uploadScreenshotBatch, createTransaction, getCategories, getTransactions, getAccounts, getSavingsGoals, addToSavingsGoal, subtractFromSavingsGoal, checkDuplicateTransactions } from '../api/client';
import type { ParsedTransaction, TransactionCreate } from '../types';
import UploadForm, { type UploadFormRef } from '../components/UploadForm';
import ManualEntryForm from '../components/ManualEntryForm';
import EditParsedTransactionModal from '../components/EditParsedTransactionModal';
import SavingsDistributionModal from '../components/SavingsDistributionModal';
import ExpenseDeductionModal from '../components/ExpenseDeductionModal';
import AccountSelectionModal from '../components/AccountSelectionModal';
import HintCard from '../components/HintCard';

type TabType = 'screenshot' | 'manual';

export default function UploadPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const uploadFormRef = useRef<UploadFormRef>(null);
  const [activeTab, setActiveTab] = useState<TabType>('screenshot');
  const [batchResults, setBatchResults] = useState<Array<{ data: ParsedTransaction; saved: boolean; isDuplicate?: boolean; duplicateInfo?: any }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [showExpenseDeduction, setShowExpenseDeduction] = useState(false);
  const [showAccountSelection, setShowAccountSelection] = useState(false);
  const [availableForSavings, setAvailableForSavings] = useState(0);
  const [totalExpensesForDeduction, setTotalExpensesForDeduction] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

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

  const recentDescriptions = [...new Set(transactions.map(t => t.description))].slice(0, 50);

  const uploadMutation = useMutation({
    mutationFn: uploadScreenshot,
    onSuccess: async (transactions) => {
      // Convert array of transactions to batch results format
      const results = transactions.map(transaction => ({
        data: transaction,
        saved: false,
      }));

      // Check for duplicates
      setCheckingDuplicates(true);
      try {
        const duplicateCheck = await checkDuplicateTransactions(
          transactions.map(t => ({
            amount: t.amount,
            description: t.description,
            category: t.category || undefined,
            transaction_type: t.transaction_type,
            date: t.date,
          }))
        );

        // Mark duplicates
        const resultsWithDuplicates = results.map((result, idx) => {
          const duplicate = duplicateCheck.duplicates.find(d => d.index === idx);
          if (duplicate) {
            return {
              ...result,
              isDuplicate: true,
              duplicateInfo: duplicate,
            };
          }
          return result;
        });

        setBatchResults(resultsWithDuplicates);
      } catch (error) {
        console.error('Failed to check duplicates:', error);
        setBatchResults(results);
      } finally {
        setCheckingDuplicates(false);
      }

      // Show account selection modal after parsing
      if (accounts.length > 0) {
        setShowAccountSelection(true);
      }
    },
  });

  const batchUploadMutation = useMutation({
    mutationFn: uploadScreenshotBatch,
    onSuccess: async (data) => {
      // Flatten all transactions from all files
      const successResults = data.results
        .filter(r => r.success && r.data && r.data.length > 0)
        .flatMap(r => r.data!.map(transaction => ({
          data: transaction,
          saved: false,
        })));

      // Check for duplicates
      setCheckingDuplicates(true);
      try {
        const allTransactions = successResults.map(r => ({
          amount: r.data.amount,
          description: r.data.description,
          category: r.data.category || undefined,
          transaction_type: r.data.transaction_type,
          date: r.data.date,
        }));

        const duplicateCheck = await checkDuplicateTransactions(allTransactions);

        // Mark duplicates
        const resultsWithDuplicates = successResults.map((result, idx) => {
          const duplicate = duplicateCheck.duplicates.find(d => d.index === idx);
          if (duplicate) {
            return {
              ...result,
              isDuplicate: true,
              duplicateInfo: duplicate,
            };
          }
          return result;
        });

        setBatchResults(resultsWithDuplicates);
      } catch (error) {
        console.error('Failed to check duplicates:', error);
        setBatchResults(successResults);
      } finally {
        setCheckingDuplicates(false);
      }

      // Show account selection modal after parsing
      if (accounts.length > 0) {
        setShowAccountSelection(true);
      }
    },
  });


  const handleUpload = (file: File) => {
    if (accounts.length === 0) {
      alert('Сначала добавьте счёт');
      return;
    }
    setBatchResults([]);
    setSelectedAccountId(undefined);
    uploadMutation.mutate(file);
  };

  const handleBatchUpload = (files: File[]) => {
    if (accounts.length === 0) {
      alert('Сначала добавьте счёт');
      return;
    }
    setBatchResults([]);
    setSelectedAccountId(undefined);
    batchUploadMutation.mutate(files);
  };

  const handleSaveBatchItem = (index: number, data: ParsedTransaction) => {
    if (!selectedAccountId) {
      alert('Выберите счёт для транзакции');
      setShowAccountSelection(true);
      return;
    }
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

      // Mark as saved and check if all transactions are now saved
      setBatchResults(prev => {
        const updated = prev.map((r, i) => i === index ? { ...r, saved: true } : r);
        const allSaved = updated.every(r => r.saved);

        // If all transactions are saved, clear the list
        if (allSaved) {
          setTimeout(() => {
            setBatchResults([]);
            uploadFormRef.current?.clearFiles();
            setSuccessMessage('Все транзакции успешно сохранены');
            setTimeout(() => setSuccessMessage(null), 3000);
          }, 500);
        }

        return updated;
      });
    });
  };

  const handleManualSave = (data: TransactionCreate) => {
    if (!selectedAccountId) {
      alert('Выберите счёт для транзакции');
      setShowAccountSelection(true);
      return;
    }
    createTransaction(data, selectedAccountId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      setSuccessMessage('Транзакция успешно добавлена');
      setTimeout(() => setSuccessMessage(null), 3000);
    });
  };

  const handleSaveAll = async () => {
    if (!selectedAccountId) {
      alert('Выберите счёт для транзакций');
      setShowAccountSelection(true);
      return;
    }

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

  const handleAccountSelect = (accountId: number) => {
    setSelectedAccountId(accountId);
    setShowAccountSelection(false);
  };

  const handleAccountSelectionCancel = () => {
    setShowAccountSelection(false);
    setBatchResults([]);
    uploadFormRef.current?.clearFiles();
  };

  const handleExcludeTransaction = (index: number) => {
    setBatchResults(prev => prev.filter((_, i) => i !== index));
  };

  const handleExcludeAllDuplicates = () => {
    setBatchResults(prev => prev.filter(r => !r.isDuplicate));
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
          {accounts.length === 0 && (
            <div className="space-y-4">
              <div className="card p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-700 dark:text-gray-50 mb-2">
                      Необходимо добавить счёт
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Прежде чем загружать транзакции, создайте хотя бы один счёт.
                      Все транзакции будут привязаны к счёту, и баланс будет автоматически пересчитан.
                    </p>
                    <button
                      onClick={() => navigate('/accounts')}
                      className="btn-primary"
                    >
                      Перейти к счетам
                    </button>
                  </div>
                </div>
              </div>

              {savingsGoals.length === 0 && (
                <HintCard
                  icon="🎯"
                  title="Создайте цели накопления"
                  message="После создания счёта, настройте цели накопления! Это поможет вам систематически откладывать деньги на важные покупки и следить за прогрессом достижения финансовых целей."
                  actionText="Перейти к целям"
                  onAction={() => navigate('/goals')}
                  variant="info"
                />
              )}
            </div>
          )}

          {accounts.length > 0 && selectedAccountId && (
            <div className="card p-4 bg-sage-50 dark:bg-sage-900/20">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Выбран счёт:
                </span>
                <span className="font-medium text-slate-700 dark:text-gray-50">
                  {accounts.find(a => a.id === selectedAccountId)?.name}
                </span>
                <button
                  onClick={() => setShowAccountSelection(true)}
                  className="text-sm text-sage-600 dark:text-sage-400 hover:underline ml-auto"
                >
                  Изменить
                </button>
              </div>
            </div>
          )}

          {accounts.length > 0 && (
            <UploadForm
              ref={uploadFormRef}
              onUpload={handleUpload}
              onUploadMultiple={handleBatchUpload}
              isLoading={uploadMutation.isPending || batchUploadMutation.isPending}
              error={uploadMutation.isError ? uploadMutation.error.message : batchUploadMutation.isError ? batchUploadMutation.error.message : null}
            />
          )}

          {batchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-slate-700 dark:text-gray-50">
                    Распознанные транзакции ({batchResults.filter(r => !r.saved).length} осталось)
                  </h2>
                  {batchResults.some(r => r.isDuplicate) && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                      ⚠️ Найдено {batchResults.filter(r => r.isDuplicate).length} возможных дубликатов
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {batchResults.some(r => r.isDuplicate && !r.saved) && (
                    <button
                      onClick={handleExcludeAllDuplicates}
                      className="px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
                    >
                      Исключить все дубликаты
                    </button>
                  )}
                  {batchResults.some(r => !r.saved) && (
                    <button
                      onClick={handleSaveAll}
                      className="btn-primary"
                    >
                      Сохранить все
                    </button>
                  )}
                </div>
              </div>
              {checkingDuplicates && (
                <div className="card p-4 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin text-2xl">🔄</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Проверка дубликатов транзакций...
                    </p>
                  </div>
                </div>
              )}
              {batchResults.map((result, index) => (
                <div
                  key={index}
                  className={`card p-4 ${result.saved ? 'opacity-50' : ''} ${result.isDuplicate ? 'border-l-4 border-orange-500 dark:border-orange-600' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-700 dark:text-gray-50">{result.data.description}</div>
                        {result.isDuplicate && !result.saved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                            ⚠️ Дубликат
                          </span>
                        )}
                      </div>
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
                          {result.isDuplicate && (
                            <button
                              onClick={() => handleExcludeTransaction(index)}
                              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 px-3 py-1 border border-orange-400 dark:border-orange-600 rounded"
                            >
                              Исключить
                            </button>
                          )}
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
        <>
          {accounts.length === 0 ? (
            <div className="space-y-4">
              <div className="card p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-700 dark:text-gray-50 mb-2">
                      Необходимо добавить счёт
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Прежде чем добавлять транзакции, создайте хотя бы один счёт.
                      Все транзакции будут привязаны к счёту, и баланс будет автоматически пересчитан.
                    </p>
                    <button
                      onClick={() => navigate('/accounts')}
                      className="btn-primary"
                    >
                      Перейти к счетам
                    </button>
                  </div>
                </div>
              </div>

              {savingsGoals.length === 0 && (
                <HintCard
                  icon="💡"
                  title="Совет: создайте цели накопления"
                  message="Финансовые цели помогают оставаться мотивированным и систематически откладывать средства. Установите цели, и приложение будет помогать вам распределять остатки по целям."
                  actionText="Создать цель"
                  onAction={() => navigate('/goals')}
                  variant="info"
                />
              )}
            </div>
          ) : (
            <>
              {!selectedAccountId && (
                <div className="card p-4 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Выберите счёт для привязки транзакции:
                  </p>
                  <button
                    onClick={() => setShowAccountSelection(true)}
                    className="btn-primary"
                  >
                    Выбрать счёт
                  </button>
                </div>
              )}
              {selectedAccountId && (
                <div className="card p-4 bg-sage-50 dark:bg-sage-900/20">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Выбран счёт:
                    </span>
                    <span className="font-medium text-slate-700 dark:text-gray-50">
                      {accounts.find(a => a.id === selectedAccountId)?.name}
                    </span>
                    <button
                      onClick={() => setShowAccountSelection(true)}
                      className="text-sm text-sage-600 dark:text-sage-400 hover:underline ml-auto"
                    >
                      Изменить
                    </button>
                  </div>
                </div>
              )}
              <ManualEntryForm
                categories={categories}
                recentDescriptions={recentDescriptions}
                onSave={handleManualSave}
                isSaving={false}
              />
            </>
          )}
        </>
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

      <AccountSelectionModal
        isOpen={showAccountSelection}
        accounts={accounts}
        onSelect={handleAccountSelect}
        onCancel={handleAccountSelectionCancel}
      />
    </div>
  );
}
