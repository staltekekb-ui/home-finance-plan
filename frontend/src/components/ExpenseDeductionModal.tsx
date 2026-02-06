import { useState, useEffect } from 'react';
import type { SavingsGoal } from '../types';

interface Props {
  isOpen: boolean;
  totalExpenses: number;
  goals: SavingsGoal[];
  onDeduct: (deductions: { goalId: number; amount: number }[]) => void;
  onSkip: () => void;
}

export default function ExpenseDeductionModal({
  isOpen,
  totalExpenses,
  goals,
  onDeduct,
  onSkip,
}: Props) {
  const [deductions, setDeductions] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      setDeductions({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Only show goals that have enough current_amount
  const availableGoals = goals.filter(
    g => !g.is_completed && g.current_amount > 0
  );

  const totalDeducted = Object.entries(deductions).reduce(
    (sum, [, amount]) => sum + (parseFloat(amount) || 0),
    0
  );

  const remaining = totalExpenses - totalDeducted;

  const handleDeduct = () => {
    const result = Object.entries(deductions)
      .filter(([, amount]) => parseFloat(amount) > 0)
      .map(([goalId, amount]) => ({
        goalId: parseInt(goalId),
        amount: parseFloat(amount),
      }));

    onDeduct(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onSkip} />
      <div className="relative bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-700 dark:text-gray-50 mb-2">
            Списать расходы с целей накоплений
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            Вы можете списать часть или все расходы со своих целей накоплений, если тратите накопленные средства.
          </p>

          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600 dark:text-gray-300 font-medium">
                Общие расходы:
              </span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {totalExpenses.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-gray-300">
                Списано с целей:
              </span>
              <span className={`font-semibold ${totalDeducted > totalExpenses ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-gray-50'}`}>
                {totalDeducted.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-slate-600 dark:text-gray-300">
                Осталось списать:
              </span>
              <span className={`font-semibold ${remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-gray-50'}`}>
                {remaining.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

          {availableGoals.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-300">
              Нет целей с накопленными средствами для списания.
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {availableGoals.map(goal => {
                  const percentage = (goal.current_amount / goal.target_amount) * 100;
                  const inputAmount = parseFloat(deductions[goal.id] || '0');
                  const exceedsAvailable = inputAmount > goal.current_amount;

                  return (
                    <div key={goal.id} className="card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-700 dark:text-gray-50">
                            {goal.name}
                          </h4>
                          <div className="text-sm text-gray-500 dark:text-gray-300">
                            Накоплено: {goal.current_amount.toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="mt-1 bg-cream-300 dark:bg-dark-50/20 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-sage-500 dark:bg-sage-600 transition-all"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={goal.current_amount}
                            className={`input w-32 text-right ${exceedsAvailable ? 'border-red-500' : ''}`}
                            placeholder="0"
                            value={deductions[goal.id] || ''}
                            onChange={(e) => setDeductions({
                              ...deductions,
                              [goal.id]: e.target.value,
                            })}
                          />
                          {exceedsAvailable && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Превышает доступные средства
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-gray-300">
                  💡 <strong>Подсказка:</strong> Списание с целей позволяет отслеживать, когда вы тратите накопленные средства на запланированные цели (например, оплата отпуска из цели "Отпуск").
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-cream-300 dark:border-dark-50/30">
            <button
              onClick={onSkip}
              className="btn-secondary"
            >
              Пропустить
            </button>
            {availableGoals.length > 0 && (
              <button
                onClick={handleDeduct}
                disabled={
                  totalDeducted <= 0 ||
                  totalDeducted > totalExpenses ||
                  Object.entries(deductions).some(
                    ([goalId, amount]) =>
                      parseFloat(amount) > (availableGoals.find(g => g.id === parseInt(goalId))?.current_amount || 0)
                  )
                }
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Списать ({totalDeducted.toLocaleString('ru-RU')} ₽)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
