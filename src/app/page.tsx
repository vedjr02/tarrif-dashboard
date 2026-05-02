"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Gauge, ShieldCheck, Zap } from "lucide-react";
import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { AlertPanel } from "@/components/AlertPanel";
import { DashboardLoadingScreen } from "@/components/DashboardLoadingScreen";
import { ForecastPanel } from "@/components/ForecastPanel";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import {
  useDashboardStore,
  calculateAverageRate,
  calculateSavingsProgress,
  calculateTotalUsage,
  filterConsumptionByRange,
  mapAlertsByThreshold,
  formatCurrency
} from "@/lib/utils";

export default function HomePage() {
  const {
    loading,
    initialized,
    tariffs,
    consumption,
    suggestions,
    alerts,
    forecast,
    selectedRange,
    showForecastAlerts,
    notificationThreshold,
    loadData
  } = useDashboardStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Simulates first-load API hydration so loading states mirror production behavior.
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

  const averageRate = useMemo(() => calculateAverageRate(tariffs), [tariffs]);
  const rangedConsumption = useMemo(() => filterConsumptionByRange(consumption, selectedRange), [consumption, selectedRange]);
  const totalUsage = useMemo(() => calculateTotalUsage(rangedConsumption), [rangedConsumption]);
  const savingsProgress = useMemo(() => calculateSavingsProgress(suggestions), [suggestions]);
  const providers = useMemo(() => tariffs.map((item) => item.providerName), [tariffs]);
  const devices = useMemo(() => Array.from(new Set(consumption.map((row) => row.deviceId))), [consumption]);
  const projectedMonthlyBill = averageRate * totalUsage * 30;
  const avoidableSpend = projectedMonthlyBill * (savingsProgress / 100);
  const visibleAlerts = useMemo(() => mapAlertsByThreshold(alerts, notificationThreshold), [alerts, notificationThreshold]);

  if (loading || !initialized) {
    return (
      <DashboardLoadingScreen
        title="Loading Dashboard Metrics"
        description="Syncing tariff intelligence, telemetry streams, and optimization insights."
      />
    );
  }

  const gaugeData = [{ name: "Savings", value: savingsProgress, fill: "#7c85ff" }];

  return (
    <section className={["space-y-6 transition-all duration-500", ready ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"].join(" ")}>
      <GlobalFilterBar providers={providers} devices={devices} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="glass-panel p-5 md:col-span-2 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2 text-slate-300">
            <Zap size={18} />
            <p className="font-brand text-sm">Current Avg. Electricity Rate</p>
          </div>
          <p className="text-3xl font-semibold text-white">{formatCurrency(averageRate)}</p>
          <p className="mt-1 text-sm text-slate-400">Across {tariffs.length} active providers</p>
        </div>
        <div className="glass-panel p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-300">
            <Gauge size={18} />
            <p className="font-brand text-sm">{selectedRange} Consumption</p>
          </div>
          <p className="text-3xl font-semibold text-white">{totalUsage.toFixed(2)} kWh</p>
          <p className="mt-1 text-sm text-slate-400">Smart meter consumption across selected time window</p>
        </div>
        <div className="glass-panel p-5">
          <p className="font-brand mb-3 text-sm text-slate-300">Savings Optimization Progress</p>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="95%"
                barSize={14}
                data={gaugeData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar background dataKey="value" cornerRadius={999} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="-mt-4 text-center text-2xl font-semibold text-white">{savingsProgress}%</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel p-5">
          <p className="font-brand text-sm text-slate-400">Projected Monthly Bill</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(projectedMonthlyBill)}</p>
        </div>
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 text-slate-400">
            <CircleDollarSign size={16} />
            <p className="font-brand text-sm">Avoidable Spend</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">{formatCurrency(avoidableSpend)}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="font-brand text-sm text-slate-400">Peak Exposure</p>
          <p className="mt-1 text-2xl font-semibold text-amber-300">42%</p>
        </div>
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck size={16} />
            <p className="font-brand text-sm">Optimization Confidence</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-sky-300">87%</p>
        </div>
      </div>
      <div className={`grid gap-4 ${showForecastAlerts ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        {showForecastAlerts ? (
          <AlertPanel alerts={visibleAlerts} />
        ) : (
          <div className="glass-panel p-5">
            <h3 className="font-brand text-base font-semibold text-white">Operational Alerts Hidden</h3>
            <p className="mt-2 text-sm text-slate-300">Enable forecast alerts in Settings to display real-time alert cards.</p>
          </div>
        )}
        <ForecastPanel forecast={forecast} />
      </div>
    </section>
  );
}
