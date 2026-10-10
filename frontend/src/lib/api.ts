const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://budgetingapp-production-3aab.up.railway.app/api';

let cachedToken: string | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    const res = await fetch('/api/auth/token');
    if (!res.ok) return null;
    const data = await res.json();
    cachedToken = data.accessToken;
    return cachedToken;
  } catch {
    return null;
  }
}

async function fetchApi(path: string, options?: RequestInit, retried = false): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    cachedToken = null;
    // Tokens are short-lived: fetch a fresh one once before sending the user to sign in.
    if (!retried && token) return fetchApi(path, options, true);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'API request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

// The signed-in user's preferences
export const getMe = () => fetchApi('/me');
export const updateMe = (data: { modules?: string[]; onboarded?: true; acceptTerms?: string; healthConsent?: boolean; currency?: string }) =>
  fetchApi('/me', { method: 'PATCH', body: JSON.stringify(data) });

// Accounts
export const getAccounts = () => fetchApi('/accounts');
export const getAccount = (id: string) => fetchApi(`/accounts/${id}`);
export const createAccount = (data: { name: string; type: string; notes?: string }) =>
  fetchApi('/accounts', { method: 'POST', body: JSON.stringify(data) });
export const updateAccount = (id: string, data: { name?: string; type?: string; notes?: string | null }) =>
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

// Investments
export const getPortfolio = (refresh = false) => fetchApi(`/investments/portfolio${refresh ? '?refresh=1' : ''}`);
export const getTrades = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchApi(`/investments/trades${qs}`);
};
export const createTrade = (data: any) =>
  fetchApi('/investments/trades', { method: 'POST', body: JSON.stringify(data) });
export const updateTrade = (id: string, data: any) =>
  fetchApi(`/investments/trades/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTrade = (id: string) =>
  fetchApi(`/investments/trades/${id}`, { method: 'DELETE' });
export const addInvestmentFee = (data: { accountId: string; amount: number; date?: string; description?: string }) =>
  fetchApi('/investments/fees', { method: 'POST', body: JSON.stringify(data) });
export const getFxRate = (from: string, date?: string) =>
  fetchApi(`/investments/fx?from=${encodeURIComponent(from)}${date ? `&date=${date}` : ''}`);
export const getMarketPrice = (ticker: string) =>
  fetchApi(`/investments/market-price/${encodeURIComponent(ticker)}`);

// Habits
export const getHabits = () => fetchApi('/habits');
export const createHabit = (data: { name: string; description?: string; frequency?: string }) =>
  fetchApi('/habits', { method: 'POST', body: JSON.stringify(data) });
export const updateHabit = (id: string, data: any) =>
  fetchApi(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteHabit = (id: string) =>
  fetchApi(`/habits/${id}`, { method: 'DELETE' });
export const getHabitLogs = (habitId: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchApi(`/habits/${habitId}/logs${qs}`);
};
export const getAllHabitLogs = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchApi(`/habits/logs${qs}`);
};
export const logHabit =(habitId: string, data: { date: string; completed?: boolean; note?: string; source?: string }) =>
  fetchApi(`/habits/${habitId}/logs`, { method: 'POST', body: JSON.stringify(data) });
export const getPendingHabitLogs = () => fetchApi('/habits/pending/all');
export const validateHabitLog = (logId: string) =>
  fetchApi(`/habits/logs/${logId}/validate`, { method: 'PATCH' });
export const deleteHabitLog = (logId: string) =>
  fetchApi(`/habits/logs/${logId}`, { method: 'DELETE' });

// Fitness
export const getFitnessEntries = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchApi(`/fitness${qs}`);
};
export const createFitnessEntry = (data: any) =>
  fetchApi('/fitness', { method: 'POST', body: JSON.stringify(data) });
export const updateFitnessEntry = (id: string, data: any) =>
  fetchApi(`/fitness/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteFitnessEntry = (id: string) =>
  fetchApi(`/fitness/${id}`, { method: 'DELETE' });
export const getPendingFitnessEntries = () => fetchApi('/fitness/pending/all');
export const validateFitnessEntry = (id: string) =>
  fetchApi(`/fitness/${id}/validate`, { method: 'PATCH' });
export const getFitnessPlans = () => fetchApi('/fitness/plans');
export const getFitnessPlan = (id: string) => fetchApi(`/fitness/plans/${id}`);
export const updateFitnessPlanStatus = (id: string, status: string) =>
  fetchApi(`/fitness/plans/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// Goals
export const getGoals = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchApi(`/goals${qs}`);
};
export const getGoal = (id: string) => fetchApi(`/goals/${id}`);
export const createGoal = (data: any) =>
  fetchApi('/goals', { method: 'POST', body: JSON.stringify(data) });
export const updateGoal = (id: string, data: any) =>
  fetchApi(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateGoalProgress = (id: string, currentValue: number) =>
  fetchApi(`/goals/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ currentValue }) });
export const deleteGoal = (id: string) =>
  fetchApi(`/goals/${id}`, { method: 'DELETE' });
export const createMilestone = (goalId: string, data: any) =>
  fetchApi(`/goals/${goalId}/milestones`, { method: 'POST', body: JSON.stringify(data) });
export const toggleMilestone = (milestoneId: string) =>
  fetchApi(`/goals/milestones/${milestoneId}/complete`, { method: 'PATCH' });
export const deleteMilestone = (milestoneId: string) =>
  fetchApi(`/goals/milestones/${milestoneId}`, { method: 'DELETE' });

// Notes
export const getNotes = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchApi(`/notes${qs}`);
};
export const getNote = (id: string) => fetchApi(`/notes/${id}`);
export const createNote = (data: any) =>
  fetchApi('/notes', { method: 'POST', body: JSON.stringify(data) });
export const updateNote = (id: string, data: any) =>
  fetchApi(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteNote = (id: string) =>
  fetchApi(`/notes/${id}`, { method: 'DELETE' });

// Stats
export const getLifeOverview = () => fetchApi('/stats/life-overview');
export const getNetWorthHistory = (months: number | "all") => fetchApi(`/stats/net-worth?months=${months}`);
export const getPatterns = (days = 90) => fetchApi(`/stats/patterns?days=${days}`);
export const getWeeklySummary = (week: "current" | "previous") => fetchApi(`/stats/weekly-summary?week=${week}`);
