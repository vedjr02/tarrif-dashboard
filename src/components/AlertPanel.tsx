"use client";

import { useState } from "react";
import { AlertTriangle, Bell, BellOff, Info, Siren, X } from "lucide-react";
import type { AlertItem } from "@/types";
import { useDashboardStore } from "@/lib/utils";

interface AlertPanelProps {
  alerts: AlertItem[];
}

const levelMeta = {
  critical: { icon: Siren, tone: "text-rose-300 border-rose-400/30 bg-rose-500/10" },
  warning: { icon: AlertTriangle, tone: "text-amber-300 border-amber-400/30 bg-amber-500/10" },
  info: { icon: Info, tone: "text-sky-300 border-sky-400/30 bg-sky-500/10" }
};

const SNOOZE_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hr", minutes: 60 },
  { label: "4 hr", minutes: 240 }
];

export function AlertPanel({ alerts }: AlertPanelProps) {
  const { dismissedAlerts, snoozedAlerts, dismissAlert, snoozeAlert } = useDashboardStore();
  const [snoozeMenuFor, setSnoozeMenuFor] = useState<string | null>(null);

  const now = Date.now();
  const visible = alerts.filter(
    (a) => !dismissedAlerts.has(a.id) && (snoozedAlerts.get(a.id) ?? 0) <= now
  );

  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-brand text-base font-semibold text-white">Operational Alerts</h3>
          <p className="text-sm text-slate-300">Time-sensitive signals from tariff and telemetry behavior.</p>
        </div>
        {visible.length > 0 && (
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300">
            {visible.length} active
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
          <BellOff size={28} />
          <p className="text-sm">No active alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((alert) => {
            const meta = levelMeta[alert.level];
            const Icon = meta.icon;
            return (
              <article key={alert.id} className={`relative rounded-lg border px-3 py-3 ${meta.tone}`}>
                <div className="flex items-start gap-2 pr-16">
                  <Icon size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="text-xs opacity-90">{alert.detail}</p>
                  </div>
                </div>

                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <div className="relative">
                    <button
                      onClick={() => setSnoozeMenuFor(snoozeMenuFor === alert.id ? null : alert.id)}
                      className="rounded p-1 opacity-60 transition hover:opacity-100 hover:bg-white/10"
                      title="Snooze"
                    >
                      <Bell size={13} />
                    </button>
                    {snoozeMenuFor === alert.id && (
                      <div className="absolute right-0 top-7 z-30 min-w-[100px] rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-xl backdrop-blur-xl">
                        {SNOOZE_OPTIONS.map((opt) => (
                          <button
                            key={opt.minutes}
                            onClick={() => {
                              snoozeAlert(alert.id, opt.minutes);
                              setSnoozeMenuFor(null);
                            }}
                            className="block w-full rounded-lg px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="rounded p-1 opacity-60 transition hover:opacity-100 hover:bg-white/10"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
