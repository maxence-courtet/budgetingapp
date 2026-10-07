"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pointer, X } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { lifeItems } from "@/lib/nav";

interface Step {
  /** Matches `data-tour` on the element to point at; the first visible match wins (phone or desktop layout). */
  target: string;
  title: string;
  text: string;
  /** Page to open first when the element lives there. */
  path?: string;
  /** Only shown when this is true for the user's choices. */
  when?: (modules: string[]) => boolean;
}

const STEPS: Step[] = [
  {
    target: "add",
    path: "/",
    title: "Add a transaction",
    text: "Tap + from any page. Hive files it into the right month and creates the month if needed.",
  },
  {
    target: "money",
    path: "/",
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
    path: "/",
    title: "Life",
    text: "Your habits, fitness, goals and notes, each one a tap away.",
    when: (modules) => lifeItems.some((i) => i.module && modules.includes(i.module)),
  },
  {
    target: "ai",
    path: "/",
    title: "Next moves",
    text: "Ask the AI for the three things most worth doing now, based on your own data.",
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

/**
 * The guided tour: dims the page, cuts a spotlight around the real button, taps it with an animated hand
 * and explains it in a small card. Steps whose button isn't on screen (e.g. a module that's off) are skipped.
 */
export function SpotlightTour() {
  const { tourOpen, endTour, modules } = usePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const steps = STEPS.filter((s) => !s.when || s.when(modules));

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const targetRef = useRef<HTMLElement | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];

  const close = useCallback(() => {
    setIndex(0);
    setRect(null);
    endTour();
  }, [endTour]);

  const go = useCallback(
    (to: number) => {
      if (to >= steps.length) return close();
      setRect(null);
      setIndex(Math.max(0, to));
    },
    [steps.length, close]
  );

  // Open the step's page, then wait for its element to appear; skip the step if it never does.
  useEffect(() => {
    if (!tourOpen || !step) return;
    if (step.path && pathname !== step.path) {
      router.push(step.path);
      return;
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = findTarget(step.target);
      if (el) {
        window.clearInterval(timer);
        targetRef.current = el;
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        window.setTimeout(() => setRect(el.getBoundingClientRect()), 250);
      } else if (++tries > 40) {
        window.clearInterval(timer);
        go(index + 1);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [tourOpen, step, index, pathname, router, go]);

  // Follow the element as the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!tourOpen) return;
    const update = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (targetRef.current && rect) setRect(targetRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourOpen, rect !== null]);

  useEffect(() => {
    if (!tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOpen, index, go, close]);

  useEffect(() => {
    if (rect) nextRef.current?.focus({ preventScroll: true });
  }, [rect]);

  if (!tourOpen || !step) return null;

  const hole = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  // The card goes on the side of the element with more room, kept inside the screen.
  const cardW = Math.min(CARD_W, viewport.w - 32);
  const below = hole ? hole.top + hole.height / 2 < viewport.h / 2 : true;
  const cardLeft = hole ? Math.min(Math.max(hole.left + hole.width / 2 - cardW / 2, 16), viewport.w - cardW - 16) : 16;
  const cardStyle: React.CSSProperties = hole
    ? below
      ? { top: hole.top + hole.height + 56, left: cardLeft, width: cardW }
      : { bottom: viewport.h - hole.top + 56, left: cardLeft, width: cardW }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: cardW };

  // The hand comes from the card's side and its fingertip rests on the element's edge, so the icon or
  // label it points at stays visible. The fingertip sits 16px from the left of the 38px icon (22px when flipped).
  const hand = hole && {
    left: hole.left + hole.width / 2 - (below ? 16 : 22),
    top: below ? hole.top + hole.height - PAD - 8 : hole.top + PAD + 8 - 38,
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dimmed page with a spotlight hole; clicks on the dimmed part do nothing. */}
      {hole ? (
        <div
          className="absolute rounded-2xl transition-all duration-300 ease-out pointer-events-none"
          style={{ ...hole, boxShadow: "0 0 0 9999px rgba(10,10,12,0.62)" }}
        >
          <span className="absolute inset-0 rounded-2xl ring-2 ring-accent animate-[tour-pulse_1.6s_ease-out_infinite]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[rgba(10,10,12,0.62)]" />
      )}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {hand && (
        <div className="absolute pointer-events-none transition-all duration-300 ease-out" style={hand} aria-hidden="true">
          <div className={below ? "" : "rotate-180"}>
            <Pointer
              size={38}
              strokeWidth={1.6}
              className="text-[#1c1810] fill-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] animate-[tour-tap_1.2s_ease-in-out_infinite]"
            />
          </div>
        </div>
      )}

      <div
        className="absolute bg-surface text-fg border border-line-strong rounded-2xl shadow-2xl p-4 transition-all duration-300 ease-out"
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
              <span key={s.target} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-accent" : "w-1.5 bg-line-strong"}`} />
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
            {index === steps.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
