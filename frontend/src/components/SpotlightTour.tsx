"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pointer, X } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { lifeItems } from "@/lib/nav";
import type { Entitlements } from "@/lib/plans";

interface Step {
  /** Matches `data-tour` on the element to point at; the first visible match wins (phone or desktop layout). */
  target: string;
  title: string;
  text: string;
  /** Page to open first when the element lives there. */
  path?: string;
  /** Only shown when this is true for the user's modules and plan. */
  when?: (modules: string[], entitlements: Entitlements) => boolean;
}

// Ordered so the tour changes page once (Home, then Transactions); the shell's buttons are on every page.
const STEPS: Step[] = [
  {
    target: "add",
    path: "/",
    title: "Add a transaction",
    text: "Tap + from any page. Hive files it into the right month and creates the month if needed.",
  },
  {
    target: "ai",
    path: "/",
    title: "Next moves",
    text: "Ask the AI for the three things most worth doing now, based on your own data.",
    when: (_, e) => e.aiInsightsPerDay > 0,
  },
  {
    target: "money",
    title: "Your money",
    text: "Every month and its transactions. Tap a transaction to edit it, or search them all.",
  },
  {
    target: "reports",
    path: "/months",
    title: "Reports",
    text: "Where your money goes each month, by category, with transfers to savings and investments.",
  },
  {
    target: "life",
    title: "Life",
    text: "Your habits, fitness, goals and notes, each one a tap away.",
    when: (modules) => lifeItems.some((i) => i.module && modules.includes(i.module)),
  },
  {
    target: "search",
    title: "Search and jump",
    text: "Find any transaction or go to any page. On a computer, press ⌘K.",
  },
  {
    target: "settings",
    title: "Settings",
    text: "Accounts, categories and budget templates live here, under Money setup. You can replay this tour from there too.",
  },
];

const PAD = 8;
const CARD_W = 320;

