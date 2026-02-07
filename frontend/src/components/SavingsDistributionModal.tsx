import { useState, useEffect } from 'react';
import type { SavingsGoal } from '../types';

interface Props {
  isOpen: boolean;
  availableAmount: number;
  goals: SavingsGoal[];
  onDistribute: (distributions: { goalId: number; amount: number }[]) => void;
  onSkip: () => void;
}

export default function SavingsDistributionModal({
  isOpen,
  availableAmount,
  goals,
  onDistribute,
  onSkip,
}: Props) {
  const [distributions, setDistributions] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      setDistributions({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeGoals = goals.filter(g => !g.is_completed);

  const totalDistributed = Object.entries(distributions).reduce(
    (sum, [, amount]) => sum + (parseFloat(amount) || 0),
    0
  );

  const remaining = availableAmount - totalDistributed;

  const handleAutoDistribute = () => {
    if (activeGoals.length === 0) return;

    const newDistributions: Record<number, string> = {};
    const amountPerGoal = availableAmount / activeGoals.length;

    activeGoals.forEach(goal => {
      const remaining = goal.target_amount - goal.current_amount;
      const allocate = Math.min(amountPerGoal, remaining);
      if (allocate > 0) {
        newDistributions[goal.id] = allocate.toFixed(2);
      }
    });

    setDistributions(newDistributions);
  };

  const handleDistribute = () => {
    const result = Object.entries(distributions)
      .filter(([, amount]) => parseFloat(amount) > 0)
      .map(([goalId, amount]) => ({
        goalId: parseInt(goalId),
        amount: parseFloat(amount),
      }));

    onDistribute(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onSkip} />
      <div className="relative bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-700 dark:text-gray-50 mb-4">
            Распределить средства по целям
          </h3>

          <div className="mb-6 p-4 bg-sage-50 dark:bg-sage-900/20 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600 dark:text-gray-300 font-medium">
                Доступно для распределения:
              </span>
              <span className="text-2xl font-bold text-sage-600 dark:text-sage-400">
                {availableAmount.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-gray-300">
                Распределено:
              </span>
              <span className={`font-semibold ${totalDistributed > availableAmount ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-gray-50'}`}>
                {totalDistributed.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-slate-600 dark:text-gray-300">
                Остаток:
              </span>
              <span className={`font-semibold ${remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {remaining.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

          {activeGoals.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-300">
              Нет активных целей накоплений.
              <br />
              <a href="/goals" className="text-sage-600 dark:text-sage-400 hover:underline mt-2 inline-block">
                Создать цель
              </a>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <button
                  onClick={handleAutoDistribute}
                  className="text-sm text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 font-medium"
                >
                  Распределить автоматически
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {activeGoals.map(goal => {
                  const goalRemaining = goal.target_amount - goal.current_amount;
                  const percentage = (goal.current_amount / goal.target_amount) * 100;

                  return (
                    <div key={goal.id} className="card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-700 dark:text-gray-50">
                            {goal.name}
                          </h4>
                          <div className="text-sm text-gray-500 dark:text-gray-300">
                            {goal.current_amount.toLocaleString('ru-RU')} / {goal.target_amount.toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="mt-1 bg-cream-300 dark:bg-dark-50/20 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-sage-500 dark:bg-sage-600 transition-all"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Осталось: {goalRemaining.toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                        <div className="ml-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={Math.min(availableAmount, goalRemaining)}
                            className="input w-32 text-right"
                            placeholder="0"
                            value={distributions[goal.id] || ''}
                            onChange={(e) => setDistributions({
                              ...distributions,
                              [goal.id]: e.target.value,
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            {activeGoals.length > 0 && (
              <button
                onClick={handleDistribute}
                disabled={totalDistributed <= 0 || totalDistributed > availableAmount}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Распределить ({totalDistributed.toLocaleString('ru-RU')} ₽)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
