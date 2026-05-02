"use client";

import { useDashboardStore } from "@/lib/utils";
import {
  Bell,
  BrainCircuit,
  Check,
  Layers,
  Moon,
  Rows3,
  Settings2,
  Sun,
  Sparkles
} from "lucide-react";

type Theme = "dark" | "light" | "midnight";

const THEMES: { id: Theme; label: string; icon: React.ElementType; desc: string; preview: string[] }[] = [
  {
    id: "dark",
    label: "Dark",
    icon: Moon,
    desc: "Default deep-navy dashboard",
    preview: ["#0b1020", "#111831", "#4f46e5"]
  },
  {
    id: "light",
    label: "Light",
    icon: Sun,
    desc: "Clean, minimal light surface",
    preview: ["#f1f5f9", "#e2e8f0", "#6366f1"]
  },
  {
    id: "midnight",
    label: "Midnight",
    icon: Sparkles,
    desc: "Deep black with violet accents",
    preview: ["#020408", "#080d18", "#8b5cf6"]
  }
];

function Toggle({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
          checked ? "bg-indigo-500" : "bg-white/20"
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
        <Icon size={18} />
      </div>
      <div>
        <h3 className="font-brand text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    analystMode,
    compactTableDensity,
    showForecastAlerts,
    defaultPlaybook,
    notificationThreshold,
    theme,
    setAnalystMode,
    setCompactTableDensity,
    setShowForecastAlerts,
    setDefaultPlaybook,
    setNotificationThreshold,
    setTheme
  } = useDashboardStore();

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-brand text-2xl font-semibold text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Personalise appearance, configure optimisation defaults, and manage alerts.
        </p>
      </header>

      {/* Theme */}
      <div className="glass-panel p-6">
        <SectionHeader
          icon={Layers}
          title="Appearance"
          subtitle="Choose a visual theme for the entire dashboard"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={[
                  "group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                  active
                    ? "border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/40"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <Icon size={16} className={active ? "text-indigo-300" : "text-slate-400"} />
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
                      <Check size={11} className="text-white" />
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {t.preview.map((c) => (
                    <span key={c} className="h-3 w-3 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div>
                  <p className={["text-sm font-semibold", active ? "text-indigo-200" : "text-slate-100"].join(" ")}>
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Display */}
        <div className="glass-panel p-6">
          <SectionHeader
            icon={Settings2}
            title="Display Preferences"
            subtitle="Adjust density and data view modes"
          />
          <div className="space-y-3">
            <Toggle
              checked={analystMode}
              onChange={setAnalystMode}
              label="Analyst Mode"
              description="Show advanced scores, risk indices and TOU details"
            />
            <Toggle
              checked={compactTableDensity}
              onChange={setCompactTableDensity}
              label="Compact Table Density"
              description="Reduce row padding for denser data tables"
            />
            <Toggle
              checked={showForecastAlerts}
              onChange={setShowForecastAlerts}
              label="Forecast Alert Panel"
              description="Show operational alert cards on the Overview page"
            />
          </div>
        </div>

        {/* Optimisation */}
        <div className="glass-panel p-6">
          <SectionHeader
            icon={BrainCircuit}
            title="Optimisation Defaults"
            subtitle="Configure dispatch behaviour for automated actions"
          />
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm font-medium text-slate-100">Default Playbook</p>
              <p className="mb-2 text-xs text-slate-400">Risk/reward profile used by the optimiser</p>
              <div className="flex gap-2">
                {(["Conservative", "Balanced", "Aggressive"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setDefaultPlaybook(p)}
                    className={[
                      "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all",
                      defaultPlaybook === p
                        ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-200"
                        : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                    ].join(" ")}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm font-medium text-slate-100">Notification Threshold</p>
              <p className="mb-2 text-xs text-slate-400">Minimum severity of alerts to surface</p>
              <div className="flex gap-2">
                {([
                  { value: "high", label: "Critical" },
                  { value: "high-medium", label: "Medium+" },
                  { value: "all", label: "All" }
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setNotificationThreshold(opt.value)}
                    className={[
                      "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all",
                      notificationThreshold === opt.value
                        ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-200"
                        : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass-panel p-6">
        <SectionHeader
          icon={Rows3}
          title="About"
          subtitle="Platform build and data info"
        />
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          {[
            { label: "Platform", value: "Smart Grid Cost Intelligence" },
            { label: "Version", value: "1.0.0" },
            { label: "Data source", value: "Mock telemetry (demo)" }
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="mt-0.5 font-medium text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts preview */}
      <div className="glass-panel p-6">
        <SectionHeader
          icon={Bell}
          title="Alert Configuration Preview"
          subtitle="Active filter based on current threshold"
        />
        <div className="flex flex-wrap gap-2 text-xs">
          {(["critical", "warning", "info"] as const).map((level) => {
            const included =
              notificationThreshold === "all" ||
              (notificationThreshold === "high-medium" && level !== "info") ||
              (notificationThreshold === "high" && level === "critical");
            return (
              <span
                key={level}
                className={[
                  "rounded-full border px-3 py-1 font-medium capitalize",
                  included
                    ? level === "critical"
                      ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
                      : level === "warning"
                      ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                      : "border-sky-400/40 bg-sky-500/15 text-sky-300"
                    : "border-white/10 bg-white/5 text-slate-500 line-through"
                ].join(" ")}
              >
                {level}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Strikethrough levels are filtered out. Change the threshold above to include them.
        </p>
      </div>
    </section>
  );
}
