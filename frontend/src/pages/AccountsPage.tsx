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
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AccountCreate> }) =>
      updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['total-balance'] });
      setEditingAccount(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['total-balance'] });
      setDeleteTarget(null);
    },
  });

  const activeAccounts = accounts.filter(a => a.is_active);
  const inactiveAccounts = accounts.filter(a => !a.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Счета</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Добавить
        </button>
      </div>

      {totalBalance && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Общий баланс</div>
          <div className="text-2xl font-bold">
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
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : activeAccounts.length === 0 && inactiveAccounts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Нет счетов. Создайте первый!
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
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${!account.is_active ? 'opacity-50' : ''}`}>
      <div className={`h-2 ${colorClass}`} />
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{account.name}</h3>
            <div className="text-sm text-gray-500">
              {accountTypeLabels[account.account_type] || account.account_type}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {account.balance.toLocaleString('ru-RU')} {account.currency}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 text-sm">
            Изменить
          </button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-600 text-sm">
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
    <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm space-y-4">
      <h2 className="text-lg font-medium">
        {initialData ? 'Редактировать счёт' : 'Новый счёт'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Название *</label>
          <input
            type="text"
            className={`w-full border rounded px-3 py-2 ${touched.name && errors.name ? 'border-red-500' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="Например: Сбербанк"
          />
          {touched.name && <FormError message={errors.name} />}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Тип счёта *</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as 'cash' | 'card' | 'savings')}
          >
            <option value="card">Карта</option>
            <option value="cash">Наличные</option>
            <option value="savings">Накопительный</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Баланс</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-3 py-2"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Валюта</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Цвет</label>
          <div className="flex gap-2">
            {accountColors.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`w-8 h-8 rounded-full ${c.class} ${
                  color === c.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
                onClick={() => setColor(c.value)}
                title={c.label}
              />
            ))}
          </div>
        </div>
        {initialData && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="isActive" className="text-sm text-gray-600">Активен</label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
