import type {
  Transaction,
  TransactionCreate,
  ParsedTransaction,
  Category,
  MonthlyReport,
  TransactionFilters,
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

export async function uploadScreenshot(file: File): Promise<ParsedTransaction> {
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

export async function getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.category) params.append('category', filters.category);

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<Transaction[]>(`/transactions${query}`);
}

export async function createTransaction(data: TransactionCreate): Promise<Transaction> {
  return request<Transaction>('/transactions/', {
    method: 'POST',
    body: JSON.stringify(data),
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
