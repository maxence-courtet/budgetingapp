// Drives the real Hive app through each tutorial flow and records, for every step, a phone screenshot
// and where the finger taps next. compose.mjs turns these into narrated videos.
//
// Needs the app running locally with the showcase account (invented data):
//   FE=http://localhost:3000 BE=http://localhost:3001/api node marketing/tutorials/capture.mjs [video-id]
import { chromium } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = process.env.FE ?? "http://localhost:3000";
const BE = process.env.BE ?? "http://localhost:3001/api";
const EMAIL = process.env.SHOWCASE_EMAIL ?? "alex@hive.example";
const PASSWORD = process.env.SHOWCASE_PASSWORD ?? "showcase-password-1";
const VIEWPORT = { width: 414, height: 818 };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: "light" });
await ctx.addInitScript(() => {
  localStorage.setItem("lh-theme", "light");
  localStorage.setItem("hive.currency", "CHF");
});
const signIn = await ctx.request.post(`${FE}/api/auth/sign-in/email`, { data: { email: EMAIL, password: PASSWORD }, headers: { Origin: FE } });
if (!signIn.ok()) throw new Error(`Sign-in failed (${signIn.status()}): is the showcase account seeded?`);
const token = (await (await ctx.request.get(`${FE}/api/auth/token`)).json()).accessToken;
const api = async (path, method = "GET", data) => {
  const r = await ctx.request.fetch(BE + path, { method, data, headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok()) throw new Error(`${method} ${path} → ${r.status()} ${await r.text()}`);
  return r.status() === 204 ? null : r.json();
};
await api("/me", "PATCH", { currency: "CHF" });
const p = await ctx.newPage();

/** Records one video: `steps` = [{ img, tap }] where tap is where the finger goes before the next image. */
function recorder(id) {
  const dir = join(HERE, "captures", id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const steps = [];
  let n = 0;
  const shot = async () => {
    const file = join(dir, `${String(n++).padStart(2, "0")}.png`);
    await p.screenshot({ path: file });
    return basename(file);
  };
  return {
    /** Screenshot, then tap `locator` (finger position recorded) and run `action`. */
    async tap(locator, action = (l) => l.click(), settle = 1000) {
      const loc = locator.first();
      await loc.scrollIntoViewIfNeeded();
      await p.waitForTimeout(300);
      const img = await shot();
      const box = await loc.boundingBox();
      steps.push({ img, tap: box ? { x: (box.x + box.width / 2) / VIEWPORT.width, y: (box.y + box.height / 2) / VIEWPORT.height } : null });
      await action(loc);
      await p.waitForTimeout(settle);
    },
    /** A screenshot with no tap after it (e.g. to pause on a result). */
    async still() {
      steps.push({ img: await shot(), tap: null });
    },
    save() {
      writeFileSync(join(dir, "steps.json"), JSON.stringify({ viewport: VIEWPORT, steps }, null, 2));
      console.log("✓", id, steps.length, "steps");
    },
  };
}

async function go(path) {
  await p.goto(FE + path);
  await p.waitForTimeout(2500);
  // The welcome walkthrough and the tour never show in tutorials.
  await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await p.waitForTimeout(200);
}

const only = process.argv[2];
const VIDEOS = {
  // Log a purchase from the + button.
  async "1-add-transaction"() {
    const r = recorder("1-add-transaction");
    await go("/");
    await r.tap(p.locator('nav[aria-label="Sections"] [aria-label="New transaction"]'));
    await r.tap(p.locator("#tx-amount"), (l) => l.fill("18.50"));
    await r.tap(p.locator("#tx-description"), (l) => l.fill("Lunch with Sara"));
    await r.tap(p.locator("#tx-category"), async (l) => {
      await l.selectOption({ label: "Dining out" });
      await p.locator("#tx-from-account").selectOption({ label: "Everyday account" });
    });
    const before = await api("/transactions?limit=1").catch(() => null);
    await r.tap(p.locator('dialog[open] button[type="submit"]'), (l) => l.click(), 1500);
    await r.tap(p.locator('nav[aria-label="Sections"] a', { hasText: "Money" }), (l) => l.click(), 2500);
    await r.tap(p.locator("main a", { hasText: "October" }), (l) => l.click(), 2500);
    await r.still();
    r.save();
    // Remove the tutorial transaction again so the showcase data stays as it was.
    const txns = await api("/search?query=Lunch%20with%20Sara").catch(() => null);
    const list = Array.isArray(txns) ? txns : txns?.transactions ?? [];
    for (const t of list.filter((t) => t.description === "Lunch with Sara")) await api(`/transactions/${t.id}`, "DELETE");
    void before;
  },

  // A budget template, applied to a new month, then ticking an item off.
  async "2-plan-month"() {
    const r = recorder("2-plan-month");
    const months = await api("/months");
    for (const m of months.filter((m) => m.year === 2026 && m.month === 11)) await api(`/months/${m.id}`, "DELETE");
    const nov = await api("/months", "POST", { year: 2026, month: 11 });
    await go("/budgets");
    await r.tap(p.locator("main a", { hasText: "Typical month" }), (l) => l.click(), 2500);
    await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
    await r.still();
    await p.evaluate(() => {
      const el = [...document.querySelectorAll("p,h2,h3,span")].find((e) => /where (it|the plan)/i.test(e.textContent ?? ""));
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70);
    });
    await p.waitForTimeout(600);
    await r.still();
    await go(`/months/${nov.id}`);
    await r.tap(p.getByRole("button", { name: /Apply a budget template/ }));
    await r.tap(p.locator("#apply-budget"), (l) => l.selectOption({ label: "Typical month" }));
    await r.tap(p.getByRole("button", { name: "Apply", exact: true }), (l) => l.click(), 2500);
    await p.evaluate(() => window.scrollTo(0, 0));
    await r.tap(p.locator('[aria-label^="Status: planned"]'), (l) => l.click(), 1500);
    await p.evaluate(() => window.scrollTo(0, 0));
    await r.still();
    r.save();
    await api(`/months/${nov.id}`, "DELETE");
  },

  // Reports: the ring for a month, a category, then net worth over time.
  async "3-where-it-went"() {
    const r = recorder("3-where-it-went");
    await go("/");
    await r.tap(p.locator('nav[aria-label="Sections"] a', { hasText: "Money" }), (l) => l.click(), 2500);
    await r.tap(p.locator('[data-tour="reports"]:visible'), (l) => l.click(), 2500);
    await r.tap(p.getByRole("button", { name: "By month" }).or(p.getByRole("tab", { name: "By month" })), (l) => l.click(), 2000);
    await r.tap(p.locator("select").first(), async (l) => {
      const v = await l.locator("option", { hasText: "September 2026" }).getAttribute("value");
      await l.selectOption(v);
    }, 2500);
    await p.evaluate(() => {
      const el = [...document.querySelectorAll("p,h2,h3,span")].find((e) => /where it went/i.test(e.textContent ?? ""));
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70);
    });
    await p.waitForTimeout(500);
    await r.still();
    // The bottom bar hides while scrolling down; a small scroll up brings it back.
    await p.mouse.wheel(0, -120);
    await p.waitForTimeout(600);
    await r.tap(p.locator('nav[aria-label="Sections"] a', { hasText: "Home" }), () => go("/"), 500);
    await r.tap(p.getByRole("button", { name: "All", exact: true }), (l) => l.click(), 2000);
    await r.still();
    r.save();
  },
};

for (const [id, run] of Object.entries(VIDEOS)) if (!only || id.startsWith(only)) await run();
await browser.close();
