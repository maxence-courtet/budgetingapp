// Renders Hive's Instagram visuals: feed posts (1080×1350), a carousel, stories and reels (1080×1920).
// Every visual is an HTML template below; reels are animated with the Web Animations API, paused, and
// captured frame by frame so the videos are smooth and deterministic.
//
//   node marketing/instagram/build.mjs            # everything
//   node marketing/instagram/build.mjs post-ring  # only items whose id starts with this
//
// Needs Playwright (Chromium) and ffmpeg. Output goes to marketing/instagram/out/.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const ASSETS = pathToFileURL(join(HERE, "assets")).href;
const FPS = 30;

// ─── Brand ───────────────────────────────────────────────────────────────────

const HONEYCOMB = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z' fill='%23000'/%3E%3C/svg%3E")`;

const mark = (size, outline = "currentColor") => `
<svg width="${size}" height="${size}" viewBox="0 0 37.84 37.77" aria-hidden="true">
  <polygon points="18.92,0 27.58,5 27.58,15 18.92,20 10.26,15 10.26,5" fill="#F5B31F"/>
  <g fill="none" stroke="${outline}" stroke-width="3" stroke-linejoin="round">
    <polygon points="8.66,19.27 16.02,23.52 16.02,32.02 8.66,36.27 1.3,32.02 1.3,23.52"/>
    <polygon points="29.18,19.27 36.54,23.52 36.54,32.02 29.18,36.27 21.82,32.02 21.82,23.52"/>
  </g>
</svg>`;

const logo = (size = 56) =>
  `<span class="logo">${mark(size)}<span style="font-size:${size * 0.82}px">hive</span></span>`;

const CSS = `
@font-face { font-family: Geist; src: url(${ASSETS}/Geist-Variable.woff2); font-weight: 100 900; }
@font-face { font-family: GeistMono; src: url(${ASSETS}/GeistMono-Variable.woff2); font-weight: 100 900; }
:root { --honey: #F5B31F; --honey-soft: #FDF1D3; --ink: #0B0B0C; --paper: #FAFAF8; --muted: #66666C; --line: #E7E5DF; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; }
body { font-family: Geist, system-ui, sans-serif; color: var(--ink); background: var(--paper); overflow: hidden;
  -webkit-font-smoothing: antialiased; letter-spacing: -0.02em; }
.frame { position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; padding: 96px 88px; }
.dark { background: var(--ink); color: var(--paper); }
.honey { background: var(--honey); color: var(--ink); }
.comb { position: absolute; inset: 0; background-image: ${HONEYCOMB}; background-size: 84px 147px; opacity: .06; pointer-events: none;
  -webkit-mask-image: radial-gradient(ellipse at 50% 35%, black 15%, transparent 75%); }
.dark .comb { filter: invert(1); opacity: .09; }
.honey .comb { opacity: .1; }
.logo { display: inline-flex; align-items: center; gap: 14px; font-weight: 800; letter-spacing: -0.06em; line-height: 1; }
.eyebrow { font-family: GeistMono, monospace; font-size: 26px; letter-spacing: .16em; text-transform: uppercase; color: #9A6A00; }
.dark .eyebrow { color: var(--honey); }
h1 { font-size: 104px; line-height: .98; font-weight: 650; letter-spacing: -0.045em; }
h1 .hl { position: relative; white-space: nowrap; }
h1 .hl::after { content: ""; position: absolute; left: 0; right: 0; bottom: .06em; height: .26em; background: var(--honey); opacity: .75; z-index: -1; border-radius: 4px; }
.dark h1 .hl::after { opacity: .9; }
.sub { font-size: 40px; line-height: 1.3; color: var(--muted); letter-spacing: -0.015em; }
.dark .sub { color: #B4B4B8; }
.honey .sub { color: #3A2C00; }
.foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; font-size: 30px; font-weight: 600; z-index: 1; }
.pill { height: 64px; padding: 0 28px; border-radius: 999px; display: inline-flex; align-items: center; gap: 12px;
  background: var(--ink); color: var(--paper); font-weight: 600; font-size: 28px; }
.dark .pill { background: var(--honey); color: var(--ink); }
.phone { position: relative; border-radius: 96px; border: 16px solid var(--ink); background: var(--ink); overflow: hidden;
  box-shadow: 0 60px 120px -50px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.06) inset; }
.dark .phone { border-color: #2A2A2E; box-shadow: 0 60px 140px -40px rgba(245,179,31,.25); }
.phone img { display: block; width: 100%; }
.phone::before { content: ""; position: absolute; top: 18px; left: 50%; transform: translateX(-50%); width: 34%; height: 44px;
  border-radius: 999px; background: var(--ink); z-index: 2; }
.bubble { font-size: 38px; line-height: 1.35; padding: 26px 34px; border-radius: 40px; max-width: 84%; letter-spacing: -0.01em; }
.me { align-self: flex-end; background: var(--ink); color: var(--paper); border-bottom-right-radius: 12px; }
.ai { align-self: flex-start; background: #fff; color: var(--ink); border: 2px solid var(--line); border-bottom-left-radius: 12px; }
.mono { font-family: GeistMono, monospace; letter-spacing: -0.02em; }
`;

