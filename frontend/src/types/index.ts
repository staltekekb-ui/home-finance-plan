export interface Transaction {
  id: number;
  amount: number;
  description: string;
  category: string | null;
  transaction_type: 'income' | 'expense';
  date: string;
  image_path: string | null;
  raw_text: string | null;
  account_id: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface TransactionCreate {
  amount: number;
  description: string;
  category?: string;
  transaction_type?: 'income' | 'expense';
  date: string;
  image_path?: string;
  raw_text?: string;
}

export interface ParsedTransaction {
  amount: number;
  description: string;
  category: string | null;
  transaction_type: 'income' | 'expense';
  date: string;
  raw_text: string;
}

export interface Category {
  value: string;
  label: string;
}

export interface MonthlyReport {
  month: string;
  total: number;
  count: number;
  by_category: Record<string, number>;
  income: number;
  income_count: number;
  income_by_category: Record<string, number>;
}

export interface TransactionFilters {
  date_from?: string;
  date_to?: string;
  category?: string;
  search?: string;
  account_id?: number;
  sort_by?: 'date' | 'amount' | 'description';
  sort_order?: 'asc' | 'desc';
}

export interface TransactionUpdate {
  amount?: number;
  description?: string;
  category?: string;
  transaction_type?: 'income' | 'expense';
  date?: string;
}

// Recurring Payments
export interface RecurringPayment {
  id: number;
  amount: number;
  description: string;
  category: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  day_of_month: number | null;
  day_of_week: number | null;
  next_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface RecurringPaymentCreate {
  amount: number;
  description: string;
  category?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  day_of_month?: number;
  day_of_week?: number;
  next_date: string;
}

// Budgets
export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
  alert_threshold: number;
  created_at: string;
  updated_at: string | null;
}

export interface BudgetCreate {
  category: string;
  monthly_limit: number;
  alert_threshold?: number;
}

export interface BudgetStatus {
  id: number;
  category: string;
  monthly_limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  is_over_threshold: boolean;
  alert_threshold: number;
}

// User Settings
export interface UserSettings {
  id: number;
  monthly_income: number | null;
  monthly_savings_goal: number | null;
  created_at: string;
  updated_at: string | null;
}

// Savings Goals
export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface SavingsGoalCreate {
  name: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
}

export interface MonthlySavingsStatus {
  income: number;
  expenses: number;
  savings: number;
  savings_goal: number;
  is_on_track: boolean;
}

// Accounts
export interface Account {
  id: number;
  name: string;
  account_type: 'cash' | 'card' | 'savings';
  balance: number;
  currency: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface AccountCreate {
  name: string;
  account_type: 'cash' | 'card' | 'savings';
  balance?: number;
  currency?: string;
  color?: string;
}

// Dashboard
export interface DashboardSummary {
  today: number;
  week: number;
  month: number;
  last_month: number;
  month_change_percent: number;
  top_categories: Array<{ category: string; amount: number }>;
}

export interface DashboardWidgets {
  budgets: BudgetStatus[];
  goals: SavingsGoal[];
  savings_status: MonthlySavingsStatus | null;
}
