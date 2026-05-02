export interface Tariff {
  id: string;
  providerName: string;
  ratePerKwh: number;
  peakStartTime: string;
  peakEndTime: string;
  currency: "EUR" | "USD" | "GBP";
}

export interface TouPeriod {
  tariffId: string;
  dayOfWeek: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  startTime: string;
  endTime: string;
  multiplier: number;
}

export interface Consumption {
  deviceId: string;
  timestamp: string;
  kwhUsage: number;
  userId: string;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  recommendedStart: string;
  recommendedEnd: string;
  priority: "High" | "Medium" | "Low";
}

export interface AlertItem {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  detail: string;
  timestamp: string;
}

export interface ForecastPoint {
  timestamp: string;
  projectedCost: number;
  optimizedCost: number;
}

export interface TariffScenario {
  id: string;
  providerName: string;
  standingCharge: number;
  dynamicVolatility: number;
  annualEstimate: number;
  annualOptimizedEstimate: number;
}
