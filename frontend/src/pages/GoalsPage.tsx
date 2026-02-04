import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  addToSavingsGoal,
  deleteSavingsGoal,
  getMonthlySavingsStatus,
  getSettings,
} from '../api/client';
import type { SavingsGoal, SavingsGoalCreate, MonthlySavingsStatus } from '../types';
import ProgressBar from '../components/ProgressBar';
import ConfirmModal from '../components/ConfirmModal';
import SettingsModal from '../components/SettingsModal';

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [addAmountTarget, setAddAmountTarget] = useState<SavingsGoal | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['savings-goals', showCompleted],
    queryFn: () => getSavingsGoals(showCompleted),
  });

  const { data: savingsStatus } = useQuery({
    queryKey: ['savings-status'],
    queryFn: () => getMonthlySavingsStatus(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const createMutation = useMutation({
    mutationFn: createSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SavingsGoalCreate> }) =>
      updateSavingsGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      setEditingGoal(null);
    },
  });

  const addMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      addToSavingsGoal(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      setAddAmountTarget(null);
      setAddAmount('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Цели накоплений</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-600 hover:text-gray-800 px-3 py-2 border rounded"
          >
            Настройки
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Добавить цель
          </button>
        </div>
      </div>

      {savingsStatus && settings?.monthly_income && (
        <MonthlySavingsWidget status={savingsStatus} />
      )}

      {(showForm || editingGoal) && (
        <GoalForm
          initialData={editingGoal}
          onSubmit={(data) => {
            if (editingGoal) {
              updateMutation.mutate({ id: editingGoal.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingGoal(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showCompleted"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
        />
        <label htmlFor="showCompleted" className="text-sm text-gray-600">
          Показать выполненные
        </label>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Нет целей накоплений. Создайте первую!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => setDeleteTarget(goal.id)}
              onAddAmount={() => setAddAmountTarget(goal)}
            />
          ))}
        </div>
      )}

      {addAmountTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAddAmountTarget(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              Добавить к "{addAmountTarget.name}"
            </h3>
            <input
              type="number"
              step="100"
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Сумма"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAddAmountTarget(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (addAmount && parseFloat(addAmount) > 0) {
                    addMutation.mutate({ id: addAmountTarget.id, amount: parseFloat(addAmount) });
                  }
                }}
                disabled={addMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Удалить цель?"
        message="Эта операция необратима."
        confirmText="Удалить"
        danger
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

interface MonthlySavingsWidgetProps {
  status: MonthlySavingsStatus;
}

function MonthlySavingsWidget({ status }: MonthlySavingsWidgetProps) {
  const percentage = status.income > 0 ? ((status.income - status.expenses) / status.income * 100) : 0;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="font-medium mb-3">Накопления за этот месяц</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
        <div>
          <div className="text-sm text-gray-500">Доход</div>
          <div className="font-medium text-green-600">
            {status.income.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Расходы</div>
          <div className="font-medium text-red-600">
            {status.expenses.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Накоплено</div>
          <div className={`font-medium ${status.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {status.savings.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Цель</div>
          <div className="font-medium">
            {status.savings_goal.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>
      <ProgressBar
        percentage={status.savings_goal > 0 ? (status.savings / status.savings_goal * 100) : percentage}
        color={status.is_on_track ? 'green' : 'red'}
      />
      <div className="text-sm text-gray-500 mt-1">
        {status.is_on_track ? 'Вы на правильном пути!' : 'Нужно сократить расходы'}
      </div>
    </div>
  );
}

interface GoalCardProps {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onAddAmount: () => void;
}

function GoalCard({ goal, onEdit, onDelete, onAddAmount }: GoalCardProps) {
  const percentage = (goal.current_amount / goal.target_amount) * 100;
  const targetDate = goal.target_date
    ? new Date(goal.target_date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm ${goal.is_completed ? 'border-2 border-green-500' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium">{goal.name}</h3>
          {targetDate && (
            <div className="text-sm text-gray-500">Цель к: {targetDate}</div>
          )}
        </div>
        {goal.is_completed && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            Достигнуто!
          </span>
        )}
      </div>
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>{goal.current_amount.toLocaleString('ru-RU')} ₽</span>
        <span>{goal.target_amount.toLocaleString('ru-RU')} ₽</span>
      </div>
      <ProgressBar
        percentage={percentage}
        color={goal.is_completed ? 'green' : 'blue'}
      />
      <div className="flex justify-between items-center mt-3">
        <div className="text-sm text-gray-500">
          Осталось: {(goal.target_amount - goal.current_amount).toLocaleString('ru-RU')} ₽
        </div>
        <div className="flex gap-2">
          {!goal.is_completed && (
            <button
              onClick={onAddAmount}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Добавить
            </button>
          )}
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
  initialData: SavingsGoal | null;
  onSubmit: (data: SavingsGoalCreate) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function GoalForm({ initialData, onSubmit, onCancel, isLoading }: FormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [targetAmount, setTargetAmount] = useState(initialData?.target_amount.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(initialData?.current_amount.toString() || '0');
  const [targetDate, setTargetDate] = useState(initialData?.target_date || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount),
      target_date: targetDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm space-y-4">
      <h2 className="text-lg font-medium">
        {initialData ? 'Редактировать цель' : 'Новая цель'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Название *</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Отпуск в Турции"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Целевая сумма *</label>
          <input
            type="number"
            step="1000"
            className="w-full border rounded px-3 py-2"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="100000"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Уже накоплено</label>
          <input
            type="number"
            step="100"
            className="w-full border rounded px-3 py-2"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Дата достижения</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
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
