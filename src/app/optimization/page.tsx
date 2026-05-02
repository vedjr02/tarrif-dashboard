"use client";

import { useEffect, useState } from "react";
import { DashboardLoadingScreen } from "@/components/DashboardLoadingScreen";
import { useDashboardStore } from "@/lib/utils";

const playbooks = [
  { name: "Conservative", targetShift: "12%", automation: "Manual approval" },
  { name: "Balanced", targetShift: "22%", automation: "Semi-automated" },
  { name: "Aggressive", targetShift: "33%", automation: "Fully automated" }
];

export default function OptimizationPage() {
  const { loading, initialized, suggestions, defaultPlaybook, loadData } = useDashboardStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
        title="Loading Optimization Studio"
        description="Preparing dispatch playbooks, queue priorities, and automation rules."
      />
    );
  }

  return (
    <section className={["space-y-5 transition-all duration-500", ready ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"].join(" ")}>
      <header>
        <h2 className="font-brand text-xl font-semibold text-white">Optimization Studio</h2>
        <p className="text-sm text-slate-300">Build and test dispatch rules before applying them to live schedules.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {playbooks.map((playbook) => (
          <article key={playbook.name} className="glass-panel p-5">
            <h3 className="font-brand text-base font-semibold text-white">{playbook.name} Playbook</h3>
            <p className="mt-3 text-sm text-slate-300">Target peak-load shift: {playbook.targetShift}</p>
            <p className="text-sm text-slate-300">Automation level: {playbook.automation}</p>
            <button
              className={[
                "mt-4 rounded-lg border px-3 py-2 text-sm",
                defaultPlaybook === playbook.name
                  ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
                  : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
              ].join(" ")}
            >
              {defaultPlaybook === playbook.name ? "Default Playbook" : "Run Simulation"}
            </button>
          </article>
        ))}
      </div>
      <div className="glass-panel p-5">
        <h3 className="font-brand text-base font-semibold text-white">Rule Queue</h3>
        <p className="mb-3 text-sm text-slate-300">Top recommendations ready for scheduling automation.</p>
        <div className="space-y-2">
          {suggestions.map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              {item.title} ({item.priority}) - {item.recommendedStart} to {item.recommendedEnd}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
