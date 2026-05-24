import { create } from "zustand";
import { mockAlerts, mockConsumption, mockForecast, mockSuggestions, mockTariffScenarios, mockTariffs, mockTouPeriods } from "@/data/mockData";
import type { AlertItem, Consumption, ForecastPoint, Suggestion, Tariff, TariffScenario, TouPeriod } from "@/types";

type DashboardData = {
  tariffs: Tariff[];
  touPeriods: TouPeriod[];
  consumption: Consumption[];
  suggestions: Suggestion[];
  alerts: AlertItem[];
  forecast: ForecastPoint[];
  tariffScenarios: TariffScenario[];
};

type DashboardStore = DashboardData & {
  loading: boolean;
  initialized: boolean;
  selectedProvider: string;
  selectedDevice: string;
  selectedRange: "24h" | "7d" | "30d";
  analystMode: boolean;
  compactTableDensity: boolean;
  showForecastAlerts: boolean;
  defaultPlaybook: "Conservative" | "Balanced" | "Aggressive";
  notificationThreshold: "high" | "high-medium" | "all";
  theme: "dark" | "light" | "midnight";
  /** Plain object keyed by alert id — avoids Set/Map in SSR/dev bundler edge cases */
  dismissedAlertIds: Record<string, true>;
  /** Alert id → epoch ms when snooze ends */
  alertSnoozeUntilMs: Record<string, number>;
  loadData: () => Promise<void>;
  setSelectedProvider: (provider: string) => void;
  setSelectedDevice: (device: string) => void;
  setSelectedRange: (range: "24h" | "7d" | "30d") => void;
  setAnalystMode: (enabled: boolean) => void;
  setCompactTableDensity: (enabled: boolean) => void;
  setShowForecastAlerts: (enabled: boolean) => void;
  setDefaultPlaybook: (playbook: "Conservative" | "Balanced" | "Aggressive") => void;
  setNotificationThreshold: (threshold: "high" | "high-medium" | "all") => void;
  setTheme: (theme: "dark" | "light" | "midnight") => void;
  dismissAlert: (id: string) => void;
  snoozeAlert: (id: string, minutes: number) => void;
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  tariffs: [],
  touPeriods: [],
  consumption: [],
  suggestions: [],
  alerts: [],
  forecast: [],
  tariffScenarios: [],
  loading: false,
  initialized: false,
  selectedProvider: "all",
  selectedDevice: "all",
  selectedRange: "24h",
  analystMode: true,
  compactTableDensity: false,
  showForecastAlerts: true,
  defaultPlaybook: "Balanced",
  notificationThreshold: "high-medium",
  theme: "dark",
  dismissedAlertIds: {},
  alertSnoozeUntilMs: {},
  loadData: async () => {
    if (get().initialized || get().loading) {
      return;
    }

    set({ loading: true });
    await delay(900);
    set({
      tariffs: mockTariffs,
      touPeriods: mockTouPeriods,
      consumption: mockConsumption,
      suggestions: mockSuggestions,
      alerts: mockAlerts,
      forecast: mockForecast,
      tariffScenarios: mockTariffScenarios,
      loading: false,
      initialized: true
    });
  },
  setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
  setSelectedDevice: (selectedDevice) => set({ selectedDevice }),
  setSelectedRange: (selectedRange) => set({ selectedRange }),
  setAnalystMode: (analystMode) => set({ analystMode }),
  setCompactTableDensity: (compactTableDensity) => set({ compactTableDensity }),
  setShowForecastAlerts: (showForecastAlerts) => set({ showForecastAlerts }),
  setDefaultPlaybook: (defaultPlaybook) => set({ defaultPlaybook }),
  setNotificationThreshold: (notificationThreshold) => set({ notificationThreshold }),
  setTheme: (theme) => set({ theme }),
  dismissAlert: (id) =>
    set((state) => ({
      dismissedAlertIds: { ...state.dismissedAlertIds, [id]: true }
    })),
  snoozeAlert: (id, minutes) =>
    set((state) => ({
      alertSnoozeUntilMs: { ...state.alertSnoozeUntilMs, [id]: Date.now() + minutes * 60 * 1000 }
    }))
}));

export const formatCurrency = (value: number, currency: Tariff["currency"] = "EUR"): string =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);

export const calculateAverageRate = (tariffs: Tariff[]): number => {
  if (tariffs.length === 0) {
    return 0;
  }
  return tariffs.reduce((sum, item) => sum + item.ratePerKwh, 0) / tariffs.length;
};

export const calculateTotalUsage = (consumption: Consumption[]): number =>
  consumption.reduce((sum, row) => sum + row.kwhUsage, 0);

export const calculateSavingsProgress = (suggestions: Suggestion[]): number => {
  const totalPotential = suggestions.reduce((sum, row) => sum + row.potentialSavings, 0);
  return Math.min(100, Math.round(totalPotential));
};

export const getDeviceLabel = (deviceId: string): string => {
  if (deviceId.startsWith("hvac")) return "HVAC";
  if (deviceId.startsWith("ev")) return "EV";
  if (deviceId.startsWith("water")) return "Water Heating";
  if (deviceId.startsWith("kitchen")) return "Kitchen";
  return "General";
};

export const filterConsumption = (
  consumption: Consumption[],
  selectedDevice: string
): Consumption[] => (selectedDevice === "all" ? consumption : consumption.filter((row) => row.deviceId === selectedDevice));

