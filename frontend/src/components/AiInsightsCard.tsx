"use client";

import { useState } from "react";
import { getLifeInsights } from "@/lib/api";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Sparkles, RefreshCw, CircleCheck, Info, TriangleAlert, OctagonAlert } from "lucide-react";

interface Insights {
  generatedAt: string;
  summary: string;
  highlights: string[];
  alerts: { severity: "info" | "warning" | "critical"; message: string }[];
  suggestions: string[];
}

const ALERT_STYLES = {
  info: { icon: Info, label: "Info", className: "text-fg-2" },
  warning: { icon: TriangleAlert, label: "Watch", className: "text-yellow-700" },
  critical: { icon: OctagonAlert, label: "Act now", className: "text-neg" },
};

export function AiInsightsCard() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyse() {
    setLoading(true);
    setError("");
    try {
      setInsights(await getLifeInsights());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const moves = insights?.suggestions ?? [];
  const generated = insights
    ? new Date(insights.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <section aria-labelledby="insights-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="insights-heading" className="text-[15px] font-semibold text-fg">Next moves</h2>
        <span className="text-xs text-muted">
          {generated ? `From AI Insights · ${generated}` : "Ranked by AI from your own data"}
        </span>
        <button
          onClick={analyse}
          data-tour="ai"
          disabled={loading}
          className="ml-auto flex items-center gap-2 h-9 px-3.5 text-sm font-medium rounded-lg border border-line-strong text-fg hover:border-accent hover:text-accent disabled:opacity-60 transition-colors"
        >
          {insights ? (
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          ) : (
            <Sparkles size={14} className={loading ? "animate-pulse" : ""} aria-hidden="true" />
          )}
          {loading ? "Analysing…" : insights ? "Refresh" : "Get my next moves"}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {!insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`rounded-2xl p-5 min-h-[88px] md:min-h-[140px] border border-dashed border-line-strong flex-col justify-between ${
                i === 0 ? "flex" : "hidden md:flex"
              } ${
                loading ? "animate-pulse bg-surface-2" : ""
              }`}
            >
              <span className="font-mono text-[11px] text-faint">{i + 1}</span>
              {i === 0 && (
                <p className="text-sm text-muted mt-2" role={loading ? "status" : undefined}>
                  {loading
                    ? "Reviewing your data…"
                    : "Get a quick read on where you stand and the three things worth doing next."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {insights && (
        <div className="space-y-4" aria-live="polite">
          {moves.length > 0 && (
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {moves.slice(0, 3).map((m, i) => (
                <li
                  key={i}
                  className={`rounded-2xl p-5 min-h-[140px] flex flex-col gap-3 ${
                    i === 0 ? "bg-accent text-accent-ink" : "bg-surface border border-line-strong text-fg"
                  }`}
                >
                  <span className="flex justify-between font-mono text-[11px] uppercase tracking-[0.08em] opacity-80">
                    <span>{i === 0 ? "Highest impact" : "Next"}</span>
                    <span>{i + 1}</span>
                  </span>
                  <p className="text-base font-semibold leading-snug tracking-[-0.01em]">{m}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="bg-surface border border-line rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            <div className="space-y-3">
              <p className="text-fg leading-relaxed">{insights.summary}</p>
              {insights.alerts.length > 0 && (
                <ul className="space-y-2" aria-label="Alerts">
                  {insights.alerts.map((a, i) => {
                    const { icon: Icon, label, className } = ALERT_STYLES[a.severity] ?? ALERT_STYLES.info;
                    return (
                      <li key={i} className="flex gap-2.5 text-sm text-fg-2">
                        <Icon size={16} className={`shrink-0 mt-0.5 ${className}`} aria-hidden="true" />
                        <span>
                          <span className={`font-mono text-[11px] uppercase tracking-[0.06em] mr-2 ${className}`}>{label}</span>
                          {a.message}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {insights.highlights.length > 0 && (
              <div>
                <h3 className="font-mono text-[11px] text-muted uppercase tracking-[0.08em] mb-2">Going well</h3>
                <ul className="space-y-2">
                  {insights.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm text-fg-2">
                      <CircleCheck size={16} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {moves.length > 3 && (
            <ul className="text-sm text-fg-2 space-y-1.5 pl-1">
              {moves.slice(3).map((m, i) => (
                <li key={i} className="flex gap-2"><span className="font-mono text-faint">{i + 4}</span>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
