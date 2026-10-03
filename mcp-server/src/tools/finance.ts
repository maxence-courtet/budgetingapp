import { z } from "zod";
import { api } from "../client.js";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export const financeTools = [
  {
    name: "get_financial_summary",
    description: "Get an overview of all accounts with balances, and the current month's income/spending/net. Use this for a quick financial health check.",
    inputSchema: z.object({}),
    handler: async () => {
      const [accounts, months] = await Promise.all([
        api("/accounts") as Promise<any[]>,
        api("/months") as Promise<any[]>,
      ]);
      const now = new Date();
      const currentMonth = months.find(
        (m: any) => m.month === now.getMonth() + 1 && m.year === now.getFullYear()
      );
      const totalBalance = accounts.reduce((s: number, a: any) => s + (a.balance ?? 0), 0);
      return {
        totalBalance,
        accounts: accounts.map((a: any) => ({
          id: a.id, name: a.name, type: a.type, balance: a.balance ?? 0,
        })),
        currentMonth: currentMonth
          ? {
              id: currentMonth.id,
              name: `${MONTH_NAMES[currentMonth.month - 1]} ${currentMonth.year}`,
              income: currentMonth.income ?? 0,
              spending: currentMonth.spending ?? 0,
              net: currentMonth.net ?? 0,
            }
          : null,
      };
    },
  },
  {
    name: "get_accounts",
    description: "List all accounts with their current balances.",
    inputSchema: z.object({}),
    handler: async () => api("/accounts"),
  },
  {
    name: "get_month_detail",
    description: "Get detailed information about a specific month including all transactions. Pass 'current' to get the current calendar month.",
    inputSchema: z.object({
      monthId: z.string().describe("Month ID, or 'current' for the current calendar month"),
    }),
    handler: async ({ monthId }: { monthId: string }) => {
      if (monthId === "current") {
        const months = await api("/months") as any[];
        const now = new Date();
        const current = months.find(
          (m: any) => m.month === now.getMonth() + 1 && m.year === now.getFullYear()
        );
        if (!current) return { error: "No month record for the current calendar month." };
        monthId = current.id;
      }
      return api(`/months/${monthId}`);
    },
  },
  {
    name: "search_transactions",
    description: "Search transactions with filters. All filters are optional.",
    inputSchema: z.object({
      query: z.string().optional().describe("Text to search in description"),
      type: z.enum(["INCOME", "SPENDING", "TRANSFER"]).optional(),
      status: z.enum(["PLANNED", "PAID", "PENDING", "SKIPPED"]).optional(),
      dateFrom: z.string().optional().describe("ISO date string YYYY-MM-DD"),
      dateTo: z.string().optional().describe("ISO date string YYYY-MM-DD"),
      amountMin: z.number().optional(),
      amountMax: z.number().optional(),
    }),
    handler: async (params: Record<string, any>) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString();
      return api(`/search?${qs}`);
    },
  },
  {
    name: "create_month",
    description: "Create a new month record for budget tracking. Optionally apply a budget template. Returns the created month.",
    inputSchema: z.object({
      month: z.number().min(1).max(12).describe("Month number 1-12"),
      year: z.number().describe("4-digit year, e.g. 2026"),
      budgetTemplateId: z.string().optional().describe("ID of a budget template to apply"),
    }),
    handler: async (data: { month: number; year: number; budgetTemplateId?: string }) => {
      return api("/months", { method: "POST", body: data });
    },
  },
  {
    name: "get_life_stats",
    description: "Get a comprehensive cross-module overview of finance, habits, fitness, goals, and notes. Use this for AI analysis and weekly reviews.",
    inputSchema: z.object({}),
    handler: async () => api("/stats/life-overview"),
  },
];
