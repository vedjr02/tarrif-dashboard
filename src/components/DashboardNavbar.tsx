"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CircleUserRound,
  Cpu,
  FileText,
  Lightbulb,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  TrendingUp,
  Zap
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: Zap, section: "Core" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, section: "Core" },
  { href: "/tariff-lab", label: "Tariff Lab", icon: Sparkles, section: "Intelligence" },
  { href: "/optimization", label: "Optimization", icon: TrendingUp, section: "Intelligence" },
  { href: "/forecast", label: "Forecast", icon: Activity, section: "Intelligence" },
  { href: "/suggestions", label: "Suggestions", icon: Lightbulb, section: "Intelligence" },
  { href: "/reports", label: "Reports", icon: FileText, section: "Operations" },
  { href: "/system-health", label: "Health", icon: Cpu, section: "Operations" },
  { href: "/settings", label: "Settings", icon: Settings, section: "Admin" }
];

const sections = ["Core", "Intelligence", "Operations", "Admin"] as const;

interface DashboardNavbarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function DashboardNavbar({ collapsed, onToggle }: DashboardNavbarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "dashboard-sidebar fixed inset-y-0 left-0 z-50 hidden border-r backdrop-blur-xl md:flex md:flex-col",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-20" : "w-72"
      ].join(" ")}
    >
      <div className="border-b border-[var(--sidebar-border)] px-4 py-4">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p
              className={[
                "font-brand text-xs uppercase tracking-[0.2em] text-[var(--sidebar-fg-dim)]",
                collapsed ? "hidden" : "block"
              ].join(" ")}
            >
              VCG Tariff Analysis
            </p>
            <button
              onClick={onToggle}
              className="rounded-md border border-[var(--sidebar-border)] bg-[var(--sidebar-card)] p-2 text-[var(--sidebar-fg-muted)] transition hover:bg-[var(--sidebar-hover)]"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </div>
          <h1
            className={[
              "font-brand font-semibold text-[var(--sidebar-fg)]",
              collapsed ? "text-xs text-center" : "text-lg sm:text-xl"
            ].join(" ")}
          >
            {collapsed ? "SGCI" : "Smart Grid Cost Intelligence"}
          </h1>
        </div>
      </div>

      <nav className="hide-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section} className="mb-4 space-y-1">
            <p
              className={[
                "px-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-[var(--sidebar-fg-dim)]",
                collapsed ? "hidden" : "block"
              ].join(" ")}
            >
              {section}
            </p>
            {navItems
              .filter((item) => item.section === section)
              .map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "flex items-center rounded-lg px-3 py-2 text-sm transition",
                      collapsed ? "justify-center" : "gap-2",
                      active
                        ? "bg-accent text-white"
                        : "text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]"
                    ].join(" ")}
                  >
                    <Icon size={16} />
                    <span className={collapsed ? "hidden" : "inline"}>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-3">
        <div
          className={[
            "rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-card)] p-3",
            collapsed ? "flex justify-center" : "block"
          ].join(" ")}
        >
          {collapsed ? (
            <CircleUserRound size={18} className="text-[var(--sidebar-fg-muted)]" />
          ) : (
            <>
              <p className="text-xs text-[var(--sidebar-fg-dim)]">User</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-[var(--sidebar-fg-muted)]">
                <CircleUserRound size={16} />
                <span>Analyst Profile</span>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
