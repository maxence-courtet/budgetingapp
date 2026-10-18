import { z } from "zod";
import { api } from "../client";

export const investmentTools = [
  {
    name: "get_portfolio",
    description:
      "Get current investment portfolio with live market prices, holdings, cost basis, and gain/loss per position, " +
      "plus each investment account with its cash, holdings value and total.",
    inputSchema: z.object({}),
    handler: async () => api("/investments/portfolio"),
  },
  {
    name: "log_trade",
    description:
      "Record an investment trade (buy or sell) in an investment account (account type 'investment'). " +
      "A buy takes quantity × price + fees from that account's cash; a sell adds quantity × price − fees. " +
      "Money moved to the broker should be logged first as a TRANSFER into the account.",
    inputSchema: z.object({
      ticker: z.string().describe("Stock/crypto ticker symbol, e.g. AAPL, BTC-USD"),
      assetType: z.enum(["STOCK", "ETF", "CRYPTO", "OTHER"]),
      tradeType: z.enum(["BUY", "SELL"]),
      accountId: z.string().describe("Investment account ID"),
      quantity: z.number().positive(),
      pricePerUnit: z.number().positive(),
      fees: z.number().default(0),
      currency: z.string().optional().describe("Currency of the price and fees, e.g. USD; default the user's currency"),
      fxRate: z
        .number()
        .positive()
        .optional()
        .describe("Value of 1 unit of `currency` in the user's currency on the trade date; looked up if omitted"),
      date: z.string().describe("ISO date YYYY-MM-DD"),
      notes: z.string().optional(),
    }),
    handler: async (data: any) => {
      return api("/investments/trades", { method: "POST", body: data });
    },
  },
  {
    name: "add_investment_fee",
    description:
      "Record a fee an investment account charges on its own (custody, management, account fee). It is taken from " +
      "that account's cash as paid spending under the 'Investment fees' category. Fees of a single trade go on the trade.",
    inputSchema: z.object({
      accountId: z.string().describe("Investment account ID"),
      amount: z.number().positive(),
      date: z.string().optional().describe("ISO date YYYY-MM-DD, default today"),
      description: z.string().optional().describe("e.g. 'Custody fee Q3'"),
    }),
    handler: async (data: any) => api("/investments/fees", { method: "POST", body: data }),
  },
  {
    name: "get_market_price",
    description: "Get the current market price for a ticker symbol.",
    inputSchema: z.object({
      ticker: z.string().describe("Ticker symbol, e.g. AAPL, MSFT, BTC-USD"),
    }),
    handler: async ({ ticker }: { ticker: string }) => {
      return api(`/investments/market-price/${encodeURIComponent(ticker)}`);
    },
  },
];
