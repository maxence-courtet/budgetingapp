import { z } from "zod";
import { api } from "../client";

// Tools for setting up money tracking: accounts, categories, budget templates and transactions, including bulk
// import of existing history. Everything is created for the signed-in user only.

const TX_TYPES = ["INCOME", "SPENDING", "TRANSFER"] as const;
const TX_STATUSES = ["PLANNED", "PAID", "PENDING", "SKIPPED"] as const;

type Named = { id: string; name: string };

/**
 * Lets tools take account and category names as well as IDs: `category`, `toCategory`, `fromAccount` and
 * `toAccount` (names, case-insensitive) fill in `categoryId`, `toCategoryId`, `fromAccountId` and `toAccountId`.
 */
async function nameResolver() {
  const [accounts, categories] = (await Promise.all([api("/accounts"), api("/categories")])) as [Named[], Named[]];
  const index = (xs: Named[]) => new Map(xs.flatMap((x) => [[x.id, x.id], [x.name.trim().toLowerCase(), x.id]]));
  const accountIds = index(accounts);
  const categoryIds = index(categories);
  const unknown = new Set<string>();
  const pick = (map: Map<string, string>, kind: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const id = map.get(String(value).trim().toLowerCase()) ?? map.get(String(value));
    if (!id) unknown.add(`${kind} "${value}"`);
    return id;
  };
  return {
    resolve(row: Record<string, any>) {
      const { category, toCategory, fromAccount, toAccount, ...rest } = row;
      return {
        ...rest,
        categoryId: pick(categoryIds, "category", rest.categoryId ?? category),
        toCategoryId: pick(categoryIds, "category", rest.toCategoryId ?? toCategory),
        fromAccountId: pick(accountIds, "account", rest.fromAccountId ?? fromAccount),
        toAccountId: pick(accountIds, "account", rest.toAccountId ?? toAccount),
      };
    },
    check() {
      if (unknown.size) throw new Error(`Not found (create them first): ${[...unknown].join(", ")}`);
    },
  };
}

/** Minimal RFC 4180 CSV: header row, comma-separated, double quotes for fields containing commas/quotes/newlines. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()]).filter(([, v]) => v !== "")));
}

const moneyFlow = {
  type: z.enum(TX_TYPES).describe("SPENDING needs a from account, INCOME a to account, TRANSFER both"),
  amount: z.number().positive(),
  description: z.string().optional(),
  categoryId: z.string().optional().describe("Category ID, or give `category` (name) instead"),
  category: z.string().optional().describe("Category name"),
  fromAccountId: z.string().optional().describe("Account the money leaves (SPENDING, TRANSFER)"),
  fromAccount: z.string().optional().describe("...or its name"),
  toAccountId: z.string().optional().describe("Account the money arrives in (INCOME, TRANSFER)"),
  toAccount: z.string().optional().describe("...or its name"),
  toCategoryId: z.string().optional().describe("TRANSFER only: category on the receiving side"),
  toCategory: z.string().optional().describe("...or its name"),
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
      const names = await nameResolver();
      lines = lines.map((l) => names.resolve(l));
      names.check();
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
    handler: async ({ monthId, ...input }: z.infer<typeof transaction>) => {
      const names = await nameResolver();
      const t = names.resolve(input);
      names.check();
      if (monthId) return api("/transactions", { method: "POST", body: { ...t, monthId } });
      // Without a month, the import endpoint finds or creates the month the date falls in.
      return api("/transactions/import", { method: "POST", body: { transactions: [t] } });
    },
  },
  {
    name: "import_transactions",
    description:
      "Bulk-create up to 500 transactions in one call (all or nothing), e.g. to bring in history from a bank export or " +
      "another app. Pass either `transactions` (objects) or `csv` text with a header row using the same field names: " +
      "date,type,amount,status,category,fromAccount,toAccount,toCategory,description (IDs also accepted). Accounts and " +
      "categories are matched by name or ID and must exist first. Months are matched or created from each date.",
    inputSchema: z.object({
      transactions: z.array(transaction).max(500).optional(),
      csv: z.string().optional().describe("CSV text with a header row; at most 500 data rows"),
    }),
    handler: async ({ transactions, csv }: { transactions?: Record<string, any>[]; csv?: string }) => {
      const rows: Record<string, any>[] = csv
        ? parseCsv(csv).map((r) => ({ ...r, amount: Number(r.amount) }))
        : transactions ?? [];
      if (rows.length === 0) throw new Error("Nothing to import: pass `transactions` or `csv`");
      if (rows.length > 500) throw new Error(`At most 500 transactions per call (got ${rows.length})`);
      const names = await nameResolver();
      const resolved = rows.map((r) => names.resolve(r));
      names.check();
      return api("/transactions/import", { method: "POST", body: { transactions: resolved } });
    },
  },
];
