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
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{transaction.description}</div>
          <div className="text-sm text-gray-500 flex flex-wrap gap-2">
            <span>{formattedDate}</span>
            {transaction.category && (
              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                {transaction.category}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-lg font-bold text-red-600 whitespace-nowrap">
            -{transaction.amount.toLocaleString('ru-RU')} ₽
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-blue-600 text-sm whitespace-nowrap"
            >
              Изменить
            </button>
            {onRepeat && (
              <button
                onClick={onRepeat}
                className="text-gray-400 hover:text-green-600 text-sm whitespace-nowrap"
              >
                Повторять
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600 text-sm whitespace-nowrap"
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
