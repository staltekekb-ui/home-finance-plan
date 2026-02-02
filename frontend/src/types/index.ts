export interface Transaction {
  id: number;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  image_path: string | null;
  raw_text: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TransactionCreate {
  amount: number;
  description: string;
  category?: string;
  date: string;
  image_path?: string;
  raw_text?: string;
}

export interface ParsedTransaction {
  amount: number;
  description: string;
  category: string | null;
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
}

export interface TransactionFilters {
  date_from?: string;
  date_to?: string;
  category?: string;
}