const rangeToMs = (range: "24h" | "7d" | "30d"): number => {
  if (range === "24h") return 24 * 60 * 60 * 1000;
  if (range === "7d") return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
};

export const filterConsumptionByRange = (
  consumption: Consumption[],
  range: "24h" | "7d" | "30d"
): Consumption[] => {
  const cutoff = Date.now() - rangeToMs(range);
  return consumption.filter((row) => new Date(row.timestamp).getTime() >= cutoff);
};

export const filterForecastByRange = (
  forecast: ForecastPoint[],
  range: "24h" | "7d" | "30d"
): ForecastPoint[] => {
  const limit = range === "24h" ? 1 : range === "7d" ? 7 : 30;
  return forecast.slice(0, limit);
};

export const mapAlertsByThreshold = (
  alerts: AlertItem[],
  threshold: "high" | "high-medium" | "all"
): AlertItem[] => {
  if (threshold === "all") return alerts;
  if (threshold === "high-medium") return alerts.filter((alert) => alert.level !== "info");
  return alerts.filter((alert) => alert.level === "critical");
};

export type TariffScore = {
  tariff: Tariff;
  score: number;
  estimatedUnitCost: number;
  riskIndex: number;
  peakShare: number;
  volatilitySpread: number;
  reasons: string[];
};

const parseMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const isWithinPeakWindow = (timestamp: string, start: string, end: string): boolean => {
  const minutes = new Date(timestamp).getHours() * 60 + new Date(timestamp).getMinutes();
  const startMinutes = parseMinutes(start);
  const endMinutes = parseMinutes(end);
  return minutes >= startMinutes && minutes <= endMinutes;
};

export const scoreTariffs = (
  tariffs: Tariff[],
  touPeriods: TouPeriod[],
  consumption: Consumption[]
): TariffScore[] => {
  if (tariffs.length === 0) return [];

  const totalUsage = calculateTotalUsage(consumption);
  const peakShareByTariff = tariffs.map((tariff) => {
    if (totalUsage <= 0) return { tariffId: tariff.id, peakShare: 0 };
    const peakUsage = consumption
      .filter((row) => isWithinPeakWindow(row.timestamp, tariff.peakStartTime, tariff.peakEndTime))
      .reduce((sum, row) => sum + row.kwhUsage, 0);
    return { tariffId: tariff.id, peakShare: peakUsage / totalUsage };
  });

  return tariffs
    .map((tariff) => {
      const tariffPeriods = touPeriods.filter((period) => period.tariffId === tariff.id);
      const peakMultiplier = tariffPeriods.length > 0 ? Math.max(...tariffPeriods.map((period) => period.multiplier)) : 1;
      const offPeakMultiplier = tariffPeriods.length > 0 ? Math.min(...tariffPeriods.map((period) => period.multiplier)) : 1;
      const avgMultiplier =
        tariffPeriods.length > 0
          ? tariffPeriods.reduce((sum, period) => sum + period.multiplier, 0) / tariffPeriods.length
          : 1;
      const peakShare = peakShareByTariff.find((item) => item.tariffId === tariff.id)?.peakShare ?? 0.2;

      // Estimated cost combines base rate, average TOU uplift, and observed peak-share behavior.
      const estimatedUnitCost =
        tariff.ratePerKwh * (avgMultiplier * 0.6 + peakMultiplier * peakShare * 0.4 + offPeakMultiplier * 0.15);

      // Risk index reflects volatility between peak/off-peak and dependency on peak windows.
      const riskIndex = Math.min(1, (peakMultiplier - offPeakMultiplier) * 0.6 + peakShare * 0.4);
      const score = Math.max(0, 100 - estimatedUnitCost * 240 - riskIndex * 35);
      const volatilitySpread = peakMultiplier - offPeakMultiplier;

      return {
        tariff,
        score: Number(score.toFixed(1)),
        estimatedUnitCost: Number(estimatedUnitCost.toFixed(3)),
        riskIndex: Number(riskIndex.toFixed(2)),
        peakShare: Number(peakShare.toFixed(2)),
        volatilitySpread: Number(volatilitySpread.toFixed(2)),
        reasons: [
          `Effective rate around ${formatCurrency(estimatedUnitCost)} per kWh`,
          `Peak window exposure ${(peakShare * 100).toFixed(0)}%`,
          `Volatility ${(riskIndex * 100).toFixed(0)}% from TOU spread`
        ]
      };
    })
    .sort((a, b) => b.score - a.score);
};

export const simulateLoadShift = (
  consumption: Consumption[],
  shiftPercent: number,
  baselineRate: number
): { baselineCost: number; optimizedCost: number; savingsPercent: number } => {
  const totalUsage = calculateTotalUsage(consumption);
  const baselineCost = totalUsage * baselineRate;

  // Simulates moving a share of peak-heavy usage into lower-cost periods.
  const shiftedUsage = totalUsage * (shiftPercent / 100);
  const optimizedCost = baselineCost - shiftedUsage * baselineRate * 0.22;
  const savingsPercent = baselineCost > 0 ? ((baselineCost - optimizedCost) / baselineCost) * 100 : 0;

  return {
    baselineCost: Number(baselineCost.toFixed(2)),
    optimizedCost: Number(optimizedCost.toFixed(2)),
    savingsPercent: Number(savingsPercent.toFixed(1))
  };
};
