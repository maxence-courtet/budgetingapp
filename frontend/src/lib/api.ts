const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://budgetingapp-production-3aab.up.railway.app/api';

async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'API request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

// Accounts
export const getAccounts = () => fetchApi('/accounts');
export const getAccount = (id: string) => fetchApi(`/accounts/${id}`);
export const createAccount = (data: { name: string; type: string; notes?: string }) =>
  fetchApi('/accounts', { method: 'POST', body: JSON.stringify(data) });
export const updateAccount = (id: string, data: { name?: string; type?: string; notes?: string }) =>
  fetchApi(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAccount = (id: string) =>
  fetchApi(`/accounts/${id}`, { method: 'DELETE' });

// Categories
export const getCategories = () => fetchApi('/categories');
export const createCategory = (data: { name: string }) =>
  fetchApi('/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id: string, data: { name: string }) =>
  fetchApi(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory = (id: string) =>
  fetchApi(`/categories/${id}`, { method: 'DELETE' });

// Transactions
export const getTransactions = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchApi(`/transactions${qs}`);
};
export const getTransaction = (id: string) => fetchApi(`/transactions/${id}`);
export const createTransaction = (data: any) =>
  fetchApi('/transactions', { method: 'POST', body: JSON.stringify(data) });
export const updateTransaction = (id: string, data: any) =>
  fetchApi(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTransaction = (id: string) =>
  fetchApi(`/transactions/${id}`, { method: 'DELETE' });
export const updateTransactionStatus = (id: string, status: string) =>
  fetchApi(`/transactions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// Budget Templates
export const getBudgets = () => fetchApi('/budgets');
export const getBudget = (id: string) => fetchApi(`/budgets/${id}`);
export const createBudget = (data: { name: string }) =>
  fetchApi('/budgets', { method: 'POST', body: JSON.stringify(data) });
export const updateBudget = (id: string, data: { name: string }) =>
  fetchApi(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBudget = (id: string) =>
  fetchApi(`/budgets/${id}`, { method: 'DELETE' });
export const addBudgetDefinition = (budgetId: string, data: any) =>
  fetchApi(`/budgets/${budgetId}/definitions`, { method: 'POST', body: JSON.stringify(data) });
export const updateBudgetDefinition = (budgetId: string, defId: string, data: any) =>
  fetchApi(`/budgets/${budgetId}/definitions/${defId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBudgetDefinition = (budgetId: string, defId: string) =>
  fetchApi(`/budgets/${budgetId}/definitions/${defId}`, { method: 'DELETE' });

// Months
export const getMonths = () => fetchApi('/months');
export const getMonth = (id: string) => fetchApi(`/months/${id}`);
export const createMonth = (data: { month: number; year: number; budgetTemplateId?: string }) =>
  fetchApi('/months', { method: 'POST', body: JSON.stringify(data) });
export const updateMonth = (id: string, data: any) =>
  fetchApi(`/months/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMonth = (id: string) =>
  fetchApi(`/months/${id}`, { method: 'DELETE' });
export const applyBudgetToMonth = (monthId: string, budgetTemplateId: string) =>
  fetchApi(`/months/${monthId}/apply-budget`, { method: 'POST', body: JSON.stringify({ budgetTemplateId }) });

// Reports
export const getAccountSummary = () => fetchApi('/reports/account-summary');
export const getCategoryDetail = (accountId: string, categoryId: string) =>
  fetchApi(`/reports/category-detail?accountId=${accountId}&categoryId=${categoryId}`);
export const getMonthlySummary = (monthId: string) =>
  fetchApi(`/reports/monthly-summary/${monthId}`);

// Search
export const searchTransactions = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return fetchApi(`/search?${qs}`);
};
