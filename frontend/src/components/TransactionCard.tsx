import { memo } from 'react';
import type { Transaction } from '../types';

interface Props {
  transaction: Transaction;
  onDelete: () => void;
  onEdit: () => void;
  onRepeat?: () => void;
}

function TransactionCard({ transaction, onDelete, onEdit, onRepeat }: Props) {
  const formattedDate = new Date(transaction.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-700 dark:text-gray-50 truncate text-lg">{transaction.description}</div>
          <div className="text-sm text-slate-500 dark:text-gray-300 flex flex-wrap gap-2 mt-1 font-medium">
            <span>{formattedDate}</span>
            {transaction.category && (
              <span className="bg-sage-500/10 dark:bg-sage-500/20 text-sage-700 dark:text-sage-400 px-3 py-0.5 rounded-full text-xs font-semibold">
                {transaction.category}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-xl font-bold text-danger whitespace-nowrap">
            -{transaction.amount.toLocaleString('ru-RU')} ₽
          </div>
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="text-slate-600 dark:text-gray-200 hover:text-sage-600 dark:hover:text-sage-400 text-sm font-semibold whitespace-nowrap transition-colors"
            >
              Изменить
            </button>
            {onRepeat && (
              <button
                onClick={onRepeat}
                className="text-slate-600 dark:text-gray-200 hover:text-sage-600 dark:hover:text-sage-400 text-sm font-semibold whitespace-nowrap transition-colors"
              >
                Повторять
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-slate-600 dark:text-gray-200 hover:text-danger dark:hover:text-red-400 text-sm font-semibold whitespace-nowrap transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(TransactionCard);
