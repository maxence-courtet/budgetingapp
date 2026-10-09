/** Currencies amounts can be shown in; keep in step with CURRENCIES in backend/src/routes/me.ts. */
export const CURRENCIES: { code: string; name: string }[] = [
  { code: "CHF", name: "Swiss franc" },
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US dollar" },
  { code: "GBP", name: "British pound" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "AUD", name: "Australian dollar" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "JPY", name: "Japanese yen" },
  { code: "CNY", name: "Chinese yuan" },
  { code: "HKD", name: "Hong Kong dollar" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "INR", name: "Indian rupee" },
  { code: "SEK", name: "Swedish krona" },
  { code: "NOK", name: "Norwegian krone" },
  { code: "DKK", name: "Danish krone" },
  { code: "PLN", name: "Polish złoty" },
  { code: "CZK", name: "Czech koruna" },
  { code: "HUF", name: "Hungarian forint" },
  { code: "BRL", name: "Brazilian real" },
  { code: "MXN", name: "Mexican peso" },
  { code: "ZAR", name: "South African rand" },
];

export const DEFAULT_CURRENCY = "USD";
/** Remembers the last currency on this device so amounts don't switch after the first paint. */
export const CURRENCY_STORAGE_KEY = "hive.currency";
