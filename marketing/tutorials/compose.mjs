// Turns the captured app flows (capture.mjs) into narrated tutorial videos (1080×1920) presented by Mia,
// an illustrated host whose mouth follows the voice. Each line of a script is spoken over one captured
// step; at the end of the line the finger taps where the next step happens.
//
//   TTS_PY=<python with kokoro-onnx> KOKORO_MODELS=<dir> node marketing/tutorials/compose.mjs [video-id]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const WORK = join(HERE, ".work");
const FONTS = pathToFileURL(join(HERE, "..", "instagram", "assets")).href;
const FPS = 30;
const TTS_PY = process.env.TTS_PY ?? "python3";
const MODELS = process.env.KOKORO_MODELS ?? join(HERE, "models");
const VOICE = process.env.VOICE ?? "af_heart";

// One line per captured step (see capture.mjs); the finger taps at the end of the line.
const SCRIPTS = {
  "1-add-transaction": {
    title: "Log a purchase",
    lines: [
      "Hi, I'm Mia. Let me show you how to log a purchase in Hive. First, tap the plus button. It's on every screen.",
      "Type the amount.",
      "Add a short description, so you recognise it later.",
      "Pick a category, and the account you paid from.",
      "Then add the transaction.",
      "Done. Hive files it into the right month by itself. Let's check under Money.",
      "Every month is listed here, with what came in and what went out. Open October.",
      "And there's the lunch, already counted in your month. That's all it takes.",
    ],
  },
  "2-plan-month": {
    title: "Plan your month",
    lines: [
      "Hi, I'm Mia. Let's plan a month. It starts with a budget template: your typical month, written down once.",
      "Here's mine. Salary in, then rent, insurance, groceries, and what I move to savings and investments.",
      "The ring shows where the plan sends the money. Savings and investments count too, so a good plan looks like one.",
      "Now a new month. It's empty, so let's apply the template.",
      "Choose the template.",
      "And apply.",
      "Every planned item is in the month now. As things get paid, tap the status to tick them off.",
      "Paid. Through the month, you see planned against paid at a glance.",
    ],
  },
  "3-where-it-went": {
    title: "See where it went",
    lines: [
      "Hi, I'm Mia. Curious where your money went this month? Open Money.",
      "Then Reports.",
      "Switch to the month view.",
      "Pick a month. Let's take September.",
      "Here's the ring. The biggest categories at a glance, plus what you moved to savings and investments.",
      "Below it, every category in detail. Now back to the home screen.",
      "Your net worth over time. Tap All to see your whole history.",
      "Your whole history, in one line. Try Hive free for a month, and start yours.",
    ],
  },
};

// ─── Mia, the host (flat illustration; mouth, blinks and head move per frame) ──

const MIA = `
<svg viewBox="0 0 400 400" width="100%" height="100%">
  <defs><clipPath id="cut"><circle cx="200" cy="200" r="200"/></clipPath></defs>
  <g clip-path="url(#cut)">
    <rect width="400" height="400" fill="#FDF1D3"/>
    <path d="M20 400 C30 318 100 286 200 286 C300 286 370 318 380 400 Z" fill="#1E2A44"/>
    <path d="M168 288 L200 352 L232 288 Z" fill="#FFFFFF"/>
    <path d="M150 292 L200 380 L176 292 Z" fill="#162036"/>
    <path d="M250 292 L200 380 L224 292 Z" fill="#162036"/>
    <polygon points="276,330 284,325 292,330 292,339 284,344 276,339" fill="#F5B31F"/>
    <path d="M180 236 L220 236 L224 296 L176 296 Z" fill="#C98F6E"/>
    <g id="head">
      <path d="M118 175 C112 100 160 58 205 58 C258 58 298 100 290 175 C294 222 304 258 292 280 C278 296 252 290 244 274 L156 274 C148 290 122 296 108 280 C96 258 106 222 118 175 Z" fill="#2B1E1A"/>
      <path d="M150 250 C160 268 176 276 200 278 C224 276 240 268 250 250 L250 274 L150 274 Z" fill="#2B1E1A"/>
      <ellipse cx="132" cy="172" rx="11" ry="16" fill="#D49A79"/>
      <ellipse cx="268" cy="172" rx="11" ry="16" fill="#D49A79"/>
      <ellipse cx="200" cy="166" rx="68" ry="84" fill="#DCA383"/>
      <ellipse cx="160" cy="196" rx="13" ry="8" fill="#E88F7A" opacity=".35"/>
      <ellipse cx="240" cy="196" rx="13" ry="8" fill="#E88F7A" opacity=".35"/>
      <path d="M131 162 C124 102 166 72 208 74 C252 77 280 108 270 160 C266 134 248 112 226 106 C214 126 176 146 131 162 Z" fill="#2B1E1A"/>
      <path d="M226 106 C236 118 246 132 252 150" stroke="#3E2C26" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path id="browL" d="M160 136 Q174 129 188 134" stroke="#2B1E1A" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path id="browR" d="M212 134 Q226 129 240 136" stroke="#2B1E1A" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g id="eyes">
        <ellipse cx="174" cy="164" rx="6.5" ry="7.5" fill="#1B1412"/>
        <ellipse cx="226" cy="164" rx="6.5" ry="7.5" fill="#1B1412"/>
        <circle cx="176" cy="161" r="2" fill="#fff"/><circle cx="228" cy="161" r="2" fill="#fff"/>
      </g>
      <g fill="none" stroke="#151515" stroke-width="4.5">
        <rect x="150" y="146" width="48" height="38" rx="15"/>
        <rect x="202" y="146" width="48" height="38" rx="15"/>
        <path d="M198 160 Q200 156 202 160"/>
        <path d="M150 158 L136 154 M250 158 L264 154"/>
      </g>
      <path d="M201 172 C197 186 196 192 205 194" stroke="#B5785A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path id="smile" d="M182 210 Q200 224 218 210" stroke="#7A2E2E" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path id="mouth" d="" fill="#7A2E2E"/>
      <path id="teeth" d="" fill="#fff"/>
    </g>
  </g>
</svg>`;

