import { z } from "zod";
import { api } from "../client.js";

export const investmentTools = [
  {
    name: "get_portfolio",
    description: "Get current investment portfolio with live market prices, holdings, cost basis, and gain/loss per position.",
    inputSchema: z.object({}),
    handler: async () => api("/investments/portfolio"),
  },
  {
    name: "log_trade",
    description: "Record an investment trade (buy or sell). Creates a pending trade for user validation.",
    inputSchema: z.object({
      ticker: z.string().describe("Stock/crypto ticker symbol, e.g. AAPL, BTC-USD"),
      assetType: z.enum(["STOCK", "ETF", "CRYPTO", "OTHER"]),
      tradeType: z.enum(["BUY", "SELL"]),
      accountId: z.string().describe("Investment account ID"),
      quantity: z.number().positive(),
      pricePerUnit: z.number().positive(),
      fees: z.number().default(0),
      date: z.string().describe("ISO date YYYY-MM-DD"),
      notes: z.string().optional(),
    }),
    handler: async (data: any) => {
      return api("/investments/trades", { method: "POST", body: data });
    },
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
