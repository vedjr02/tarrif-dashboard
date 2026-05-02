import type { AlertItem, Consumption, ForecastPoint, Suggestion, Tariff, TariffScenario, TouPeriod } from "@/types";

export const mockTariffs: Tariff[] = [
  {
    id: "tariff-1",
    providerName: "GridFlow Energy",
    ratePerKwh: 0.32,
    peakStartTime: "17:00",
    peakEndTime: "21:00",
    currency: "EUR"
  },
  {
    id: "tariff-2",
    providerName: "VoltWise Utilities",
    ratePerKwh: 0.29,
    peakStartTime: "16:00",
    peakEndTime: "20:00",
    currency: "EUR"
  },
  {
    id: "tariff-3",
    providerName: "EcoPulse Power",
    ratePerKwh: 0.27,
    peakStartTime: "18:00",
    peakEndTime: "22:00",
    currency: "EUR"
  }
];

export const mockTouPeriods: TouPeriod[] = [
  { tariffId: "tariff-1", dayOfWeek: "Mon", startTime: "00:00", endTime: "06:00", multiplier: 0.62 },
  { tariffId: "tariff-1", dayOfWeek: "Mon", startTime: "17:00", endTime: "21:00", multiplier: 1.48 },
  { tariffId: "tariff-2", dayOfWeek: "Tue", startTime: "01:00", endTime: "07:00", multiplier: 0.58 },
  { tariffId: "tariff-2", dayOfWeek: "Tue", startTime: "16:00", endTime: "20:00", multiplier: 1.42 },
  { tariffId: "tariff-3", dayOfWeek: "Wed", startTime: "00:00", endTime: "05:00", multiplier: 0.55 },
  { tariffId: "tariff-3", dayOfWeek: "Wed", startTime: "18:00", endTime: "22:00", multiplier: 1.38 }
];

const now = Date.now();
const hour = 60 * 60 * 1000;

const devices = [
  { id: "hvac-main-01", multiplier: 1.15 },
  { id: "ev-charger-01", multiplier: 0.95 },
  { id: "water-heater-01", multiplier: 0.72 },
  { id: "kitchen-load-01", multiplier: 0.64 }
];

const totalIntervals = 30 * 6;
export const mockConsumption: Consumption[] = Array.from({ length: totalIntervals }).flatMap((_, i) => {
  const hoursBack = (totalIntervals - 1 - i) * 4;
  const timestamp = new Date(now - hoursBack * hour).toISOString();
  const hourOfDay = new Date(timestamp).getHours();
  const dayIndex = Math.floor(i / 6);
  const base = 1.02 + Math.sin((hourOfDay / 24) * Math.PI * 2) * 0.24 + Math.sin(dayIndex / 5) * 0.08;
  const eveningBoost = hourOfDay >= 16 && hourOfDay <= 22 ? 0.5 : 0;

  return devices.map((device, deviceIdx) => ({
    deviceId: device.id,
    timestamp,
    kwhUsage: Number((base * device.multiplier + eveningBoost * (deviceIdx % 2 === 0 ? 1 : 0.7)).toFixed(2)),
    userId: "user-001"
  }));
});

export const mockSuggestions: Suggestion[] = [
  {
    id: "sug-1",
    title: "Delay EV charging until super off-peak",
    description: "Starting EV charging after 23:00 reduces your effective charging cost by avoiding high TOU multipliers.",
    potentialSavings: 18.7,
    recommendedStart: "23:00",
    recommendedEnd: "05:00",
    priority: "High"
  },
  {
    id: "sug-2",
    title: "Run dishwasher overnight",
    description: "Shifting dishwasher cycles from evening peak to early morning lowers average daily energy spend.",
    potentialSavings: 9.4,
    recommendedStart: "00:00",
    recommendedEnd: "06:00",
    priority: "Medium"
  },
  {
    id: "sug-3",
    title: "Pre-cool before tariff surge",
    description: "Cooling your home just before the peak window limits compressor runtime during expensive periods.",
    potentialSavings: 7.1,
    recommendedStart: "15:30",
    recommendedEnd: "16:45",
    priority: "Low"
  }
];

export const mockAlerts: AlertItem[] = [
  {
    id: "alt-1",
    level: "critical",
    title: "Peak pricing window starts soon",
    detail: "Expected cost multiplier reaches 1.48x in 34 minutes.",
    timestamp: new Date(now - 5 * 60 * 1000).toISOString()
  },
  {
    id: "alt-2",
    level: "warning",
    title: "HVAC draw above baseline",
    detail: "Current HVAC usage is 18% above this week's average.",
    timestamp: new Date(now - 22 * 60 * 1000).toISOString()
  },
  {
    id: "alt-3",
    level: "info",
    title: "Optimization run available",
    detail: "Three new schedule recommendations are ready to apply.",
    timestamp: new Date(now - 48 * 60 * 1000).toISOString()
  }
];

export const mockForecast: ForecastPoint[] = Array.from({ length: 30 }).map((_, index) => {
  const projectedCost = 11.2 + index * 0.08 + Math.sin(index / 2.6) * 0.62;
  const optimizedCost = projectedCost * 0.84;
  return {
    timestamp: new Date(now + index * 24 * hour).toISOString(),
    projectedCost: Number(projectedCost.toFixed(2)),
    optimizedCost: Number(optimizedCost.toFixed(2))
  };
});

export const mockTariffScenarios: TariffScenario[] = [
  {
    id: "scenario-1",
    providerName: "GridFlow Energy",
    standingCharge: 0.31,
    dynamicVolatility: 0.62,
    annualEstimate: 1422.5,
    annualOptimizedEstimate: 1218.4
  },
  {
    id: "scenario-2",
    providerName: "VoltWise Utilities",
    standingCharge: 0.28,
    dynamicVolatility: 0.55,
    annualEstimate: 1378.1,
    annualOptimizedEstimate: 1189.3
  },
  {
    id: "scenario-3",
    providerName: "EcoPulse Power",
    standingCharge: 0.27,
    dynamicVolatility: 0.47,
    annualEstimate: 1316.8,
    annualOptimizedEstimate: 1143.7
  }
];
