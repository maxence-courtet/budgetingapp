// One-off: copy one user's Hive data from one database to another user in another database.
// Runs as a temporary Railway service (the databases are only reachable from Railway).
//
//   MODE=inspect  report what each database holds for the users (read-only)
//   MODE=copy     copy SOURCE_EMAIL's rows in SOURCE_DB to TARGET_EMAIL in TARGET_DB (target must have no data)
//
// Env: SOURCE_DB, TARGET_DB, OLD_DB (optional, inspected only), SOURCE_EMAIL, TARGET_EMAIL, OLD_EMAIL.
import pg from "pg";

// Parents before children, so foreign keys are satisfied while inserting.
const TABLES = [
  "Account", "Category", "BudgetTemplate", "BudgetTransactionDefinition", "Month", "Transaction",
  "InvestmentTrade", "Habit", "HabitLog", "FitnessEntry", "Goal", "GoalMilestone", "FitnessPlan",
  "FitnessPlanDay", "Note", "NetWorthSnapshot",
];
// Preferences carried over with the data (not plan, sign-in or terms fields).
const USER_FIELDS = ["currency", "modules", "onboardedAt", "healthConsentAt"];

const env = process.env;
const ssl = (url) => (url && !url.includes(".railway.internal") ? { rejectUnauthorized: false } : false);
async function connect(url) {
  const c = new pg.Client({ connectionString: url, ssl: ssl(url) });
  await c.connect();
  return c;
}
const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);

async function tablesWithUser(c) {
  const rows = await q(c, `SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='userId'`);
  return new Set(rows.map((r) => r.table_name));
}

async function findUser(c, email) {
  // "*": the user with the most transactions (older databases didn't store emails).
  if (email === "*") {
    const [u] = await q(c, `SELECT u.* FROM "User" u JOIN "Transaction" t ON t."userId"=u.id GROUP BY u.id ORDER BY count(*) DESC LIMIT 1`);
    return u ?? null;
  }
  const [u] = await q(c, `SELECT * FROM "User" WHERE lower(email)=lower($1) ORDER BY "createdAt" LIMIT 1`, [email]);
  return u ?? null;
}

async function report(label, c, email) {
  const console = { log: (...a) => globalThis.console.log(`[${label}]`, ...a) };
  console.log(`=== ${email} ===`);
  const users = await q(c, `SELECT email, "createdAt" FROM "User" ORDER BY "createdAt"`);
  console.log(`users in database: ${users.length} → ${users.map((u) => u.email).join(", ")}`);
  const u = await findUser(c, email);
  if (!u) return console.log("no such user");
  const have = await tablesWithUser(c);
  const counts = {};
  for (const t of TABLES) if (have.has(t)) counts[t] = +(await q(c, `SELECT count(*) FROM "${t}" WHERE "userId"=$1`, [u.id]))[0].count;
  console.log("rows:", JSON.stringify(counts));
  if (have.has("Month")) {
    const months = await q(c, `
      SELECT m.year, m.month, (SELECT count(*) FROM "Transaction" t WHERE t."monthId"=m.id) AS txns,
             (SELECT count(*) FROM "Transaction" t WHERE t."monthId"=m.id AND (extract(year FROM t.date)<>m.year OR extract(month FROM t.date)<>m.month)) AS outside
      FROM "Month" m WHERE m."userId"=$1 ORDER BY m.year, m.month`, [u.id]);
    console.log("months (year-month: transactions, dated outside the month):");
    console.log("  " + months.map((m) => `${m.year}-${String(m.month).padStart(2, "0")}: ${m.txns}${+m.outside ? ` (${m.outside} outside)` : ""}`).join(" · "));
    const orphans = +(await q(c, `SELECT count(*) FROM "Transaction" WHERE "userId"=$1 AND "monthId" IS NULL`, [u.id]))[0].count;
    console.log(`transactions without a month: ${orphans}`);
  }
}

