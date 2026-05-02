"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Clock3, TrendingDown } from "lucide-react";
import type { Suggestion } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface SuggestionCardProps {
  suggestion: Suggestion;
}

const priorityStyles: Record<Suggestion["priority"], string> = {
  High: "bg-rose-500/20 text-rose-200 border-rose-400/40",
  Medium: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  Low: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
};

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const estimatedValue = suggestion.potentialSavings / 100;
  const confidence = useMemo(() => {
    const base = suggestion.priority === "High" ? 86 : suggestion.priority === "Medium" ? 76 : 68;
    const boost = Math.min(10, suggestion.potentialSavings / 2.8);
    return Math.min(97, Math.round(base + boost));
  }, [suggestion.priority, suggestion.potentialSavings]);

  const rationale = useMemo(
    () => [
      `Detected high cost overlap between ${suggestion.recommendedStart} and ${suggestion.recommendedEnd}.`,
      `Current tariff multipliers indicate off-peak arbitrage opportunity.`,
      `Historical usage pattern supports this shift with minimal comfort impact.`
    ],
    [suggestion.recommendedEnd, suggestion.recommendedStart]
  );

  return (
    <article className="glass-panel p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-white">{suggestion.title}</h3>
        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${priorityStyles[suggestion.priority]}`}>
          {suggestion.priority}
        </span>
      </div>
      <p className="mb-5 text-sm leading-6 text-slate-300">{suggestion.description}</p>
      <div className="space-y-2 text-sm text-slate-200">
        <div className="flex items-center gap-2">
          <TrendingDown size={16} className="text-emerald-300" />
          <span>Potential Savings: {suggestion.potentialSavings.toFixed(1)}% (~{formatCurrency(estimatedValue)}/kWh)</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock3 size={16} className="text-sky-300" />
          <span>
            Recommended: {suggestion.recommendedStart} - {suggestion.recommendedEnd}
          </span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs text-slate-400">Recommendation Confidence</p>
          <p className="text-sm font-semibold text-indigo-200">{confidence}%</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowWhy((prev) => !prev)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
      >
        {showWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showWhy ? "Hide Why" : "Why this recommendation?"}
      </button>

      {showWhy && (
        <div className="mt-3 rounded-lg border border-indigo-300/30 bg-indigo-500/10 p-3 text-xs text-slate-200">
          <p className="mb-2 font-semibold text-indigo-200">Explainability</p>
          <ul className="space-y-1">
            {rationale.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-md border border-emerald-300/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">Apply</button>
        <button className="rounded-md border border-amber-300/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">Snooze</button>
        <button className="rounded-md border border-rose-300/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">Dismiss</button>
      </div>
    </article>
  );
}
