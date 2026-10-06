import { z } from "zod";
import { api } from "../client";

// Tools for setting up money tracking: accounts, categories, budget templates and transactions, including bulk
// import of existing history. Everything is created for the signed-in user only.

const TX_TYPES = ["INCOME", "SPENDING", "TRANSFER"] as const;
const TX_STATUSES = ["PLANNED", "PAID", "PENDING", "SKIPPED"] as const;

const moneyFlow = {
  type: z.enum(TX_TYPES).describe("SPENDING needs fromAccountId, INCOME needs toAccountId, TRANSFER needs both"),
  amount: z.number().positive(),
  description: z.string().optional(),
  categoryId: z.string().describe("Category ID (use get_categories)"),
  fromAccountId: z.string().optional().describe("Account the money leaves (SPENDING, TRANSFER)"),
  toAccountId: z.string().optional().describe("Account the money arrives in (INCOME, TRANSFER)"),
  toCategoryId: z.string().optional().describe("TRANSFER only: category on the receiving side"),
};

const transaction = z.object({
  ...moneyFlow,
  date: z.string().describe("ISO date YYYY-MM-DD"),
  status: z.enum(TX_STATUSES).optional().describe("Defaults to PLANNED; use PAID for money that already moved"),
  monthId: z.string().optional().describe("Month ID; omit to use the month the date falls in (created if needed)"),
});

export const setupTools = [
  {
    name: "get_categories",
    description: "List all spending/income categories with their IDs.",
    inputSchema: z.object({}),
    handler: async () => api("/categories"),
  },
  {
    name: "create_account",
    description: "Create an account (bank account, credit card, cash, investment account).",
    inputSchema: z.object({
      name: z.string(),
      type: z.enum(["checking", "savings", "credit card", "cash", "investment"]),
      notes: z.string().optional(),
    }),
    handler: async (body: { name: string; type: string; notes?: string }) =>
      api("/accounts", { method: "POST", body }),
  },
  {
    name: "create_categories",
    description: "Create one or more categories by name. Names that already exist are skipped. Returns every requested category with its ID.",
    inputSchema: z.object({ names: z.array(z.string()).min(1).max(100) }),
    handler: async ({ names }: { names: string[] }) => {
      const existing = (await api("/categories")) as { id: string; name: string }[];
      const byName = new Map(existing.map((c) => [c.name.toLowerCase(), c]));
      const result = [];
      for (const name of names) {
        const found = byName.get(name.trim().toLowerCase());
        if (found) {
          result.push({ ...found, created: false });
          continue;
        }
        const created = (await api("/categories", { method: "POST", body: { name } })) as { id: string; name: string };
        byName.set(created.name.toLowerCase(), created);
        result.push({ ...created, created: true });
      }
      return result;
    },
  },
  {
    name: "get_budget_templates",
    description: "List budget templates (recurring monthly plans) with their lines.",
    inputSchema: z.object({}),
    handler: async () => api("/budgets"),
  },
  {
    name: "create_budget_template",
    description: "Create a budget template: a named set of recurring monthly transactions that can be applied to a month.",
    inputSchema: z.object({ name: z.string() }),
    handler: async ({ name }: { name: string }) => api("/budgets", { method: "POST", body: { name } }),
  },
  {
    name: "add_budget_lines",
    description: "Add one or more lines (planned recurring transactions) to a budget template.",
    inputSchema: z.object({
      budgetTemplateId: z.string(),
      lines: z.array(z.object(moneyFlow)).min(1).max(100),
    }),
    handler: async ({ budgetTemplateId, lines }: { budgetTemplateId: string; lines: Record<string, unknown>[] }) => {
      const created = [];
      for (const [i, line] of lines.entries()) {
        try {
          created.push(await api(`/budgets/${budgetTemplateId}/definitions`, { method: "POST", body: line }));
        } catch (err: any) {
          throw new Error(`Line ${i + 1} failed after ${created.length} were added: ${err.message}`);
        }
      }
      return { added: created.length };
    },
  },
  {
    name: "create_transaction",
    description: "Record one transaction (income, spending or transfer between accounts).",
    inputSchema: transaction,
    handler: async ({ monthId, ...t }: z.infer<typeof transaction>) => {
      if (monthId) return api("/transactions", { method: "POST", body: { ...t, monthId } });
      // Without a month, the import endpoint finds or creates the month the date falls in.
      return api("/transactions/import", { method: "POST", body: { transactions: [t] } });
    },
  },
  {
    name: "import_transactions",
    description:
      "Bulk-create up to 500 transactions in one call (all or nothing), e.g. to bring in history from another app. " +
      "Months are matched or created from each date unless monthId is given. Create accounts and categories first.",
    inputSchema: z.object({ transactions: z.array(transaction).min(1).max(500) }),
    handler: async ({ transactions }: { transactions: z.infer<typeof transaction>[] }) =>
      api("/transactions/import", { method: "POST", body: { transactions } }),
  },
];
