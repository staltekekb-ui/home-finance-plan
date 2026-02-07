import { useState, useEffect } from 'react';
import type { Account } from '../types';

interface Props {
  isOpen: boolean;
  accounts: Account[];
  onSelect: (accountId: number) => void;
  onCancel: () => void;
}

export default function AccountSelectionModal({ isOpen, accounts, onSelect, onCancel }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);

  // Update selected account when modal opens or accounts change
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAccountId) {
      onSelect(selectedAccountId);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content p-6">
        <h2 className="text-xl font-bold text-slate-700 dark:text-gray-50 mb-4">
          Выберите счёт для транзакций
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Все распознанные транзакции будут привязаны к выбранному счёту.
          Баланс счёта будет автоматически пересчитан.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
              Счёт
            </label>
            <select
              className="input"
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
              required
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.balance.toLocaleString('ru-RU')} {account.currency})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!selectedAccountId}
            >
              Продолжить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
