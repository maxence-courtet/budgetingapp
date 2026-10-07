"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, ArrowRight } from "lucide-react";
import { navItems, ModuleId } from "@/lib/nav";
import { usePreferences } from "@/components/PreferencesProvider";
import { openQuickAdd } from "@/components/QuickAddTransaction";

interface Command {
  id: string;
  label: string;
  hint: string;
  href?: string;
  run?: () => void;
  module?: ModuleId;
}

const OPEN_EVENT = "lh:open-command";

/** Focuses the command bar; on phones it opens full screen from the header's search button. */
export function openCommandBar() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const ACTIONS: Command[] = [
  { id: "a-transaction", label: "Add a transaction", hint: "Money", run: openQuickAdd },
  { id: "a-month", label: "Start a new month", hint: "Months", href: "/months" },
  { id: "a-habit", label: "Check in a habit", hint: "Habits", href: "/habits", module: "habits" },
  { id: "a-fitness", label: "Log weight or a workout", hint: "Fitness", href: "/fitness", module: "fitness" },
  { id: "a-goal", label: "Add a goal", hint: "Goals", href: "/goals", module: "goals" },
  { id: "a-note", label: "Write a note", hint: "Notes", href: "/notes", module: "notes" },
  { id: "a-journal", label: "Write today’s journal entry", hint: "Journal", href: "/notes?view=journal", module: "notes" },
  { id: "a-trade", label: "Record a trade", hint: "Investments", href: "/investments/trades", module: "investments" },
  { id: "a-review", label: "Review my week", hint: "Review", href: "/review", module: "review" },
  { id: "a-account", label: "Add an account", hint: "Set up", href: "/accounts" },
  { id: "a-category", label: "Add a category", hint: "Set up", href: "/categories" },
  { id: "a-settings", label: "Change theme or accent color", hint: "Settings", href: "/settings" },
];

const PAGES: Command[] = [...navItems, { href: "/settings", label: "Settings" }, { href: "/notes?view=journal", label: "Journal" }].map((i) => ({
  id: `p-${i.href}`,
  label: `Go to ${i.label}`,
  hint: "Page",
  href: i.href,
  module: "module" in i ? i.module : undefined,
}));

export function CommandBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Phones only: the bar is hidden until the header's search button opens it full screen.
  const [sheet, setSheet] = useState(false);
  const { modules } = usePreferences();

  useEffect(() => {
    function onOpen() {
      setSheet(true);
      setOpen(true);
      // After the overlay renders; on iOS focus must stay in the tap's call stack to raise the keyboard.
      inputRef.current?.focus();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...ACTIONS, ...PAGES].filter((c) => !c.module || modules.includes(c.module));
    const matches = q ? all.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(q)) : all.slice(0, 8);
    if (q) {
      matches.push({
        id: "search",
        label: `Search transactions for “${query.trim()}”`,
        hint: "Search",
        href: `/search?query=${encodeURIComponent(query.trim())}`,
      });
    }
    return matches.slice(0, 9);
  }, [query, modules]);

  function run(cmd: Command | undefined) {
    if (!cmd) return;
    if (cmd.run) cmd.run();
    else if (cmd.href) router.push(cmd.href);
    close();
  }

  function close() {
    setQuery("");
    setOpen(false);
    setSheet(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === "Escape") {
      close();
    }
  }

  const showList = open && results.length > 0;

  return (
    <div
      className={`flex-1 min-w-0 lg:relative lg:block ${
        sheet ? "fixed inset-0 z-50 bg-canvas p-3 flex flex-col" : "hidden"
      }`}
    >
      <div className="flex items-center gap-2">
      <label
        htmlFor="command-input"
        className="flex-1 min-w-0 flex items-center gap-3 h-12 px-4 rounded-xl border border-line-strong bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 transition-colors cursor-text"
      >
        <Search size={18} className="text-muted shrink-0" aria-hidden="true" />
        <span className="sr-only">Command bar</span>
        <input
          ref={inputRef}
          id="command-input"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="command-results"
          aria-activedescendant={showList ? `cmd-${results[active]?.id}` : undefined}
          autoComplete="off"
          placeholder="Search, jump to a page or do something…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => !sheet && setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 bg-transparent outline-none focus-visible:outline-none text-base lg:text-[15px] text-fg"
        />
        <kbd className="hidden sm:inline font-mono text-xs text-muted border border-line-strong rounded-md px-1.5 py-0.5">
          ⌘K
        </kbd>
      </label>
      {sheet && (
        <button type="button" onClick={close} className="lg:hidden h-12 px-2 text-sm font-medium text-muted hover:text-fg">
          Cancel
        </button>
      )}
      </div>

      {showList && (
        <ul
          id="command-results"
          role="listbox"
          aria-label="Commands"
          className="mt-2 p-1.5 rounded-xl border border-line-strong bg-surface overflow-y-auto lg:absolute lg:z-30 lg:left-0 lg:right-0 lg:shadow-2xl lg:shadow-black/20"
        >
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`cmd-${c.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                run(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-3 px-3 h-12 lg:h-10 rounded-lg text-sm cursor-pointer ${
                i === active ? "bg-surface-2 text-fg" : "text-fg-2"
              }`}
            >
              <ArrowRight size={14} className={i === active ? "text-accent" : "text-faint"} aria-hidden="true" />
              <span className="flex-1 truncate">{c.label}</span>
              <span className="font-mono text-[11px] text-faint">{c.hint}</span>
              {i === active && <CornerDownLeft size={13} className="text-muted" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