async function copy(src, dst) {
  const from = await findUser(src, env.SOURCE_EMAIL);
  const to = await findUser(dst, env.TARGET_EMAIL);
  if (!from || !to) throw new Error(`user missing: source ${!!from}, target ${!!to}`);
  for (const t of TABLES) {
    const n = +(await q(dst, `SELECT count(*) FROM "${t}" WHERE "userId"=$1`, [to.id]))[0].count;
    if (n) throw new Error(`target already has ${n} rows in ${t}; not copying over existing data`);
  }
  const dstCols = async (t) => (await q(dst, `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [t])).map((r) => r.column_name);
  await dst.query("BEGIN");
  try {
    for (const t of TABLES) {
      const rows = await q(src, `SELECT * FROM "${t}" WHERE "userId"=$1`, [from.id]);
      if (!rows.length) continue;
      const cols = (await dstCols(t)).filter((c) => c in rows[0]);
      for (const r of rows) {
        r.userId = to.id;
        const vals = cols.map((c) => r[c]);
        await dst.query(`INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})`, vals);
      }
      console.log(`copied ${rows.length} ${t}`);
    }
    const prefs = Object.fromEntries(USER_FIELDS.filter((f) => f in from).map((f) => [f, from[f]]));
    const keys = Object.keys(prefs);
    if (keys.length) await dst.query(`UPDATE "User" SET ${keys.map((k, i) => `"${k}"=$${i + 2}`).join(",")} WHERE id=$1`, [to.id, ...keys.map((k) => prefs[k])]);
    console.log("copied preferences:", keys.join(", "));
    await dst.query("COMMIT");
  } catch (e) {
    await dst.query("ROLLBACK");
    throw e;
  }
}

/** Old-database transactions with no match (same date, amount and description) in the target. */
async function missingFromTarget(old, dst) {
  const ou = await findUser(old, env.OLD_EMAIL ?? "*");
  const tu = await findUser(dst, env.TARGET_EMAIL);
  const key = (t) => `${new Date(t.date).toISOString().slice(0, 10)}|${(+t.amount).toFixed(2)}|${t.description ?? ""}`;
  const have = new Map();
  for (const t of await q(dst, `SELECT date, amount, description FROM "Transaction" WHERE "userId"=$1`, [tu.id])) have.set(key(t), (have.get(key(t)) ?? 0) + 1);
  const missing = [];
  for (const t of await q(old, `SELECT t.date, t.amount, t.description, t.type, t.status, c.name AS category FROM "Transaction" t LEFT JOIN "Category" c ON c.id=t."categoryId" WHERE t."userId"=$1 ORDER BY t.date`, [ou.id])) {
    const k = key(t);
    if (have.get(k)) have.set(k, have.get(k) - 1);
    else missing.push(t);
  }
  console.log(`[diff] ${missing.length} old-production transaction(s) not in the target:`);
  for (const t of missing) console.log(`[diff]   ${new Date(t.date).toISOString().slice(0, 10)} ${t.type} ${(+t.amount).toFixed(2)} "${t.description ?? ""}" (${t.category ?? "?"}, ${t.status})`);
}

const src = await connect(env.SOURCE_DB);
const dst = await connect(env.TARGET_DB);
const old = env.OLD_DB ? await connect(env.OLD_DB).catch((e) => (console.log("old database:", e.message), null)) : null;
try {
  if (env.MODE === "copy") {
    await copy(src, dst);
    await report("target after copy", dst, env.TARGET_EMAIL);
    if (old) await missingFromTarget(old, dst).catch((e) => console.log("diff:", e.message));
  } else {
    await report("source", src, env.SOURCE_EMAIL);
    await report("target", dst, env.TARGET_EMAIL);
    if (old) await report("old production", old, env.OLD_EMAIL ?? env.SOURCE_EMAIL).catch((e) => console.log("old production:", e.message));
  }
  console.log("\nDONE");
} catch (e) {
  console.error("FAILED:", e.message);
} finally {
  await Promise.all([src, dst, old].filter(Boolean).map((c) => c.end()));
  // Stay idle so Railway doesn't restart the one-off job; the service is deleted afterwards.
  setInterval(() => {}, 1 << 30);
}
