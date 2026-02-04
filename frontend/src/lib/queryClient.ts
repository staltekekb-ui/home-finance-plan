import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes - keep unused data in cache for 30 minutes
      refetchOnWindowFocus: false, // don't refetch when window regains focus
      retry: 1, // retry failed requests once
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  transactions: (filters?: Record<string, unknown>) => ['transactions', filters] as const,
  categories: ['categories'] as const,
  budgets: ['budgets'] as const,
  budgetsStatus: ['budgets-status'] as const,
  savingsGoals: (includeCompleted?: boolean) => ['savings-goals', includeCompleted] as const,
  savingsStatus: ['savings-status'] as const,
  settings: ['settings'] as const,
  accounts: ['accounts'] as const,
  totalBalance: ['total-balance'] as const,
  recurring: ['recurring'] as const,
  dashboardSummary: ['dashboard-summary'] as const,
  dashboardWidgets: ['dashboard-widgets'] as const,
  monthlyReports: (year?: number) => ['monthly-reports', year] as const,
};
