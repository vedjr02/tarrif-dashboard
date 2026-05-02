"use client";

import { useEffect, useState } from "react";
import { DashboardNavbar } from "@/components/DashboardNavbar";
import { useDashboardStore } from "@/lib/utils";

const SIDEBAR_KEY = "tariff-dashboard-sidebar-collapsed";
const SETTINGS_KEY = "tariff-dashboard-user-settings";

type PersistedSettings = {
  selectedRange?: "24h" | "7d" | "30d";
  analystMode?: boolean;
  compactTableDensity?: boolean;
  showForecastAlerts?: boolean;
  defaultPlaybook?: "Conservative" | "Balanced" | "Aggressive";
  notificationThreshold?: "high" | "high-medium" | "all";
  theme?: "dark" | "light" | "midnight";
};

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  const selectedRange = useDashboardStore((state) => state.selectedRange);
  const analystMode = useDashboardStore((state) => state.analystMode);
  const compactTableDensity = useDashboardStore((state) => state.compactTableDensity);
  const showForecastAlerts = useDashboardStore((state) => state.showForecastAlerts);
  const defaultPlaybook = useDashboardStore((state) => state.defaultPlaybook);
  const notificationThreshold = useDashboardStore((state) => state.notificationThreshold);
  const theme = useDashboardStore((state) => state.theme);

  const setSelectedRange = useDashboardStore((state) => state.setSelectedRange);
  const setAnalystMode = useDashboardStore((state) => state.setAnalystMode);
  const setCompactTableDensity = useDashboardStore((state) => state.setCompactTableDensity);
  const setShowForecastAlerts = useDashboardStore((state) => state.setShowForecastAlerts);
  const setDefaultPlaybook = useDashboardStore((state) => state.setDefaultPlaybook);
  const setNotificationThreshold = useDashboardStore((state) => state.setNotificationThreshold);
  const setTheme = useDashboardStore((state) => state.setTheme);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_KEY);
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      setSettingsHydrated(true);
      return;
    }

    try {
      const saved = JSON.parse(raw) as PersistedSettings;
      if (saved.selectedRange) setSelectedRange(saved.selectedRange);
      if (typeof saved.analystMode === "boolean") setAnalystMode(saved.analystMode);
      if (typeof saved.compactTableDensity === "boolean") setCompactTableDensity(saved.compactTableDensity);
      if (typeof saved.showForecastAlerts === "boolean") setShowForecastAlerts(saved.showForecastAlerts);
      if (saved.defaultPlaybook) setDefaultPlaybook(saved.defaultPlaybook);
      if (saved.notificationThreshold) setNotificationThreshold(saved.notificationThreshold);
      if (saved.theme) setTheme(saved.theme);
    } catch {
      // Ignore invalid localStorage JSON and keep defaults.
    } finally {
      setSettingsHydrated(true);
    }
  }, [
    setAnalystMode,
    setCompactTableDensity,
    setDefaultPlaybook,
    setNotificationThreshold,
    setSelectedRange,
    setShowForecastAlerts,
    setTheme
  ]);

  useEffect(() => {
    if (!settingsHydrated) return;

    const payload: PersistedSettings = {
      selectedRange,
      analystMode,
      compactTableDensity,
      showForecastAlerts,
      defaultPlaybook,
      notificationThreshold,
      theme
    };
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  }, [
    settingsHydrated,
    selectedRange,
    analystMode,
    compactTableDensity,
    showForecastAlerts,
    defaultPlaybook,
    notificationThreshold,
    theme
  ]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleSidebar = () => {
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  return (
    <>
      <DashboardNavbar collapsed={collapsed} onToggle={toggleSidebar} />
      <main
        className={[
          "w-full px-4 py-8 transition-[margin-left,width] duration-300 ease-out sm:px-6 lg:px-8",
          collapsed ? "md:ml-20 md:w-[calc(100%-5rem)]" : "md:ml-72 md:w-[calc(100%-18rem)]"
        ].join(" ")}
      >
        {children}
      </main>
    </>
  );
}