const page = (body, cls = "") => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="frame ${cls}"><div class="comb"></div>${body}</div></body></html>`;

const phone = (img, style = "") =>
  `<div class="phone" style="${style}"><img src="${ASSETS}/${img}.webp" alt=""></div>`;

const footer = (right = `<span class="pill">First month free</span>`) => `<div class="foot">${logo(52)}${right}</div>`;

// ─── Ring data (invented, like everything on the website) ────────────────────

const RING = [
  { name: "Rent", amount: 1850, color: "#2F6FEB" },
  { name: "Groceries", amount: 640, color: "#F07B3F" },
  { name: "To savings", amount: 800, color: "#2BA36B" },
  { name: "Dining out", amount: 570, color: "#F5B31F" },
  { name: "Investing", amount: 500, color: "#3AB0C4" },
  { name: "Other", amount: 920, color: "#A6A6AE" },
];
const RING_TOTAL = RING.reduce((s, r) => s + r.amount, 0);
const chf = (n) => "CHF " + Math.round(n).toLocaleString("en-US");

function ringSvg(size, stroke, { animated = false } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 6;
  let start = 0;
  const segs = RING.map((s, i) => {
    const len = (s.amount / RING_TOTAL) * c;
    const seg = `<circle class="seg" data-i="${i}" data-len="${len - gap}" data-c="${c}" cx="${size / 2}" cy="${size / 2}" r="${r}"
      fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-linecap="butt"
      stroke-dasharray="${animated ? `0 ${c}` : `${len - gap} ${c}`}" transform="rotate(${(start / c) * 360 - 90} ${size / 2} ${size / 2})"/>`;
    start += len;
    return seg;
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${segs}</svg>`;
}

function legend(fontSize = 34, cls = "") {
  return `<div class="legend ${cls}" style="display:grid;grid-template-columns:1fr;gap:22px;font-size:${fontSize}px;max-width:760px;margin:0 auto;width:100%">
    ${RING.map((s, i) => `<div class="li" data-i="${i}" style="display:flex;align-items:center;gap:14px">
      <span style="width:22px;height:22px;border-radius:6px;background:${s.color};flex:none"></span>
      <span style="flex:1">${s.name}</span><span class="mono" style="color:var(--muted)">${chf(s.amount)}</span></div>`).join("")}
  </div>`;
}

// ─── Feed posts (1080×1350) ──────────────────────────────────────────────────