function findTarget(name: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

type Box = { top: number; left: number; width: number; height: number };

const same = (a: Box, b: Box) =>
  Math.abs(a.top - b.top) < 0.5 &&
  Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 &&
  Math.abs(a.height - b.height) < 0.5;

/**
 * The guided tour: dims the page, cuts a spotlight around the real button, taps it with an animated hand
 * and explains it in a small card. Steps whose button isn't on screen (e.g. a module that's off) are skipped.
 *
 * One animation-frame loop measures the button every frame and eases the spotlight towards it, so scrolling,
 * page changes and late layout shifts all move it smoothly; the previous spotlight stays until the next
 * button is found, so nothing flashes between steps.
 */
export function SpotlightTour() {
  const { tourOpen, endTour, modules, entitlements } = usePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const steps = STEPS.filter((s) => !s.when || s.when(modules, entitlements));

  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  // Whether the spotlight has reached this step's button (the card waits for it).
  const [settled, setSettled] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const nextRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<Box | null>(null);
  const renderedRef = useRef<Box | null>(null);
  const step = steps[index];
  const lastStep = steps.length - 1;

  const close = useCallback(() => {
    setIndex(0);
    setBox(null);
    boxRef.current = null;
    renderedRef.current = null;
    setSettled(false);
    endTour();
  }, [endTour]);

  const go = useCallback(
    (to: number) => {
      if (to > lastStep) return close();
      setSettled(false);
      setIndex(Math.max(0, to));
    },
    [lastStep, close]
  );

  // Open the step's page first when its button lives elsewhere.
  useEffect(() => {
    if (tourOpen && step?.path && pathname !== step.path) router.push(step.path);
  }, [tourOpen, step, pathname, router]);

  // Track the button: find it, bring it into view once, then follow it every frame.
  useEffect(() => {
    if (!tourOpen || !step) return;
    let frame = 0;
    let target: HTMLElement | null = null;
    let scrolled = false;
    const started = performance.now();

    const tick = () => {
      if (!target || !target.isConnected) {
        target = step.path && window.location.pathname !== step.path ? null : findTarget(step.target);
        if (!target && performance.now() - started > 4000) return go(index + 1);
      }
      if (target) {
        if (!scrolled) {
          scrolled = true;
          const r = target.getBoundingClientRect();
          if (r.top < 72 || r.bottom > window.innerHeight - 80) target.scrollIntoView({ block: "center" });
        }
        const r = target.getBoundingClientRect();
        const goal = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
        const cur = boxRef.current;
        // Ease a fifth of the way each frame: quick, but never a jump.
        const next = cur
          ? {
              top: cur.top + (goal.top - cur.top) * 0.22,
              left: cur.left + (goal.left - cur.left) * 0.22,
              width: cur.width + (goal.width - cur.width) * 0.22,
              height: cur.height + (goal.height - cur.height) * 0.22,
            }
          : goal;
        const arrived = same(next, goal);
        const shown = arrived ? goal : next;
        // The eased position always advances; React only re-renders when it visibly moved.
        boxRef.current = shown;
        const last = renderedRef.current;
        const exact = (a: Box, b: Box) => a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
        if (!last || !same(last, shown) || (arrived && !exact(last, shown))) {
          renderedRef.current = shown;
          setBox(shown);
        }
        if (arrived) setSettled(true);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tourOpen, step, index, go]);

  useEffect(() => {
    if (!tourOpen) return;
    const size = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    size();
    window.addEventListener("resize", size);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", size);
      window.removeEventListener("keydown", onKey);
    };
  }, [tourOpen, index, go, close]);

  useEffect(() => {
    if (settled) nextRef.current?.focus({ preventScroll: true });
  }, [settled, index]);

  if (!tourOpen || !step) return null;

  const hole = box;
  const { w: vw, h: vh } = viewport;

  // The card goes on the side of the element with more room, kept inside the screen.
  const cardW = Math.min(CARD_W, vw - 32);
  const below = hole ? hole.top + hole.height / 2 < vh / 2 : true;
  const cardLeft = hole ? Math.min(Math.max(hole.left + hole.width / 2 - cardW / 2, 16), vw - cardW - 16) : 16;
  const cardStyle: React.CSSProperties = hole
    ? below
      ? { top: hole.top + hole.height + 56, left: cardLeft, width: cardW }
      : { bottom: vh - hole.top + 56, left: cardLeft, width: cardW }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: cardW };

  // The hand comes from the card's side and its fingertip rests on the element's edge, so the icon or
  // label it points at stays visible. The fingertip sits 16px from the left of the 38px icon (22px when flipped).
  const hand = hole && {
    left: hole.left + hole.width / 2 - (below ? 16 : 22),
    top: below ? hole.top + hole.height - PAD - 8 : hole.top + PAD + 8 - 38,
  };

  const r = 16;
  const cutout = hole
    ? `M0 0H${vw}V${vh}H0Z M${hole.left + r} ${hole.top}H${hole.left + hole.width - r}a${r} ${r} 0 0 1 ${r} ${r}V${
        hole.top + hole.height - r
      }a${r} ${r} 0 0 1 -${r} ${r}H${hole.left + r}a${r} ${r} 0 0 1 -${r} -${r}V${hole.top + r}a${r} ${r} 0 0 1 ${r} -${r}Z`
    : `M0 0H${vw}V${vh}H0Z`;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dimmed page with a spotlight hole; the whole layer swallows clicks so the page stays put. */}
      <svg className="absolute inset-0 w-full h-full" width={vw} height={vh} aria-hidden="true">
        <path d={cutout} fill="rgba(10,10,12,0.62)" fillRule="evenodd" />
      </svg>
      {hole && settled && (
        <div
          className="absolute rounded-2xl pointer-events-none ring-2 ring-accent animate-[tour-pulse_1.6s_ease-out_infinite]"
          style={hole}
          aria-hidden="true"
        />
      )}

      {hand && (
        <div className="absolute pointer-events-none" style={hand} aria-hidden="true">
          <div className={below ? "" : "rotate-180"}>
            <Pointer
              size={38}
              strokeWidth={1.6}
              className={`text-[#1c1810] fill-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] ${
                settled ? "animate-[tour-tap_1.2s_ease-in-out_infinite]" : ""
              }`}
            />
          </div>
        </div>
      )}

      <div
        key={index}
        className={`absolute bg-surface text-fg border border-line-strong rounded-2xl shadow-2xl p-4 transition-opacity duration-200 ${
          settled ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={cardStyle}
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            {index + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="End tour"
            className="-mt-1 -mr-1 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <h2 id="tour-title" className="mt-1 text-[17px] font-semibold tracking-tight">
          {step.title}
        </h2>
        <p className="mt-1 text-sm text-muted leading-relaxed">{step.text}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="flex gap-1 mr-auto" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.target} className={`h-1.5 rounded-full ${i === index ? "w-4 bg-accent" : "w-1.5 bg-line-strong"}`} />
            ))}
          </span>
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="h-9 px-3 rounded-lg text-sm font-medium text-muted hover:text-fg"
            >
              Back
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={() => go(index + 1)}
            className="h-9 px-4 rounded-lg bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover"
          >
            {index === lastStep ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
