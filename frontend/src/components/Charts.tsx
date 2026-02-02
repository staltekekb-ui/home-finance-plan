import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyReport } from '../types';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

interface CategoryChartProps {
  data: Record<string, number>;
}

export function CategoryPieChart({ data }: CategoryChartProps) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return <div className="text-center text-gray-500 py-8">Нет данных</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface MonthlyChartProps {
  reports: MonthlyReport[];
}

export function MonthlyBarChart({ reports }: MonthlyChartProps) {
  const chartData = reports
    .filter((r) => r.count > 0)
    .map((r) => ({
      month: r.month.split(' ')[0].slice(0, 3),
      total: r.total,
    }));

  if (chartData.length === 0) {
    return <div className="text-center text-gray-500 py-8">Нет данных</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`} />
        <Tooltip
          formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`}
          labelFormatter={(label) => `Месяц: ${label}`}
        />
        <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CategoryBreakdownProps {
  reports: MonthlyReport[];
}

export function CategoryBreakdownChart({ reports }: CategoryBreakdownProps) {
  const allCategories = new Map<string, number>();

  reports.forEach((r) => {
    Object.entries(r.by_category).forEach(([cat, amount]) => {
      allCategories.set(cat, (allCategories.get(cat) || 0) + amount);
    });
  });

  return <CategoryPieChart data={Object.fromEntries(allCategories)} />;
}
