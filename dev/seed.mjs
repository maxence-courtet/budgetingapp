// Creates the demo account and fills it with sample data through the real sign-up and API
// (run by start.mjs on first launch). Usage: cd dev && npm run seed   (frontend and backend must be running)
const APP = "http://localhost:3000";
const API = "http://localhost:3001/api";
const DEMO = { email: "demo@hive.local", password: "hive-demo-password", name: "Demo" };

// Sign up (or in, if the account already exists) and exchange the session for an API token, like the web app does.
async function demoToken() {
  const headers = { "Content-Type": "application/json", Origin: APP };
  let r = await fetch(`${APP}/api/auth/sign-up/email`, { method: "POST", headers, body: JSON.stringify(DEMO) });
  if (!r.ok) r = await fetch(`${APP}/api/auth/sign-in/email`, { method: "POST", headers, body: JSON.stringify(DEMO) });
  if (!r.ok) throw new Error(`Could not sign in the demo account: ${r.status} ${await r.text()}`);
  const cookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const t = await fetch(`${APP}/api/auth/token`, { headers: { Cookie: cookie } });
  const { accessToken } = await t.json();
  if (!accessToken) throw new Error("Could not get an API token for the demo account");
  return accessToken;
}

const H = { "Content-Type": "application/json", Authorization: `Bearer ${await demoToken()}` };
async function post(path, body) {
  const r = await fetch(API + path, { method: "POST", headers: H, body: JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${path} ${r.status} ${JSON.stringify(j)}`);
  return j;
}
const today = new Date();
const d = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);
const checking = await post("/accounts", { name: "Main Checking", type: "CHECKING" });
const savings = await post("/accounts", { name: "Savings", type: "SAVINGS" });
const cats = {};
for (const n of ["Salary", "Rent", "Groceries", "Dining Out", "Transport", "Savings Transfer"]) cats[n] = (await post("/categories", { name: n })).id;
const month = await post("/months", { month: today.getMonth() + 1, year: today.getFullYear() });
const tx = [
  ["INCOME", 3, 5200, "Salary", "Salary", { toAccountId: checking.id }],
  ["SPENDING", 3, 1650, "Rent", "Rent", { fromAccountId: checking.id }],
  ["SPENDING", 2, 142.3, "Weekly groceries", "Groceries", { fromAccountId: checking.id }],
  ["SPENDING", 1, 68.5, "Dinner with friends", "Dining Out", { fromAccountId: checking.id }],
  ["SPENDING", 1, 45, "Lunch out", "Dining Out", { fromAccountId: checking.id }],
  ["SPENDING", 0, 89, "Monthly transit pass", "Transport", { fromAccountId: checking.id }],
  ["TRANSFER", 2, 800, "Monthly savings", "Savings Transfer", { fromAccountId: checking.id, toAccountId: savings.id }],
];
for (const [type, ago, amount, description, cat, accts] of tx)
  await post("/transactions", { type, date: d(ago), amount, description, status: "PAID", categoryId: cats[cat], monthId: month.id, ...accts });
const habits = [];
for (const [name, rate] of [["Morning run", 0.6], ["Read 20 minutes", 0.9], ["No sugar", 0.3]]) {
  const h = await post("/habits", { name, frequency: "DAILY" }); habits.push(h);
  for (let i = 0; i < 7; i++) if ((i * 37 + name.length) % 10 < rate * 10) await post(`/habits/${h.id}/logs`, { date: d(i), completed: true });
}
for (let i = 0; i < 6; i++) await post("/fitness", { type: "WEIGHT", value: 79.4 - i * 0.3, unit: "kg", date: d(25 - i * 5) });
await post("/fitness", { type: "BODY_FAT", value: 19.2, unit: "%", date: d(2) });
await post("/fitness", { type: "STEPS", value: 8432, unit: "steps", date: d(1) });
await post("/fitness", { type: "WEIGHT", value: 77.6, unit: "kg", date: d(0), source: "MCP" });
await post("/goals", { title: "Emergency fund", type: "FINANCIAL", targetValue: 10000, unit: "EUR", deadline: d(-180) });
const weightGoal = await post("/goals", { title: "Reach 76 kg", type: "FITNESS", targetValue: 76, startValue: 79.4, unit: "kg", deadline: d(-20) });
await fetch(`${API}/goals/${weightGoal.id}/progress`, { method: "PATCH", headers: H, body: JSON.stringify({ currentValue: 77.6 }) });
await post("/goals", { title: "Read 12 books this year", type: "PERSONAL", targetValue: 12, unit: "books", deadline: d(-88) });
await post("/notes", { title: "Q4 priorities", content: "- Build the emergency fund\n- Run 3x per week\n- Cut dining out", tags: ["planning", "finance"] });
await post("/notes", { title: "Workout ideas", content: "Try interval runs on Tuesdays.", tags: ["fitness"] });
console.log("SEEDED");
