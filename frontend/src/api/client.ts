import type {
  Transaction,
  TransactionCreate,
  ParsedTransaction,
  Category,
  MonthlyReport,
  TransactionFilters,
  RecurringPayment,
  RecurringPaymentCreate,
  Budget,
  BudgetCreate,
  BudgetStatus,
  UserSettings,
  SavingsGoal,
  SavingsGoalCreate,
  MonthlySavingsStatus,
  Account,
  AccountCreate,
  DashboardSummary,
  DashboardWidgets,
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Ошибка сервера' }));
    throw new Error(error.detail || 'Ошибка запроса');
  }

  return response.json();
}

export async function uploadScreenshot(file: File): Promise<ParsedTransaction[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Ошибка загрузки' }));
    throw new Error(error.detail || 'Ошибка загрузки файла');
  }

  return response.json();
}

export interface BatchUploadResult {
  filename: string;
  success: boolean;
  data: ParsedTransaction[] | null;
  error: string | null;
}

export async function uploadScreenshotBatch(files: File[]): Promise<{ results: BatchUploadResult[] }> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await fetch(`${API_BASE}/upload/batch`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Ошибка загрузки' }));
    throw new Error(error.detail || 'Ошибка загрузки файлов');
  }

  return response.json();
}

export async function getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.account_id) params.append('account_id', String(filters.account_id));
  if (filters?.sort_by) params.append('sort_by', filters.sort_by);
  if (filters?.sort_order) params.append('sort_order', filters.sort_order);

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<Transaction[]>(`/transactions${query}`);
}

export async function createTransaction(data: TransactionCreate, accountId?: number): Promise<Transaction> {
  const url = accountId ? `/transactions/?account_id=${accountId}` : '/transactions/';
  return request<Transaction>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function checkDuplicateTransactions(transactions: TransactionCreate[]): Promise<{
  total_checked: number;
  duplicates_found: number;
  duplicates: Array<{
    index: number;
    transaction: TransactionCreate;
    similar_count: number;
    similar_transactions: Array<{
      id: number;
      date: string;
      amount: number;
      description: string;
      category?: string;
    }>;
  }>;
}> {
  return request('/transactions/check-duplicates', {
    method: 'POST',
    body: JSON.stringify(transactions),
  });
}

export async function updateTransaction(id: number, data: Partial<TransactionCreate>): Promise<Transaction> {
  return request<Transaction>(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  await request(`/transactions/${id}`, { method: 'DELETE' });
}

export interface BulkDeleteParams {
  transaction_ids?: number[];
  date_from?: string;
  date_to?: string;
  category?: string;
  account_id?: number;
  transaction_type?: string;
}

export async function bulkDeleteTransactions(params: BulkDeleteParams): Promise<{
  deleted_count: number;
  affected_accounts: number[];
}> {
  return request('/transactions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>('/transactions/categories');
}

export async function getMonthlyReports(year?: number): Promise<MonthlyReport[]> {
  const query = year ? `?year=${year}` : '';
  return request<MonthlyReport[]>(`/reports/monthly${query}`);
}

export async function exportToExcel(filters?: TransactionFilters): Promise<void> {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.category) params.append('category', filters.category);

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/export/excel${query}`);

  if (!response.ok) {
    throw new Error('Ошибка экспорта');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.xlsx';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Recurring Payments
export async function getRecurringPayments(activeOnly = true): Promise<RecurringPayment[]> {
  const query = activeOnly ? '?active_only=true' : '';
  return request<RecurringPayment[]>(`/recurring${query}`);
}

export async function createRecurringPayment(data: RecurringPaymentCreate): Promise<RecurringPayment> {
  return request<RecurringPayment>('/recurring/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRecurringPayment(id: number, data: Partial<RecurringPaymentCreate>): Promise<RecurringPayment> {
  return request<RecurringPayment>(`/recurring/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRecurringPayment(id: number): Promise<void> {
  await request(`/recurring/${id}`, { method: 'DELETE' });
}

export async function executeRecurringPayment(id: number): Promise<Transaction> {
  return request<Transaction>(`/recurring/${id}/execute`, { method: 'POST' });
}

export async function createRecurringFromTransaction(transactionId: number, frequency: string): Promise<RecurringPayment> {
  return request<RecurringPayment>(`/recurring/from-transaction/${transactionId}?frequency=${frequency}`, {
    method: 'POST',
  });
}

// Budgets
export async function getBudgets(): Promise<Budget[]> {
  return request<Budget[]>('/budgets/');
}

export async function getBudgetsStatus(year?: number, month?: number): Promise<BudgetStatus[]> {
  const params = new URLSearchParams();
  if (year) params.append('year', String(year));
  if (month) params.append('month', String(month));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<BudgetStatus[]>(`/budgets/status${query}`);
}

export async function createBudget(data: BudgetCreate): Promise<Budget> {
  return request<Budget>('/budgets/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBudget(id: number, data: Partial<BudgetCreate>): Promise<Budget> {
  return request<Budget>(`/budgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBudget(id: number): Promise<void> {
  await request(`/budgets/${id}`, { method: 'DELETE' });
}

// User Settings
export async function getSettings(): Promise<UserSettings> {
  return request<UserSettings>('/settings/');
}

export async function updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
  return request<UserSettings>('/settings/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Savings Goals
export async function getSavingsGoals(includeCompleted = false): Promise<SavingsGoal[]> {
  const query = includeCompleted ? '?include_completed=true' : '';
  return request<SavingsGoal[]>(`/savings/goals${query}`);
}

export async function createSavingsGoal(data: SavingsGoalCreate): Promise<SavingsGoal> {
  return request<SavingsGoal>('/savings/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSavingsGoal(id: number, data: Partial<SavingsGoalCreate>): Promise<SavingsGoal> {
  return request<SavingsGoal>(`/savings/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function addToSavingsGoal(id: number, amount: number): Promise<SavingsGoal> {
  return request<SavingsGoal>(`/savings/goals/${id}/add?amount=${amount}`, {
    method: 'POST',
  });
}

export async function subtractFromSavingsGoal(id: number, amount: number): Promise<SavingsGoal> {
  return request<SavingsGoal>(`/savings/goals/${id}/subtract?amount=${amount}`, {
    method: 'POST',
  });
}

export async function deleteSavingsGoal(id: number): Promise<void> {
  await request(`/savings/goals/${id}`, { method: 'DELETE' });
}

export async function getMonthlySavingsStatus(year?: number, month?: number): Promise<MonthlySavingsStatus> {
  const params = new URLSearchParams();
  if (year) params.append('year', String(year));
  if (month) params.append('month', String(month));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<MonthlySavingsStatus>(`/savings/monthly-status${query}`);
}

// Accounts
export async function getAccounts(activeOnly = true): Promise<Account[]> {
  const query = activeOnly ? '?active_only=true' : '';
  return request<Account[]>(`/accounts${query}`);
}

export async function createAccount(data: AccountCreate): Promise<Account> {
  return request<Account>('/accounts/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAccount(id: number, data: Partial<AccountCreate>): Promise<Account> {
  return request<Account>(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(id: number): Promise<void> {
  await request(`/accounts/${id}`, { method: 'DELETE' });
}

export async function getTotalBalance(): Promise<{ total: number; by_currency: Record<string, number> }> {
  return request('/accounts/total-balance');
}

// Dashboard
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return request<DashboardSummary>('/dashboard/summary');
}

export async function getDashboardWidgets(): Promise<DashboardWidgets> {
  return request<DashboardWidgets>('/dashboard/widgets');
}
