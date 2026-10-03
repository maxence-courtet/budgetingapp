export interface Category {
  id: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  notes?: string | null;
  balance?: number;
}

export interface Transaction {
  id: string;
  type: string;
  date: string;
  amount: number;
  description: string | null;
  status: string;
  categoryId: string;
  category: Category;
  toCategoryId: string | null;
  toCategory?: Category | null;
  fromAccountId: string | null;
  fromAccount: Account | null;
  toAccountId: string | null;
  toAccount: Account | null;
  fromTemplate: boolean;
  monthId?: string;
  month?: { id: string; month: number; year: number };
}

export interface Month {
  id: string;
  month: number;
  year: number;
  budgetTemplateId: string | null;
  budgetTemplate: { id: string; name: string } | null;
  transactions?: Transaction[];
  income?: number;
  spending?: number;
  net?: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
}

export interface BudgetDefinition {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  categoryId: string;
  category: Category;
  toCategoryId: string | null;
  toCategory?: Category | null;
  fromAccountId: string | null;
  fromAccount?: Account | null;
  toAccountId: string | null;
  toAccount?: Account | null;
}
