// Seeds a showcase account with invented data, used for the marketing site's screenshots (website/public/screens).
// Run against a local stack (`node dev/start.mjs`): node dev/showcase-seed.mjs, then sign in as the account below.
const FE = process.env.FRONTEND_URL || "http://localhost:3000";
const BE = process.env.API_URL || "http://localhost:3001/api";
const EMAIL = "alex@hive.example", PASSWORD = "showcase-password-1", NAME = "Alex Morgan";

let seed = 20261007;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (a, b) => Math.round((a + rnd() * (b - a)) * 100) / 100;
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

async function auth() {
  const h = { "Content-Type": "application/json", Origin: FE };
  let r = await fetch(`${FE}/api/auth/sign-up/email`, { method: "POST", headers: h, body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: NAME }) });
  if (!r.ok) r = await fetch(`${FE}/api/auth/sign-in/email`, { method: "POST", headers: h, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  if (!r.ok) throw new Error("auth " + r.status + (await r.text()));
  const cookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const t = await (await fetch(`${FE}/api/auth/token`, { headers: { cookie } })).json();
  return t.accessToken;
}

const token = await auth();
async function api(path, method = "GET", body) {
  const r = await fetch(BE + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

if ((await api("/accounts")).length) { console.log("already seeded"); process.exit(0); }
await api("/me", "PATCH", { modules: ["investments", "habits", "fitness", "goals", "notes", "review"], onboarded: true });

const acc = {};
for (const [k, name, type] of [["main", "Everyday account", "checking"], ["save", "Savings", "savings"], ["invest", "Brokerage", "investment"]])
  acc[k] = (await api("/accounts", "POST", { name, type })).id;

const CATS = ["Salary", "Rent", "Groceries", "Dining out", "Transport", "Utilities", "Phone & internet", "Insurance", "Subscriptions", "Shopping", "Health", "Fun", "Gifts", "Travel", "Savings", "Investing", "Opening balance"];
const cat = {};
for (const name of CATS) cat[name] = (await api("/categories", "POST", { name })).id;

const tx = [];
const spend = (date, c, amount, description) => tx.push({ type: "SPENDING", date, categoryId: cat[c], amount, description, fromAccountId: acc.main, status: "PAID" });
const move = (date, c, to, amount, description) => tx.push({ type: "TRANSFER", date, categoryId: cat[c], amount, description, fromAccountId: acc.main, toAccountId: to, status: "PAID" });

// Opening balances, the month before the year shown.
tx.push({ type: "INCOME", date: "2025-09-30", categoryId: cat["Opening balance"], amount: 4200, description: "Opening balance", toAccountId: acc.main, status: "PAID" });
tx.push({ type: "INCOME", date: "2025-09-30", categoryId: cat["Opening balance"], amount: 16500, description: "Opening balance", toAccountId: acc.save, status: "PAID" });
tx.push({ type: "INCOME", date: "2025-09-30", categoryId: cat["Opening balance"], amount: 11800, description: "Opening balance", toAccountId: acc.invest, status: "PAID" });

// Oct 2025 .. Aug 2026 in full; September and October come from the budget template below.
const months = [];
for (let i = 0; i < 11; i++) { const d = new Date(Date.UTC(2025, 9 + i, 1)); months.push([d.getUTCFullYear(), d.getUTCMonth() + 1]); }
for (const [y, m] of months) {
  tx.push({ type: "INCOME", date: iso(y, m, 25), categoryId: cat.Salary, amount: m === 12 ? 9600 : 6400, description: m === 12 ? "Salary + bonus" : "Salary", toAccountId: acc.main, status: "PAID" });
  spend(iso(y, m, 1), "Rent", 1850, "Rent");
  spend(iso(y, m, 3), "Insurance", 310, "Health insurance");
  spend(iso(y, m, 5), "Phone & internet", 69, "Phone & internet");
  spend(iso(y, m, 12), "Utilities", between(110, 175), "Electricity & heating");
  spend(iso(y, m, 2), "Transport", 85, "Monthly travel pass");
  spend(iso(y, m, 8), "Subscriptions", 15.9, "Streaming");
  spend(iso(y, m, 9), "Subscriptions", 12.95, "Music");
  for (let k = 0; k < 7 + Math.floor(rnd() * 3); k++) spend(iso(y, m, 2 + Math.floor(rnd() * 26)), "Groceries", between(28, 135), pick(["Weekly shop", "Fresh market", "Corner grocer", "Bakery", "Farm box"]));
  for (let k = 0; k < 3 + Math.floor(rnd() * 4); k++) spend(iso(y, m, 1 + Math.floor(rnd() * 27)), "Dining out", between(18, 95), pick(["Pizza night", "Lunch with Sam", "Coffee & cake", "Sushi", "Brunch", "Thai takeaway"]));
  for (let k = 0; k < Math.floor(rnd() * 3); k++) spend(iso(y, m, 1 + Math.floor(rnd() * 27)), "Transport", between(12, 60), pick(["Taxi", "Bike repair", "Train tickets"]));
  for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) spend(iso(y, m, 1 + Math.floor(rnd() * 27)), "Shopping", between(25, 220), pick(["New shoes", "Bookshop", "Home bits", "Running jacket", "Plants"]));
  if (rnd() < 0.5) spend(iso(y, m, 1 + Math.floor(rnd() * 27)), "Health", between(18, 140), pick(["Pharmacy", "Dentist", "Physio"]));
  for (let k = 0; k < 1 + Math.floor(rnd() * 2); k++) spend(iso(y, m, 1 + Math.floor(rnd() * 27)), "Fun", between(15, 120), pick(["Cinema", "Concert tickets", "Climbing gym", "Board game café"]));
  if (m === 12) { spend(iso(y, m, 14), "Gifts", 420, "Holiday gifts"); spend(iso(y, m, 20), "Gifts", 160, "Holiday gifts"); }
  if (m === 2) spend(iso(y, m, 10), "Travel", 640, "Ski weekend");
  if (m === 7) { spend(iso(y, m, 6), "Travel", 980, "Summer flights"); spend(iso(y, m, 18), "Travel", 760, "Holiday apartment"); }
  if (rnd() < 0.3) spend(iso(y, m, 1 + Math.floor(rnd() * 27)), "Gifts", between(30, 90), "Birthday gift");
  move(iso(y, m, 26), "Savings", acc.save, 800, "Monthly savings");
  move(iso(y, m, 26), "Investing", acc.invest, 500, "Monthly investing");
}
for (let i = 0; i < tx.length; i += 400) await api("/transactions/import", "POST", { transactions: tx.slice(i, i + 400) });
console.log("transactions", tx.length);

// A typical month as a budget template, applied to September and October.
const budget = await api("/budgets", "POST", { name: "Typical month" });
const lines = [
  ["INCOME", 6400, "Salary", "Salary", { toAccountId: acc.main }],
  ["SPENDING", 1850, "Rent", "Rent"], ["SPENDING", 310, "Health insurance", "Insurance"], ["SPENDING", 69, "Phone & internet", "Phone & internet"],
  ["SPENDING", 140, "Electricity & heating", "Utilities"], ["SPENDING", 85, "Monthly travel pass", "Transport"], ["SPENDING", 29, "Streaming & music", "Subscriptions"],
  ["SPENDING", 620, "Groceries", "Groceries"], ["SPENDING", 240, "Eating out", "Dining out"], ["SPENDING", 150, "Shopping", "Shopping"], ["SPENDING", 90, "Going out", "Fun"],
  ["TRANSFER", 800, "Monthly savings", "Savings", { toAccountId: acc.save }], ["TRANSFER", 500, "Monthly investing", "Investing", { toAccountId: acc.invest }],
];
for (const [type, amount, description, c, extra] of lines)
  await api(`/budgets/${budget.id}/definitions`, "POST", { type, amount, description, categoryId: cat[c], ...(type !== "INCOME" && { fromAccountId: acc.main }), ...extra });

const DAY = { Salary: 25, Rent: 1, "Health insurance": 3, "Phone & internet": 5, "Electricity & heating": 12, "Monthly travel pass": 2, "Streaming & music": 8, Groceries: 15, "Eating out": 20, Shopping: 18, "Going out": 22, "Monthly savings": 26, "Monthly investing": 26 };
const allMonths = await api("/months");
for (const [y, m, paidAll] of [[2026, 9, true], [2026, 10, false]]) {
  let month = allMonths.find((x) => x.year === y && x.month === m) ?? (await api("/months", "POST", { year: y, month: m }));
  await api(`/months/${month.id}/apply-budget`, "POST", { budgetTemplateId: budget.id });
  const detail = await api(`/months/${month.id}`);
  for (const t of detail.transactions) {
    // Template lines land on the 1st; spread them over the month like real payments. This month's salary
    // came in early so the current month isn't empty.
    const day = !paidAll && t.description === "Salary" ? 1 : DAY[t.description] ?? 1;
    await api(`/transactions/${t.id}`, "PUT", { date: iso(y, m, day) });
    const paid = paidAll || ["Salary", "Rent", "Health insurance", "Phone & internet", "Monthly travel pass"].includes(t.description);
    if (paid) await api(`/transactions/${t.id}/status`, "PATCH", { status: "PAID" });
  }
  // The variable spending of the month on top of the plan.
  const extra = [];
  const days = paidAll ? 28 : 6;
  const add = (c, amount, description) => extra.push({ type: "SPENDING", date: iso(y, m, 1 + Math.floor(rnd() * days)), categoryId: cat[c], amount, description, fromAccountId: acc.main, status: "PAID", monthId: month.id });
  for (let k = 0; k < (paidAll ? 8 : 3); k++) add("Groceries", between(28, 120), pick(["Weekly shop", "Fresh market", "Corner grocer", "Bakery"]));
  for (let k = 0; k < (paidAll ? 5 : 2); k++) add("Dining out", between(18, 85), pick(["Pizza night", "Lunch with Sam", "Sushi", "Brunch"]));
  if (paidAll) { add("Shopping", 89.9, "Running jacket"); add("Fun", 64, "Concert tickets"); add("Health", 32.5, "Pharmacy"); }
  await api("/transactions/import", "POST", { transactions: extra });
}

// Life: habits with six weeks of check-ins, goals, fitness and notes.
const today = new Date();
const dayIso = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
for (const [i, [name, rate]] of [["Morning walk", 0.85], ["Read 20 pages", 0.75], ["Stretch for 10 minutes", 0.6], ["No screens after 10pm", 0.5]].entries()) {
  const h = await api("/habits", "POST", { name, frequency: "DAILY" });
  // The first two are already checked in today.
  for (let n = 42; n >= (i < 2 ? 0 : 1); n--) if (n === 0 || rnd() < rate) await api(`/habits/${h.id}/logs`, "POST", { date: dayIso(n), completed: true });
}
const g1 = await api("/goals", "POST", { title: "Emergency fund", type: "FINANCIAL", targetValue: 15000, startValue: 0, unit: "$", deadline: "2027-06-30", description: "Six months of expenses, set aside." });
await api(`/goals/${g1.id}/progress`, "PATCH", { currentValue: 9600 });
const m1 = await api(`/goals/${g1.id}/milestones`, "POST", { title: "First $5,000", targetValue: 5000 });
await api(`/goals/milestones/${m1.id}/complete`, "PATCH");
await api(`/goals/${g1.id}/milestones`, "POST", { title: "Three months covered", targetValue: 7500 });
await api(`/goals/${g1.id}/milestones`, "POST", { title: "Fully funded", targetValue: 15000 });
const g2 = await api("/goals", "POST", { title: "Run a half marathon", type: "FITNESS", targetValue: 21.1, startValue: 5, unit: "km", deadline: "2027-04-12" });
await api(`/goals/${g2.id}/progress`, "PATCH", { currentValue: 14 });
const g3 = await api("/goals", "POST", { title: "Read 24 books this year", type: "PERSONAL", targetValue: 24, startValue: 0, unit: "books", deadline: "2026-12-31" });
await api(`/goals/${g3.id}/progress`, "PATCH", { currentValue: 17 });
for (let w = 12; w >= 0; w--) await api("/fitness", "POST", { type: "WEIGHT", value: Math.round((74.6 - (12 - w) * 0.2 + between(-0.3, 0.3)) * 10) / 10, unit: "kg", date: dayIso(w * 7 + 1) });
for (let n = 10; n >= 1; n--) await api("/fitness", "POST", { type: "STEPS", value: Math.round(between(6500, 13500)), unit: "steps", date: dayIso(n) });
for (const [title, content, tags] of [
  ["Ideas for the autumn trip", "Lake weekend in late October: book the cabin before the 15th. Budget around $600 including trains.", ["travel"]],
  ["Money check-in, September", "Eating out ran a little over plan. Groceries were fine. Keep the monthly savings transfer at $800.", ["money"]],
  ["Books to read next", "The Psychology of Money; Four Thousand Weeks; Project Hail Mary.", ["reading"]],
]) await api("/notes", "POST", { title, content, tags });
console.log("done");
