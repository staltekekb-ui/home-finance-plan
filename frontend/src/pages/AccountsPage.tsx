import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getTotalBalance,
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
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(false),
  });

  const { data: totalBalance } = useQuery({
    queryKey: ['total-balance'],
    queryFn: getTotalBalance,
  });

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['total-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      setShowForm(false);
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

      {totalBalance && (
        <div className="card p-6">
          <div className="text-sm text-slate-600 dark:text-gray-300 mb-2 font-medium">Общий баланс</div>
          <div className="text-3xl font-bold text-slate-700 dark:text-gray-50">
            {totalBalance.total.toLocaleString('ru-RU')} ₽
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
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${account.balance >= 0 ? 'text-sage-600 dark:text-sage-400' : 'text-danger'}`}>
              {account.balance.toLocaleString('ru-RU')} {account.currency}
            </div>
          </div>
        </div>
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
            onChange={(e) => setAccountType(e.target.value as 'cash' | 'card' | 'savings')}
          >
            <option value="card">Карта</option>
            <option value="cash">Наличные</option>
            <option value="savings">Накопительный</option>
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
            <label htmlFor="isActive" className="text-sm text-slate-600 font-medium">Активен</label>
          </div>
        )}
      </div>

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