const POSTS = {
  "post-1-ring": page(`
    <p class="eyebrow">Monthly report</p>
    <h1 style="margin-top:28px">See where your money <span class="hl">went.</span></h1>
    <p class="sub" style="margin-top:28px;max-width:520px">A ring for every month. Savings and investments included, so a good month looks like one.</p>
    ${phone("phone-reports-light", "position:absolute;right:-30px;bottom:-500px;width:600px;transform:rotate(-5deg)")}
    ${footer("")}`),

  "post-2-plan": page(`
    <p class="eyebrow">Budget templates</p>
    <h1 style="margin-top:28px;max-width:860px">Plan your month <span class="hl">once.</span></h1>
    <p class="sub" style="margin-top:28px;max-width:480px">Salary in, rent out, savings aside. Then see every month against the plan.</p>
    ${phone("phone-month-dark", "position:absolute;right:-20px;bottom:-560px;width:600px;transform:rotate(5deg)")}
    ${footer("")}`, "dark"),

  "post-3-assistant": page(`
    <p class="eyebrow" style="color:#3A2C00">Works with Claude &amp; ChatGPT</p>
    <h1 style="margin-top:28px">Ask your AI about your money.</h1>
    <div style="margin-top:70px;display:flex;flex-direction:column;gap:26px">
      <p class="bubble me">How much did I spend eating out last month?</p>
      <p class="bubble ai"><b class="mono">CHF 570</b> across 6 visits, CHF 330 over your plan. Sushi night was the biggest.</p>
      <p class="bubble me">Log CHF 18 for lunch today.</p>
      <p class="bubble ai">✓ Added to October under Dining out.</p>
    </div>
    ${footer(`<span style="font-size:26px;font-weight:500;color:#3A2C00">Connect in 2 minutes</span>`)}`, "honey"),

  "post-4-privacy": page(`
    <p class="eyebrow">Privacy</p>
    <div style="margin-top:auto;margin-bottom:auto">
      <h1 style="font-size:132px">No ads.<br>No trackers.<br><span class="hl">No selling.</span></h1>
      <p class="sub" style="margin-top:44px;max-width:820px">Hive is paid for by subscriptions, not by your data. Swiss-made. Export or delete everything, any time.</p>
    </div>
    ${footer("")}`),

  "post-5-offer": page(`
    <div style="margin:auto 0;text-align:center;display:flex;flex-direction:column;align-items:center">
      ${mark(150, "#FAFAF8")}
      <h1 style="margin-top:56px;font-size:150px">One month <span class="hl">free.</span></h1>
      <p class="sub" style="margin-top:36px">No card. Nothing charged automatically.</p>
      <div style="margin-top:70px;display:flex;gap:24px">
        <div style="border:2px solid #333;border-radius:36px;padding:34px 44px;text-align:left">
          <p style="font-size:30px;color:#B4B4B8">Plus</p><p class="mono" style="font-size:64px;margin-top:6px">CHF 4<span style="font-size:30px;color:#B4B4B8"> / month</span></p></div>
        <div style="border:2px solid var(--honey);border-radius:36px;padding:34px 44px;text-align:left;background:rgba(245,179,31,.08)">
          <p style="font-size:30px;color:var(--honey)">Yearly</p><p class="mono" style="font-size:64px;margin-top:6px">CHF 40<span style="font-size:30px;color:#B4B4B8"> / year</span></p></div>
      </div>
    </div>
    ${footer(`<span style="font-size:28px;color:#B4B4B8;font-weight:500">Link in bio</span>`)}`, "dark"),

  "post-6-life": page(`
    <h1 style="font-size:92px;text-align:center">Your money and the rest of your life, <span class="hl">side by side.</span></h1>
    <div style="position:relative;flex:1;margin-top:60px">
      ${phone("phone-habits-light", "position:absolute;left:40px;top:0;width:420px;transform:rotate(-4deg)")}
      ${phone("phone-goals-light", "position:absolute;right:40px;top:90px;width:420px;transform:rotate(4deg)")}
    </div>
    <div class="foot" style="position:absolute;left:88px;right:88px;bottom:80px;background:var(--paper);padding:28px 36px;border-radius:999px;box-shadow:0 20px 60px -20px rgba(0,0,0,.25)">
      ${logo(48)}<span style="font-size:28px;font-weight:500;color:var(--muted)">Habits · goals · fitness · notes</span></div>`),
};

// ─── Carousel: 5 numbers to check at the end of every month ─────────────────

const NUMBERS = [
  ["Savings rate", "What you kept, as a share of what came in.", "22%", "of income saved"],
  ["Spending vs plan", "Each category against what you planned for it.", "−CHF 140", "under plan this month"],
  ["Your biggest category", "Usually rent. If it isn't, it's worth a look.", "Rent", "1,850 · 35% of spending"],
  ["Money moved aside", "Transfers to savings and investments count as progress, not spending.", "CHF 1,300", "to savings & investing"],
  ["Net worth change", "The one number that sums up the month.", "+CHF 1,620", "vs last month"],
];

