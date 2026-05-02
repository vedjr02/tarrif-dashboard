"use client";

import { useEffect, useState } from "react";
import { DashboardLoadingScreen } from "@/components/DashboardLoadingScreen";
import { ForecastPanel } from "@/components/ForecastPanel";
import { filterForecastByRange, formatCurrency, useDashboardStore } from "@/lib/utils";

export default function ForecastPage() {
  const { loading, initialized, forecast, selectedRange, loadData } = useDashboardStore();
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
        title="Loading Forecast Model"
        description="Generating trend baselines, optimization deltas, and confidence signals."
      />
    );
  }

  const scopedForecast = filterForecastByRange(forecast, selectedRange);
  const projected = scopedForecast.reduce((sum, row) => sum + row.projectedCost, 0);
  const optimized = scopedForecast.reduce((sum, row) => sum + row.optimizedCost, 0);

  return (
    <section className={["space-y-5 transition-all duration-500", ready ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"].join(" ")}>
      <header>
        <h2 className="font-brand text-xl font-semibold text-white">Forecast & Anomalies</h2>
        <p className="text-sm text-slate-300">Short-term bill prediction with optimization deltas and anomaly flags.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-400">{selectedRange} Baseline Cost</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(projected)}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-400">{selectedRange} Optimized Cost</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">{formatCurrency(optimized)}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-400">Forecast Confidence</p>
          <p className="mt-1 text-2xl font-semibold text-sky-300">91%</p>
        </div>
      </div>
      <ForecastPanel forecast={scopedForecast} heading={`${selectedRange} Cost Forecast`} />
    </section>
  );
}
