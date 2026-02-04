import { memo } from 'react';
import type { RecurringPayment } from '../types';

interface Props {
  payment: RecurringPayment;
  onExecute: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const frequencyLabels: Record<string, string> = {
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
};

function RecurringPaymentCard({ payment, onExecute, onEdit, onDelete }: Props) {
  const nextDate = new Date(payment.next_date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isOverdue = new Date(payment.next_date) < new Date();

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm ${!payment.is_active ? 'opacity-50' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{payment.description}</div>
          <div className="text-sm text-gray-500 flex flex-wrap gap-2 items-center">
            <span>{frequencyLabels[payment.frequency] || payment.frequency}</span>
            {payment.category && (
              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                {payment.category}
              </span>
            )}
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {isOverdue ? 'Просрочено: ' : 'Следующий: '}{nextDate}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-lg font-bold text-red-600 whitespace-nowrap">
            -{payment.amount.toLocaleString('ru-RU')} ₽
          </div>
          <div className="flex gap-2">
            {payment.is_active && (
              <button
                onClick={onExecute}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Выполнить
              </button>
            )}
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-blue-600 text-sm"
            >
              Изменить
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600 text-sm"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(RecurringPaymentCard);