const CAROUSEL = {
  "carousel-1": page(`
    <p class="eyebrow">Save this</p>
    <h1 style="margin-top:auto;font-size:124px">5 numbers to check at the end of every <span class="hl">month.</span></h1>
    <p class="sub" style="margin-top:36px">Five minutes. No spreadsheet gymnastics.</p>
    <div class="foot" style="margin-top:80px">${logo(52)}<span style="font-size:30px;color:var(--muted)">Swipe →</span></div>`),
  ...Object.fromEntries(
    NUMBERS.map(([title, text, big, small], i) => [
      `carousel-${i + 2}`,
      page(`
        <p class="mono" style="font-size:150px;font-weight:600;color:var(--honey);line-height:1">0${i + 1}</p>
        <h1 style="margin-top:40px;font-size:96px">${title}</h1>
        <p class="sub" style="margin-top:28px;max-width:860px">${text}</p>
        <div style="margin-top:auto;border:2px solid ${i % 2 ? "#2A2A2E" : "var(--line)"};border-radius:44px;padding:48px 56px;background:${i % 2 ? "#151517" : "#fff"}">
          <p class="mono" style="font-size:96px;font-weight:600;letter-spacing:-0.04em">${big}</p>
          <p style="font-size:32px;color:${i % 2 ? "#B4B4B8" : "var(--muted)"};margin-top:10px">${small}</p>
        </div>
        <div class="foot" style="margin-top:56px">${logo(44)}<span style="font-size:26px;color:${i % 2 ? "#B4B4B8" : "var(--muted)"}">${i + 2} / 7</span></div>`, i % 2 ? "dark" : ""),
    ])
  ),
  "carousel-7": page(`
    <div style="margin:auto 0">
      ${mark(120)}
      <h1 style="margin-top:48px;font-size:112px">Hive tracks all five, <span class="hl">every month.</span></h1>
      <p class="sub" style="margin-top:36px">Plan once, log as you go, and the numbers are there at the end of the month.</p>
    </div>
    ${footer(`<span class="pill">First month free · link in bio</span>`)}`, "honey"),
};

// ─── Stories (1080×1920) ─────────────────────────────────────────────────────

const STORIES = {
  "story-1-offer": page(`
    <div style="margin-top:120px">${logo(72)}</div>
    <h1 style="margin-top:120px;font-size:140px">Try Hive free for a <span class="hl">month.</span></h1>
    <p class="sub" style="margin-top:44px;font-size:46px">Budget, track and plan, with a ring that shows where it all went. No card needed.</p>
    ${phone("phone-home-light", "position:absolute;left:50%;bottom:-520px;width:640px;transform:translateX(-50%)")}
    <div style="position:absolute;left:0;right:0;bottom:200px;display:flex;justify-content:center;z-index:3">
      <span class="pill" style="height:96px;font-size:40px;padding:0 48px">Swipe up · First month free</span></div>`),
  "story-2-ring": page(`
    <p class="eyebrow" style="margin-top:120px">This month</p>
    <h1 style="margin-top:28px;font-size:120px">Where it went.</h1>
    <div style="margin-top:80px;align-self:center;position:relative">
      ${ringSvg(640, 96)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <p style="font-size:34px;color:#B4B4B8">Out</p>
        <p class="mono" style="font-size:76px;font-weight:600">${chf(RING_TOTAL)}</p>
      </div>
    </div>
    <div style="margin-top:80px">${legend(38)}</div>
    ${footer()}`, "dark"),
};

// ─── Reels (1080×1920, animated) ─────────────────────────────────────────────

// Each reel exposes window.seek(ms): every animation is created paused and moved to that time.
const SEEK = `
<script>
  const ANIMS = [];
  const COUNTERS = [];
  const anim = (el, frames, opts) => { const a = el.animate(frames, { fill: "both", easing: "cubic-bezier(.2,.7,.2,1)", ...opts }); a.pause(); ANIMS.push(a); return a; };
  const show = (el, delay, dur = 600, dy = 40) => anim(el, [{ opacity: 0, transform: "translateY(" + dy + "px)" }, { opacity: 1, transform: "none" }], { delay, duration: dur });
  window.seek = (t) => { for (const a of ANIMS) a.currentTime = t; for (const c of COUNTERS) c(t); };
</script>`;

