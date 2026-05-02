"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ForecastPoint } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ForecastPanelProps {
  forecast: ForecastPoint[];
  heading?: string;
}

export function ForecastPanel({ forecast, heading = "7-Day Cost Forecast" }: ForecastPanelProps) {
  const chartData = useMemo(
    () =>
      forecast.map((point) => ({
        day: new Date(point.timestamp).toLocaleDateString("en-IE", { weekday: "short" }),
        projected: point.projectedCost,
        optimized: point.optimizedCost
      })),
    [forecast]
  );

  return (
    <div className="glass-panel p-5">
      <h3 className="font-brand text-base font-semibold text-white">{heading}</h3>
      <p className="mb-4 text-sm text-slate-300">Projected spend vs optimized dispatch scenario.</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <XAxis dataKey="day" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.94)",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: "12px",
                boxShadow: "0 12px 32px rgba(2, 6, 23, 0.45)"
              }}
              labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
              itemStyle={{ color: "#cbd5e1", textTransform: "capitalize" }}
              cursor={{ stroke: "rgba(125, 211, 252, 0.55)", strokeWidth: 1 }}
            />
            <Area type="monotone" dataKey="projected" stroke="#f43f5e" fill="#f43f5e33" />
            <Area type="monotone" dataKey="optimized" stroke="#22c55e" fill="#22c55e22" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
