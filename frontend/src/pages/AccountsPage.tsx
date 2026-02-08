import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getTotalBalance,
  getSavingsGoals,
} from '../api/client';
import type { Account, AccountCreate } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import FormError from '../components/FormError';
import HintCard from '../components/HintCard';
import { validateRequired, hasErrors, ValidationErrors } from '../utils/validation';

const accountTypeLabels: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  savings: 'Накопительный',
  credit_card: 'Кредитная карта',
};

const accountColors = [
  { value: 'blue', label: 'Синий', class: 'bg-blue-500' },
  { value: 'green', label: 'Зелёный', class: 'bg-green-500' },
  { value: 'red', label: 'Красный', class: 'bg-red-500' },
  { value: 'yellow', label: 'Жёлтый', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Фиолетовый', class: 'bg-purple-500' },
  { value: 'pink', label: 'Розовый', class: 'bg-pink-500' },
  { value: 'gray', label: 'Серый', class: 'bg-gray-500' },
];

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<{text: string; emoji: string; showGoalsHint?: boolean} | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(false),
  });

  const { data: totalBalance } = useQuery({
    queryKey: ['total-balance'],
    queryFn: getTotalBalance,
  });

  const { data: savingsGoals = [] } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => getSavingsGoals(false),
  });

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['total-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setShowForm(false);

      // Show success message with encouragement
      const wasFirstAccount = accounts.length === 0;
      const encouragements = [
        { text: 'Отлично! Счёт успешно создан! 🎉', emoji: '💳' },
        { text: 'Прекрасно! Теперь баланс будет автоматически отслеживаться! ✨', emoji: '📊' },
        { text: 'Супер! Вы на верном пути к контролю финансов! 💪', emoji: '🎯' },
      ];
      const random = encouragements[Math.floor(Math.random() * encouragements.length)];
      setSuccessMessage({
        ...random,
        showGoalsHint: wasFirstAccount && savingsGoals.length === 0
      });
      setTimeout(() => setSuccessMessage(null), 8000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AccountCreate> }) =>
      updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['total-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setEditingAccount(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['total-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setDeleteTarget(null);
    },
  });

  const activeAccounts = accounts.filter(a => a.is_active);
  const inactiveAccounts = accounts.filter(a => !a.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-50">Счета</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Добавить
        </button>
      </div>

      {successMessage && (
        <div className="space-y-4">
          <div className="card p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{successMessage.emoji}</div>
              <p className="text-green-800 dark:text-green-200 font-medium flex-1">
                {successMessage.text}
              </p>
            </div>
          </div>
          {successMessage.showGoalsHint && (
            <HintCard
              icon="🎯"
              title="Следующий шаг — создайте цели накопления!"
              message="Теперь, когда у вас есть счёт, создайте финансовые цели! Приложение поможет вам систематически откладывать деньги и отслеживать прогресс достижения мечты."
              actionText="Создать первую цель"
              onAction={() => navigate('/goals')}
              variant="info"
            />
          )}
        </div>
      )}

      {totalBalance && (
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">💰 Деньги на счетах</div>
              <div className="text-3xl font-bold text-sage-600 dark:text-sage-400">
                {(totalBalance.debit_total || totalBalance.total).toLocaleString('ru-RU')} ₽
              </div>
            </div>
            {totalBalance.credit_debt && totalBalance.credit_debt > 0 && (
              <>
                <div>
                  <div className="text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">💳 Долги по кредиткам</div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {totalBalance.credit_debt.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">📊 Чистая позиция</div>
                  <div className={`text-3xl font-bold ${(totalBalance.net_position ?? 0) >= 0 ? 'text-sage-600 dark:text-sage-400' : 'text-red-600 dark:text-red-400'}`}>
                    {(totalBalance.net_position ?? 0).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(showForm || editingAccount) && (
        <AccountForm
          initialData={editingAccount}
          onSubmit={(data) => {
            if (editingAccount) {
              updateMutation.mutate({ id: editingAccount.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingAccount(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-300">Загрузка...</div>
      ) : activeAccounts.length === 0 && inactiveAccounts.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500 dark:text-gray-300">
            Нет счетов. Создайте первый!
          </div>
          <HintCard
            icon="💳"
            title="Начните с создания счёта"
            message="Счета помогают отслеживать деньги на разных картах и в наличных. Создайте счёт 'Основная карта' или 'Наличные' и начните учёт финансов!"
            variant="info"
          />
          <HintCard
            icon="📊"
            title="Зачем нужны счета?"
            message="Привязывая транзакции к счетам, вы всегда будете знать точный баланс каждой карты или кошелька. Баланс автоматически пересчитывается при добавлении доходов и расходов."
            variant="success"
          />
        </div>
      ) : (
        <>
          {activeAccounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={() => setEditingAccount(account)}
                  onDelete={() => setDeleteTarget(account.id)}
                />
              ))}
            </div>
          )}

          {inactiveAccounts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-gray-500">Неактивные</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={() => setEditingAccount(account)}
                    onDelete={() => setDeleteTarget(account.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Удалить счёт?"
        message="Если есть связанные транзакции, счёт будет деактивирован."
        confirmText="Удалить"
        danger
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface AccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
}

function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const colorClass = accountColors.find(c => c.value === account.color)?.class || 'bg-gray-500';
  const isCreditCard = account.account_type === 'credit_card';

  // Calculate credit card metrics
  const debt = isCreditCard && account.balance < 0 ? Math.abs(account.balance) : 0;
  const creditLimit = account.credit_limit || 0;
  const usagePercent = isCreditCard && creditLimit > 0 ? (debt / creditLimit) * 100 : 0;

  // Calculate days until payment due
  let daysUntilPayment: number | null = null;
  if (isCreditCard && account.payment_due_date) {
    const today = new Date();
    const dueDate = new Date(account.payment_due_date);
    daysUntilPayment = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className={`card overflow-hidden ${!account.is_active ? 'opacity-50' : ''}`}>
      <div className={`h-3 ${colorClass}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-700 dark:text-gray-50 text-lg">{account.name}</h3>
            <div className="text-sm text-slate-500 dark:text-gray-300 font-medium">
              {accountTypeLabels[account.account_type] || account.account_type}
            </div>
            {isCreditCard && account.card_last_digits && (
              <div className="text-xs text-slate-400 dark:text-gray-400 mt-1">
                **** {account.card_last_digits}
              </div>
            )}
          </div>
          <div className="text-right">
            {isCreditCard ? (
              <>
                <div className="text-sm text-slate-500 dark:text-gray-300 mb-1">Долг</div>
                <div className={`text-xl font-bold ${debt === 0 ? 'text-sage-600 dark:text-sage-400' : 'text-red-600 dark:text-red-400'}`}>
                  {debt.toLocaleString('ru-RU')} {account.currency}
                </div>
                {creditLimit > 0 && (
                  <div className="text-xs text-slate-400 dark:text-gray-400 mt-1">
                    из {creditLimit.toLocaleString('ru-RU')} {account.currency}
                  </div>
                )}
              </>
            ) : (
              <div className={`text-xl font-bold ${account.balance >= 0 ? 'text-sage-600 dark:text-sage-400' : 'text-danger'}`}>
                {account.balance.toLocaleString('ru-RU')} {account.currency}
              </div>
            )}
          </div>
        </div>

        {isCreditCard && creditLimit > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-gray-300">
              <span>Использовано</span>
              <span>{usagePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-sage-500'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {daysUntilPayment !== null && (
              <div className={`text-xs mt-2 ${
                daysUntilPayment < 0 ? 'text-red-600 dark:text-red-400 font-semibold' :
                daysUntilPayment <= 3 ? 'text-orange-600 dark:text-orange-400 font-medium' :
                'text-slate-600 dark:text-gray-300'
              }`}>
                {daysUntilPayment < 0 ? (
                  <>⚠️ Просрочен на {Math.abs(daysUntilPayment)} дн.</>
                ) : daysUntilPayment === 0 ? (
                  <>🔔 Платёж сегодня!</>
                ) : (
                  <>💳 Платёж через {daysUntilPayment} дн.</>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-cream-300 dark:border-dark-50/20">
          <button
            onClick={onEdit}
            className="text-slate-500 dark:text-gray-300 hover:text-sage-600 dark:hover:text-sage-400 text-sm font-medium transition-colors"
          >
            Изменить
          </button>
          <button
            onClick={onDelete}
            className="text-slate-500 dark:text-gray-300 hover:text-danger text-sm font-medium transition-colors"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

interface FormProps {
  initialData: Account | null;
  onSubmit: (data: AccountCreate) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function AccountForm({ initialData, onSubmit, onCancel, isLoading }: FormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [accountType, setAccountType] = useState(initialData?.account_type || 'card');
  const [balance, setBalance] = useState(initialData?.balance.toString() || '0');
  const [currency, setCurrency] = useState(initialData?.currency || 'RUB');
  const [color, setColor] = useState(initialData?.color || 'blue');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Credit card fields
  const [creditLimit, setCreditLimit] = useState(initialData?.credit_limit?.toString() || '');
  const [interestRate, setInterestRate] = useState(initialData?.interest_rate?.toString() || '');
  const [billingDay, setBillingDay] = useState(initialData?.billing_day?.toString() || '');
  const [gracePeriodDays, setGracePeriodDays] = useState(initialData?.grace_period_days?.toString() || '');
  const [minimumPaymentPercent, setMinimumPaymentPercent] = useState(initialData?.minimum_payment_percent?.toString() || '');
  const [lastStatementDate, setLastStatementDate] = useState(initialData?.last_statement_date || '');
  const [paymentDueDate, setPaymentDueDate] = useState(initialData?.payment_due_date || '');
  const [cardLastDigits, setCardLastDigits] = useState(initialData?.card_last_digits || '');
  const [cardKeywords, setCardKeywords] = useState(initialData?.card_keywords || '');

  const validate = (): ValidationErrors => {
    return {
      name: validateRequired(name, 'Название'),
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
    setTouched({ name: true });

    if (hasErrors(validationErrors)) {
      return;
    }

    const data: any = {
      name,
      account_type: accountType,
      balance: parseFloat(balance || '0'),
      currency,
      color,
    };
    if (initialData) {
      data.is_active = isActive;
    }

    // Add credit card fields if account type is credit_card
    if (accountType === 'credit_card') {
      if (creditLimit) data.credit_limit = parseFloat(creditLimit);
      if (interestRate) data.interest_rate = parseFloat(interestRate);
      if (billingDay) data.billing_day = parseInt(billingDay);
      if (gracePeriodDays) data.grace_period_days = parseInt(gracePeriodDays);
      if (minimumPaymentPercent) data.minimum_payment_percent = parseFloat(minimumPaymentPercent);
      if (lastStatementDate) data.last_statement_date = lastStatementDate;
      if (paymentDueDate) data.payment_due_date = paymentDueDate;
      if (cardLastDigits) data.card_last_digits = cardLastDigits;
      if (cardKeywords) data.card_keywords = cardKeywords;
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-6 animate-scale-in">
      <h2 className="text-xl font-bold text-slate-700 dark:text-gray-50">
        {initialData ? 'Редактировать счёт' : 'Новый счёт'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">Название *</label>
          <input
            type="text"
            className={`input ${touched.name && errors.name ? 'input-error' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="Например: Сбербанк"
          />
          {touched.name && <FormError message={errors.name} />}
        </div>
        <div>
          <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">Тип счёта *</label>
          <select
            className="input"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as 'cash' | 'card' | 'savings' | 'credit_card')}
          >
            <option value="card">Карта</option>
            <option value="cash">Наличные</option>
            <option value="savings">Накопительный</option>
            <option value="credit_card">Кредитная карта</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">Баланс</label>
          <input
            type="number"
            className="input"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">Валюта</label>
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">Цвет</label>
          <div className="flex gap-3">
            {accountColors.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`w-10 h-10 rounded-full ${c.class} transition-all duration-200 ${
                  color === c.value ? 'ring-4 ring-sage-500/30 scale-110' : 'hover:scale-105'
                }`}
                onClick={() => setColor(c.value)}
                title={c.label}
              />
            ))}
          </div>
        </div>
        {initialData && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-sage-600 rounded focus:ring-sage-500"
            />
            <label htmlFor="isActive" className="text-sm text-slate-600 dark:text-gray-300 font-medium">Активен</label>
          </div>
        )}
      </div>

      {accountType === 'credit_card' && (
        <div className="space-y-4 pt-4 border-t border-cream-300 dark:border-dark-50/20">
          <h3 className="font-semibold text-slate-700 dark:text-gray-50">Параметры кредитной карты</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Кредитный лимит</label>
              <input
                type="number"
                className="input"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="Например: 100000"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Процентная ставка (% годовых)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="Например: 19.9"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">День выставления счёта (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                className="input"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                placeholder="Например: 15"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Беспроцентный период (дней)</label>
              <input
                type="number"
                className="input"
                value={gracePeriodDays}
                onChange={(e) => setGracePeriodDays(e.target.value)}
                placeholder="Например: 55"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Минимальный платёж (%)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={minimumPaymentPercent}
                onChange={(e) => setMinimumPaymentPercent(e.target.value)}
                placeholder="Например: 5"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Последние 4 цифры карты</label>
              <input
                type="text"
                maxLength={4}
                className="input"
                value={cardLastDigits}
                onChange={(e) => setCardLastDigits(e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
              />
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Для автоматического определения транзакций</p>
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Дата последней выписки</label>
              <input
                type="date"
                className="input"
                value={lastStatementDate}
                onChange={(e) => setLastStatementDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Дата следующего платежа</label>
              <input
                type="date"
                className="input"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Ключевые слова для распознавания</label>
              <input
                type="text"
                className="input"
                value={cardKeywords}
                onChange={(e) => setCardKeywords(e.target.value)}
                placeholder="Например: Tinkoff, Кредитная, Credit"
              />
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Укажите слова через запятую для автоматического определения транзакций этой карты</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-cream-300">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