const reel = (body, script, cls = "") => page(body, cls).replace("</body>", `${SEEK}<script>${script}</script></body>`);

const REELS = {
  // Ring fills in segment by segment while the total counts up. 9 s.
  "reel-1-ring": {
    duration: 9000,
    html: reel(`
      <p class="eyebrow" id="ey" style="margin-top:140px">Your month in Hive</p>
      <h1 id="h" style="margin-top:28px;font-size:124px">See where it <span class="hl">went.</span></h1>
      <div id="ring" style="margin-top:70px;align-self:center;position:relative">
        ${ringSvg(640, 96, { animated: true })}
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <p style="font-size:34px;color:#B4B4B8">Out this month</p>
          <p class="mono" id="total" style="font-size:76px;font-weight:600">CHF 0</p>
        </div>
      </div>
      <div style="margin-top:70px">${legend(38)}</div>
      <div id="f" class="foot">${logo(56)}<span class="pill">First month free</span></div>`,
      `
      const total = ${RING_TOTAL};
      show(document.getElementById("ey"), 200);
      show(document.getElementById("h"), 400, 700);
      anim(document.getElementById("ring"), [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "none" }], { delay: 900, duration: 700 });
      document.querySelectorAll(".seg").forEach((s, i) => {
        const len = +s.dataset.len, c = +s.dataset.c;
        anim(s, [{ strokeDasharray: "0 " + c }, { strokeDasharray: len + " " + c }], { delay: 1300 + i * 450, duration: 650 });
      });
      document.querySelectorAll(".li").forEach((l, i) => show(l, 1400 + i * 450, 500, 20));
      show(document.getElementById("f"), 4600, 700);
      const el = document.getElementById("total");
      COUNTERS.push((t) => {
        const p = Math.min(Math.max((t - 1300) / (450 * 6 + 200), 0), 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = "CHF " + Math.round(total * eased).toLocaleString("en-US");
      });`, "dark"),
  },

  // A chat with an assistant connected to Hive. 11 s.
  "reel-2-assistant": {
    duration: 12000,
    html: reel(`
      <style>.bubble { font-size: 46px; }</style>
      <p class="eyebrow" id="ey" style="margin-top:140px;color:#3A2C00">Hive + your AI assistant</p>
      <h1 id="h" style="margin-top:28px;font-size:124px">Just ask.</h1>
      <div style="margin-top:80px;display:flex;flex-direction:column;gap:30px">
        <p class="bubble me" id="b1">How much did I spend eating out last month?</p>
        <p class="bubble ai" id="b2"><b class="mono">CHF 570</b> across 6 visits, CHF 330 over your plan. Sushi night was the biggest.</p>
        <p class="bubble me" id="b3">Log CHF 18 for lunch today.</p>
        <p class="bubble ai" id="b4">✓ Added to October under Dining out.</p>
      </div>
      ${phone("phone-month-light", "position:absolute;left:50%;margin-left:-300px;bottom:-580px;width:600px")}
      <div id="f" style="position:absolute;left:0;right:0;bottom:120px;display:flex;justify-content:center;z-index:3">
        <span class="pill" style="height:96px;font-size:40px;padding:0 48px;gap:18px">${mark(48, "#FAFAF8")} Works with Claude &amp; ChatGPT</span>
      </div>`,
      `
      show(document.getElementById("ey"), 200);
      show(document.getElementById("h"), 400, 700);
      show(document.getElementById("b1"), 1200, 500);
      show(document.getElementById("b2"), 3000, 600);
      show(document.getElementById("b3"), 5200, 500);
      show(document.getElementById("b4"), 6600, 600);
      anim(document.querySelector(".phone"), [{ transform: "translateY(700px)" }, { transform: "none" }], { delay: 7800, duration: 1100 });
      show(document.getElementById("f"), 9200, 700);`, "honey"),
  },

  // Brand film: cells assemble into the mark, then the promise and the offer. 8 s.
  "reel-3-brand": {
    duration: 8000,
    html: reel(`
      <div style="margin:auto 0;display:flex;flex-direction:column;align-items:center;text-align:center">
        <div id="m" style="position:relative;width:300px;height:300px">
          <svg width="300" height="300" viewBox="0 0 37.84 37.77">
            <polygon id="c1" points="18.92,0 27.58,5 27.58,15 18.92,20 10.26,15 10.26,5" fill="#F5B31F"/>
            <g fill="none" stroke="#FAFAF8" stroke-width="3" stroke-linejoin="round">
              <polygon id="c2" points="8.66,19.27 16.02,23.52 16.02,32.02 8.66,36.27 1.3,32.02 1.3,23.52"/>
              <polygon id="c3" points="29.18,19.27 36.54,23.52 36.54,32.02 29.18,36.27 21.82,32.02 21.82,23.52"/>
            </g>
          </svg>
        </div>
        <p id="w" style="margin-top:44px;font-size:110px;font-weight:800;letter-spacing:-0.06em">hive</p>
        <h1 id="h" style="margin-top:110px;font-size:96px">Your money and the rest of your life, <span class="hl">side by side.</span></h1>
        <p id="o" class="pill" style="margin-top:110px;height:100px;font-size:42px;padding:0 54px">First month free</p>
      </div>`,
      `
      const cell = (id, delay, dx, dy) => anim(document.getElementById(id),
        [{ opacity: 0, transform: "translate(" + dx + "px," + dy + "px) scale(.6)" }, { opacity: 1, transform: "none" }],
        { delay, duration: 800, easing: "cubic-bezier(.3,1.4,.4,1)" });
      document.querySelectorAll("#c1,#c2,#c3").forEach((p) => { p.style.transformBox = "fill-box"; p.style.transformOrigin = "center"; });
      cell("c1", 300, 0, -12); cell("c2", 650, -12, 8); cell("c3", 1000, 12, 8);
      show(document.getElementById("w"), 1700, 700);
      show(document.getElementById("h"), 2700, 900);
      anim(document.getElementById("o"), [{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "none" }], { delay: 4300, duration: 700, easing: "cubic-bezier(.3,1.4,.4,1)" });`, "dark"),
  },
};

