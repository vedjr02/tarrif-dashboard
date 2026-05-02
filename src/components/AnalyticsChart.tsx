"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Consumption } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsChartProps {
  consumption: Consumption[];
  blendedRate: number;
  selectedRange: "24h" | "7d" | "30d";
}

export function AnalyticsChart({ consumption, blendedRate, selectedRange }: AnalyticsChartProps) {
  const data = useMemo(
    () => {
      // Aggregate by timestamp to combine all device streams into one visual trend line.
      const byTimestamp = new Map<string, number>();
      consumption.forEach((row) => {
        byTimestamp.set(row.timestamp, (byTimestamp.get(row.timestamp) ?? 0) + row.kwhUsage);
      });

      return Array.from(byTimestamp.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([timestamp, usage]) => {
          const date = new Date(timestamp);
          const label =
            selectedRange === "24h"
              ? date.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" })
              : selectedRange === "7d"
                ? date.toLocaleDateString("en-IE", { weekday: "short", day: "2-digit" })
                : date.toLocaleDateString("en-IE", { day: "2-digit", month: "short" });

          const cost = usage * blendedRate;
          return {
            label,
            usage: Number(usage.toFixed(2)),
            cost: Number(cost.toFixed(3))
          };
        });
    },
    [consumption, blendedRate, selectedRange]
  );

  return (
    <div className="glass-panel p-5">
      <h3 className="font-brand text-base font-semibold text-white">{selectedRange} Consumption & Cost Trend</h3>
      <p className="mb-5 text-sm text-slate-300">Correlates kWh draw with estimated hourly tariff spend.</p>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c85ff" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#7c85ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="label" stroke="#94a3b8" minTickGap={28} />
            <YAxis yAxisId="left" stroke="#94a3b8" />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12
              }}
              formatter={(value: number, name: string) =>
                name === "Estimated Cost" ? formatCurrency(value) : `${value.toFixed(2)} kWh`
              }
            />
            <Area yAxisId="left" type="monotone" dataKey="usage" stroke="#7c85ff" fill="url(#usageGradient)" name="Usage" />
            <Area yAxisId="right" type="monotone" dataKey="cost" stroke="#22d3ee" fillOpacity={0} name="Estimated Cost" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
