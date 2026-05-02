"use client";

import { useEffect, useState } from "react";
import { DashboardLoadingScreen } from "@/components/DashboardLoadingScreen";
import { formatCurrency, useDashboardStore } from "@/lib/utils";

export default function TariffLabPage() {
  const { loading, initialized, tariffScenarios, selectedRange, loadData } = useDashboardStore();
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
        title="Loading Tariff Simulation Lab"
        description="Compiling provider volatility models and annual optimization scenarios."
      />
    );
  }

  const days = selectedRange === "24h" ? 1 : selectedRange === "7d" ? 7 : 30;
  const rangeLabel = selectedRange === "24h" ? "1-day" : selectedRange === "7d" ? "7-day" : "30-day";

  return (
    <section className={["space-y-5 transition-all duration-500", ready ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"].join(" ")}>
      <header>
        <h2 className="font-brand text-xl font-semibold text-white">Tariff Intelligence Lab</h2>
        <p className="text-sm text-slate-300">Scenario model for annual cost, volatility, and optimization impact by provider.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {tariffScenarios.map((scenario) => (
          <article key={scenario.id} className="glass-panel p-5">
            <h3 className="font-brand text-base font-semibold text-white">{scenario.providerName}</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p>Standing charge: {formatCurrency(scenario.standingCharge)}</p>
              <p>Volatility index: {(scenario.dynamicVolatility * 100).toFixed(0)}%</p>
              <p>
                {rangeLabel} baseline: {formatCurrency((scenario.annualEstimate / 365) * days)}
              </p>
              <p>
                {rangeLabel} optimized: {formatCurrency((scenario.annualOptimizedEstimate / 365) * days)}
              </p>
              <p className="pt-2 font-medium text-emerald-300">
                Savings: {formatCurrency(((scenario.annualEstimate - scenario.annualOptimizedEstimate) / 365) * days)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