// ─── Render ──────────────────────────────────────────────────────────────────

const only = process.argv[2];
const wanted = (id) => !only || id.startsWith(only);

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function open(html, width, height) {
  const p = await browser.newPage({ viewport: { width, height } });
  const file = join(OUT, ".tmp.html");
  writeFileSync(file, html);
  await p.goto(pathToFileURL(file).href);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  return p;
}

async function still(id, html, width, height) {
  if (!wanted(id)) return;
  const p = await open(html, width, height);
  await p.screenshot({ path: join(OUT, `${id}.png`) });
  await p.close();
  console.log("✓", id);
}

for (const [id, html] of Object.entries(POSTS)) await still(id, html, 1080, 1350);
for (const [id, html] of Object.entries(CAROUSEL)) await still(id, html, 1080, 1350);
for (const [id, html] of Object.entries(STORIES)) await still(id, html, 1080, 1920);

for (const [id, { duration, html }] of Object.entries(REELS)) {
  if (!wanted(id)) continue;
  const p = await open(html, 1080, 1920);
  const frames = join(OUT, `.frames-${id}`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames);
  const total = Math.round((duration / 1000) * FPS);
  for (let f = 0; f < total; f++) {
    await p.evaluate((t) => window.seek(t), (f * 1000) / FPS);
    await p.screenshot({ path: join(frames, `${String(f).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
  }
  // A cover frame for the grid and for previews.
  await p.evaluate((t) => window.seek(t), duration - 500);
  await p.screenshot({ path: join(OUT, `${id}-cover.png`) });
  await p.close();
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "%04d.jpg"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", join(OUT, `${id}.mp4`)]);
  rmSync(frames, { recursive: true, force: true });
  console.log("✓", id, `${duration / 1000}s`);
}

rmSync(join(OUT, ".tmp.html"), { force: true });
await browser.close();
