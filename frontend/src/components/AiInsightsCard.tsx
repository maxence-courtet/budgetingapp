"use client";

import { useState } from "react";
import { getLifeInsights } from "@/lib/api";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  Sparkles,
  RefreshCw,
  CircleCheck,
  Info,
  TriangleAlert,
  OctagonAlert,
  Lightbulb,
} from "lucide-react";

interface Insights {
  generatedAt: string;
  summary: string;
  highlights: string[];
  alerts: { severity: "info" | "warning" | "critical"; message: string }[];
  suggestions: string[];
}

const ALERT_STYLES = {
  info: { icon: Info, className: "bg-blue-50 border-blue-200 text-blue-800" },
  warning: { icon: TriangleAlert, className: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  critical: { icon: OctagonAlert, className: "bg-red-50 border-red-200 text-red-800" },
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

  return (
    <section
      aria-labelledby="insights-heading"
      className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 space-y-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={20} aria-hidden="true" />
          <h2 id="insights-heading" className="text-lg font-semibold text-slate-900">
            AI Insights
          </h2>
        </div>
        <button
          onClick={analyse}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          {loading ? "Analysing..." : insights ? "Refresh" : "Get Analysis"}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {loading && !insights && (
        <p role="status" className="text-sm text-slate-600">
          Reviewing your finances, habits, fitness and goals...
        </p>
      )}

      {!insights && !loading && !error && (
        <p className="text-sm text-slate-600">
          Get a quick read on your finances, habits, fitness and goals, with things to watch and
          what to do next.
        </p>
      )}

      {insights && (
        <div className="space-y-5" aria-live="polite">
          <p className="text-slate-800 leading-relaxed">{insights.summary}</p>

          {insights.alerts.length > 0 && (
            <ul className="space-y-2" aria-label="Alerts">
              {insights.alerts.map((a, i) => {
                const { icon: Icon, className } = ALERT_STYLES[a.severity] ?? ALERT_STYLES.info;
                return (
                  <li key={i} className={`flex gap-2 border rounded-lg p-3 text-sm ${className}`}>
                    <Icon size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <span className="sr-only">{a.severity}: </span>
                      {a.message}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.highlights.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Going well</h3>
                <ul className="space-y-2">
                  {insights.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <CircleCheck size={16} className="text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Next steps</h3>
                <ul className="space-y-2">
                  {insights.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <Lightbulb size={16} className="text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600">
            Generated {new Date(insights.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </section>
  );
}
