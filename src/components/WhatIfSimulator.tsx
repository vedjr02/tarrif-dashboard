"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Consumption } from "@/types";
import { formatCurrency, simulateLoadShift } from "@/lib/utils";

interface WhatIfSimulatorProps {
  consumption: Consumption[];
  blendedRate: number;
}

export function WhatIfSimulator({ consumption, blendedRate }: WhatIfSimulatorProps) {
  const [shiftPercent, setShiftPercent] = useState(15);

  const simulation = useMemo(
    () => simulateLoadShift(consumption, shiftPercent, blendedRate),
    [consumption, shiftPercent, blendedRate]
  );

  const chartData = [
    { label: "Baseline", value: simulation.baselineCost },
    { label: "Optimized", value: simulation.optimizedCost }
  ];

  return (
    <div className="glass-panel p-5">
      <h3 className="font-brand text-base font-semibold text-white">What-If Load Shift Simulator</h3>
      <p className="mb-4 text-sm text-slate-300">Model savings by moving peak-heavy usage into off-peak windows.</p>

      <label className="text-xs text-slate-400">
        Shift load to off-peak: <span className="text-indigo-300">{shiftPercent}%</span>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={shiftPercent}
          onChange={(event) => setShiftPercent(Number(event.target.value))}
          className="mt-2 w-full accent-indigo-400"
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs text-slate-400">Baseline Cost</p>
          <p className="text-sm font-semibold text-white">{formatCurrency(simulation.baselineCost)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs text-slate-400">Optimized Cost</p>
          <p className="text-sm font-semibold text-emerald-300">{formatCurrency(simulation.optimizedCost)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs text-slate-400">Savings</p>
          <p className="text-sm font-semibold text-sky-300">{simulation.savingsPercent}%</p>
        </div>
      </div>

      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="label" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Cost"]}
              wrapperStyle={{ outline: "none", zIndex: 20 }}
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.96)",
                border: "1px solid rgba(148, 163, 184, 0.4)",
                borderRadius: "12px",
                boxShadow: "0 12px 32px rgba(2, 6, 23, 0.5)",
                padding: "10px 14px",
                color: "#e2e8f0"
              }}
              labelStyle={{ color: "#f8fafc", fontWeight: 600, marginBottom: 6 }}
              itemStyle={{ color: "#cbd5e1", paddingTop: 2 }}
              cursor={false}
            />
            <Bar dataKey="value" fill="#7c85ff" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
