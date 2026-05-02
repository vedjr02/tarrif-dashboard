"use client";

import { useEffect, useState } from "react";
import { DashboardLoadingScreen } from "@/components/DashboardLoadingScreen";
import { SuggestionCard } from "@/components/SuggestionCard";
import { useDashboardStore } from "@/lib/utils";

export default function SuggestionsPage() {
  const { loading, initialized, suggestions, selectedRange, loadData } = useDashboardStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Keeps interaction flow realistic while backend endpoints are not integrated yet.
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading || !initialized) {
      setReady(false);
      return;
    }
    const timer = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(timer);
  }, [loading, initialized]);

  if (loading || !initialized) {
    return (
      <DashboardLoadingScreen
        title="Loading Optimization Suggestions"
        description="Scoring recommendations by savings impact, urgency, and feasibility."
      />
    );
  }

  const rangeFactor = selectedRange === "24h" ? 0.24 : selectedRange === "7d" ? 1 : 4.2;
  const scopedSuggestions = suggestions.map((item) => ({
    ...item,
    potentialSavings: Number((item.potentialSavings * rangeFactor).toFixed(1))
  }));
  const quickWins = scopedSuggestions.filter((item) => item.priority === "High");
  const scheduled = scopedSuggestions.filter((item) => item.priority !== "High");
  const windowPotential = scopedSuggestions.reduce((sum, item) => sum + item.potentialSavings, 0);

  return (
    <section className={["space-y-4 transition-all duration-500", ready ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"].join(" ")}>
      <header>
        <h2 className="font-brand text-xl font-semibold text-white">Actionable Savings Suggestions</h2>
        <p className="text-sm text-slate-300">Prioritized recommendations generated from tariff and usage behavior.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-400">Quick Wins</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">{quickWins.length}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-400">Scheduled Improvements</p>
          <p className="mt-1 text-2xl font-semibold text-sky-300">{scheduled.length}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-400">{selectedRange} Savings Potential</p>
          <p className="mt-1 text-2xl font-semibold text-amber-300">{windowPotential.toFixed(1)}%</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickWins.concat(scheduled).map((item) => (
          <SuggestionCard key={item.id} suggestion={item} />
        ))}
      </div>
    </section>
  );
}
