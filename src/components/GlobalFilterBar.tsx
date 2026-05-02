"use client";

import { SlidersHorizontal } from "lucide-react";
import { useDashboardStore } from "@/lib/utils";

interface GlobalFilterBarProps {
  providers: string[];
  devices: string[];
}

export function GlobalFilterBar({ providers, devices }: GlobalFilterBarProps) {
  const {
    selectedProvider,
    selectedDevice,
    selectedRange,
    analystMode,
    setSelectedProvider,
    setSelectedDevice,
    setSelectedRange
  } = useDashboardStore();

  return (
    <div className="glass-panel p-4">
      <div className="mb-3 flex items-center gap-2 text-slate-200">
        <SlidersHorizontal size={16} />
        <p className="font-brand text-sm font-medium">Analysis Filters</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-400">
          Provider
          <select
            value={selectedProvider}
            onChange={(event) => setSelectedProvider(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="all">All providers</option>
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Device
          <select
            value={selectedDevice}
            onChange={(event) => setSelectedDevice(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="all">All devices</option>
            {devices.map((device) => (
              <option key={device} value={device}>
                {device}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Time window
          <select
            value={selectedRange}
            onChange={(event) => setSelectedRange(event.target.value as "24h" | "7d" | "30d")}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
        <div>
          <p className="text-xs text-slate-400">Mode</p>
          <div className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-emerald-300">
            {analystMode ? "Analyst View Enabled" : "Standard View Enabled"}
          </div>
        </div>
      </div>
    </div>
  );
}
