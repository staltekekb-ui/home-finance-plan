import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: isOpen,
  });

  useEffect(() => {
    if (settings) {
      setMonthlyIncome(settings.monthly_income?.toString() || '');
      setMonthlySavingsGoal(settings.monthly_savings_goal?.toString() || '');
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['savings-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      onClose();
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null,
      monthly_savings_goal: monthlySavingsGoal ? parseFloat(monthlySavingsGoal) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-50 mb-4">Настройки</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Ежемесячный доход
            </label>
            <input
              type="number"
              step="1000"
              className="input"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              placeholder="100000"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Используется для расчёта накоплений
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Цель накоплений в месяц
            </label>
            <input
              type="number"
              step="1000"
              className="input"
              value={monthlySavingsGoal}
              onChange={(e) => setMonthlySavingsGoal(e.target.value)}
              placeholder="20000"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Сколько хотите откладывать каждый месяц
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