// ─── Page ────────────────────────────────────────────────────────────────────

function pageHtml(data) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Geist; src: url(${FONTS}/Geist-Variable.woff2); font-weight: 100 900; }
@font-face { font-family: GeistMono; src: url(${FONTS}/GeistMono-Variable.woff2); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1080px; height: 1920px; overflow: hidden; background: #FAFAF8; color: #0B0B0C; font-family: Geist, sans-serif;
  letter-spacing: -0.02em; -webkit-font-smoothing: antialiased; position: relative; }
.comb { position: absolute; inset: 0; opacity: .06; background-size: 84px 147px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z' fill='%23000'/%3E%3C/svg%3E"); }
header { position: absolute; left: 70px; right: 70px; top: 90px; display: flex; justify-content: space-between; align-items: flex-end; }
.eyebrow { font-family: GeistMono, monospace; font-size: 26px; letter-spacing: .14em; text-transform: uppercase; color: #9A6A00; }
h1 { font-size: 76px; font-weight: 650; letter-spacing: -0.04em; margin-top: 10px; }
.logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 44px; letter-spacing: -0.06em; }
.phone { position: absolute; left: 360px; top: 290px; width: 650px; border-radius: 84px; border: 16px solid #0B0B0C; background: #0B0B0C;
  overflow: hidden; box-shadow: 0 60px 120px -50px rgba(0,0,0,.45); }
.screen { position: relative; width: 100%; aspect-ratio: 828 / 1636; overflow: hidden; background: #fff; }
.screen img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; }
.notch { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 34%; height: 40px; border-radius: 99px; background: #0B0B0C; z-index: 3; }
.finger { position: absolute; width: 74px; height: 74px; margin: -37px 0 0 -37px; border-radius: 50%; background: rgba(11,11,12,.32);
  border: 4px solid rgba(255,255,255,.95); box-shadow: 0 6px 20px rgba(0,0,0,.3); z-index: 4; opacity: 0; }
.ripple { position: absolute; width: 74px; height: 74px; margin: -37px 0 0 -37px; border-radius: 50%; border: 5px solid #F5B31F; z-index: 4; opacity: 0; }
.host { position: absolute; left: 30px; top: 1170px; width: 400px; height: 400px; border-radius: 50%; border: 10px solid #fff;
  box-shadow: 0 30px 70px -30px rgba(0,0,0,.45); background: #FDF1D3; z-index: 5; }
.tag { position: absolute; left: 98px; top: 1550px; z-index: 6; background: #0B0B0C; color: #FAFAF8; border-radius: 999px; padding: 12px 26px;
  font-size: 28px; font-weight: 600; }
.tag span { color: #F5B31F; }
.caption { position: absolute; left: 60px; right: 60px; top: 1660px; min-height: 200px; background: #fff; border: 2px solid #E7E5DF; border-radius: 40px;
  padding: 30px 42px; font-size: 42px; line-height: 1.32; letter-spacing: -0.01em; box-shadow: 0 30px 60px -40px rgba(0,0,0,.35); z-index: 6;
  display: flex; align-items: center; }
.steps { position: absolute; left: 360px; width: 650px; top: 1625px; display: flex; gap: 8px; justify-content: center; }
.steps i { width: 40px; height: 8px; border-radius: 9px; background: #E1DED6; }
.steps i.on { background: #F5B31F; }
.outro { position: absolute; inset: 0; background: #0B0B0C; color: #FAFAF8; z-index: 20; opacity: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; gap: 50px; }
.outro .logo { font-size: 120px; gap: 26px; }
.outro p { font-size: 56px; color: #B4B4B8; }
.outro b { display: inline-block; background: #F5B31F; color: #0B0B0C; border-radius: 999px; padding: 26px 56px; font-size: 48px; }
</style></head><body>
<div class="comb"></div>
<header>
  <div><p class="eyebrow">Hive tutorial · ${data.index}/3</p><h1>${data.title}</h1></div>
  <div class="logo">${mark(48)}hive</div>
</header>
<div class="phone"><div class="notch"></div><div class="screen" id="screen">
  ${data.images.map((src, i) => `<img id="s${i}" src="${src}">`).join("")}
  <div class="finger" id="finger"></div><div class="ripple" id="ripple"></div>
</div></div>
<div class="steps">${data.beats.map((_, i) => `<i id="d${i}"></i>`).join("")}</div>
<div class="host">${MIA}</div>
<div class="tag">Mia <span>· Hive</span></div>
<div class="caption" id="caption"></div>
<div class="outro" id="outro">
  <div class="logo">${mark(130, "#FAFAF8")}hive</div>
  <p>Your money and the rest of your life,<br>side by side.</p>
  <b>First month free</b>
</div>
<script>
const D = ${JSON.stringify({ beats: data.beats, amps: data.amps, fps: FPS, outroAt: data.outroAt })};
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
const screen = $("screen");
window.seek = (t) => {
  const W = screen.clientWidth, H = screen.clientHeight;
  let bi = D.beats.findIndex((b) => t < b.end);
  if (bi < 0) bi = D.beats.length - 1;
  const b = D.beats[bi];
  // Screens: the step of this beat, cross-fading to the next one just after the tap.
  D.beats.forEach((_, i) => { $("s" + i).style.opacity = 0; $("d" + i).className = i <= bi ? "on" : ""; });
  const next = b.tap && t > b.tapAt + 0.12 ? clamp((t - b.tapAt - 0.12) / 0.3) : 0;
  $("s" + b.step).style.opacity = 1;
  if (next > 0 && $("s" + (b.step + 1))) $("s" + (b.step + 1)).style.opacity = next;
  // Finger: glides in from where it last tapped, taps, lifts away.
  const f = $("finger"), r = $("ripple");
  f.style.opacity = 0; r.style.opacity = 0;
  if (b.tap) {
    const moveStart = b.tapAt - 0.9;
    if (t >= moveStart && t <= b.tapAt + 0.6) {
      const from = b.from ?? { x: b.tap.x + 0.15, y: b.tap.y + 0.25 };
      const k = ease((t - moveStart) / 0.75);
      const x = from.x + (b.tap.x - from.x) * k, y = from.y + (b.tap.y - from.y) * k;
      f.style.left = x * W + "px"; f.style.top = y * H + "px";
      const press = t > b.tapAt - 0.08 && t < b.tapAt + 0.12 ? 0.82 : 1;
      f.style.transform = "scale(" + press + ")";
      f.style.opacity = t > b.tapAt + 0.3 ? clamp(1 - (t - b.tapAt - 0.3) / 0.3) : clamp((t - moveStart) / 0.2);
      if (t >= b.tapAt) {
        const p = clamp((t - b.tapAt) / 0.5);
        r.style.left = f.style.left; r.style.top = f.style.top;
        r.style.transform = "scale(" + (1 + p * 1.4) + ")"; r.style.opacity = 1 - p;
      }
    }
  }
  // Caption.
  $("caption").textContent = b.text;
  // Mia: mouth from the narration's loudness, blinks every few seconds, a gentle head sway.
  const a = D.amps[Math.min(D.amps.length - 1, Math.round(t * D.fps))] ?? 0;
  const open = a > 0.08 ? a : 0;
  // An open smile: flat-ish top lip, rounded bottom lip that drops with the voice.
  const w = 15 + open * 3, h = 5 + open * 13, y0 = 209;
  $("mouth").setAttribute("d", "M" + (200 - w) + " " + y0 + " Q200 " + (y0 + 3) + " " + (200 + w) + " " + y0 + " Q200 " + (y0 + h * 1.6) + " " + (200 - w) + " " + y0 + " Z");
  $("teeth").setAttribute("d", "M" + (203 - w) + " " + (y0 + 1) + " Q200 " + (y0 + 4) + " " + (197 + w) + " " + (y0 + 1) + " L" + (195 + w) + " " + (y0 + 4 + open * 2) + " Q200 " + (y0 + 6 + open * 2) + " " + (205 - w) + " " + (y0 + 4 + open * 2) + " Z");
  $("mouth").style.opacity = open > 0 ? 1 : 0;
  $("teeth").style.opacity = open > 0.25 ? 1 : 0;
  $("smile").style.opacity = open > 0 ? 0 : 1;
  const blink = (t % 3.7) < 0.12 ? 0.1 : 1;
  $("eyes").setAttribute("transform", "translate(0 " + (164 * (1 - blink)) + ") scale(1 " + blink + ")");
  const brow = -open * 3;
  $("browL").setAttribute("transform", "translate(0 " + brow + ")");
  $("browR").setAttribute("transform", "translate(0 " + brow + ")");
  $("head").setAttribute("transform", "rotate(" + (Math.sin(t * 1.1) * 2.2 + open * 1.2).toFixed(2) + " 200 270)");
  // Outro card.
  $("outro").style.opacity = clamp((t - D.outroAt) / 0.5);
};
</script></body></html>`;
}

function mark(size, outline = "currentColor") {
  return `<svg width="${size}" height="${size}" viewBox="0 0 37.84 37.77"><polygon points="18.92,0 27.58,5 27.58,15 18.92,20 10.26,15 10.26,5" fill="#F5B31F"/><g fill="none" stroke="${outline}" stroke-width="3" stroke-linejoin="round"><polygon points="8.66,19.27 16.02,23.52 16.02,32.02 8.66,36.27 1.3,32.02 1.3,23.52"/><polygon points="29.18,19.27 36.54,23.52 36.54,32.02 29.18,36.27 21.82,32.02 21.82,23.52"/></g></svg>`;
}

// ─── Build ───────────────────────────────────────────────────────────────────

const only = process.argv[2];
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let index = 0;
for (const [id, script] of Object.entries(SCRIPTS)) {
  index++;
  if (only && !id.startsWith(only)) continue;
  const capDir = join(HERE, "captures", id);
  const { steps } = JSON.parse(readFileSync(join(capDir, "steps.json"), "utf8"));
  if (steps.length !== script.lines.length) throw new Error(`${id}: ${steps.length} steps but ${script.lines.length} lines`);

  // 1. Voice every line.
  const work = join(WORK, id);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  writeFileSync(join(work, "lines.json"), JSON.stringify(script.lines));
  const durations = JSON.parse(
    execFileSync(TTS_PY, ["-I", join(HERE, "voice.py"), "lines", MODELS, join(work, "lines.json"), work, VOICE], { encoding: "utf8" }).trim().split("\n").pop()
  );

  // 2. Timeline: each line plays over its step; the tap lands just after the line ends.
  const beats = [];
  let t = 0.6;
  let lastTap = null;
  steps.forEach((s, i) => {
    const start = t;
    const speechEnd = start + durations[i];
    const tapAt = s.tap ? speechEnd + 0.35 : null;
    const end = s.tap ? tapAt + 0.7 : speechEnd + 0.9;
    beats.push({ step: i, text: script.lines[i], start, end, tap: s.tap, tapAt, from: lastTap, audio: join(work, `${String(i).padStart(2, "0")}.wav`) });
    if (s.tap) lastTap = s.tap;
    t = end;
  });
  const outroAt = t + 0.3;
  const duration = outroAt + 2.8;
  beats[beats.length - 1].end = duration + 1;

  // 3. One narration track and the mouth movement.
  writeFileSync(join(work, "timeline.json"), JSON.stringify({ duration, clips: beats.map((b) => ({ file: b.audio, start: b.start })) }));
  execFileSync(TTS_PY, ["-I", join(HERE, "voice.py"), "mix", join(work, "timeline.json"), join(work, "voice.wav"), join(work, "amps.json"), String(FPS)]);
  const amps = JSON.parse(readFileSync(join(work, "amps.json"), "utf8"));

  // 4. Render frames.
  const images = steps.map((s) => pathToFileURL(join(capDir, s.img)).href);
  const html = join(work, "page.html");
  writeFileSync(html, pageHtml({ index, title: script.title, images, beats, amps, outroAt }));
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(pathToFileURL(html).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const frames = join(work, "frames");
  mkdirSync(frames);
  const total = Math.round(duration * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate((s) => window.seek(s), f / FPS);
    await page.screenshot({ path: join(frames, `${String(f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 90 });
  }
  await page.evaluate((s) => window.seek(s), beats[0].start + 2);
  await page.screenshot({ path: join(OUT, `${id}-cover.png`) });
  await page.close();

  // 5. Encode with the narration.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "%05d.jpg"), "-i", join(work, "voice.wav"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", join(OUT, `${id}.mp4`)]);
  writeFileSync(join(OUT, `${id}.txt`), script.lines.join("\n\n") + "\n");
  rmSync(work, { recursive: true, force: true });
  console.log("✓", id, `${duration.toFixed(1)}s`);
}
await browser.close();
