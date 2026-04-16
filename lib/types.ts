export interface PricePeriod {
  period: number
  start_time_utc: string
  start_time_dublin: string
  price_eur_mwh: number
  quintile: 1 | 2 | 3 | 4 | 5
  source: "SEMOPX" | "ENTSO-E" | "Interpolated"
}

export interface DayPrices {
  trading_day: string
  day_type: "weekday" | "weekend"
  holiday: boolean
  published_at: string
  periods: PricePeriod[]
}

export interface CurrentPrice extends PricePeriod {
  daily_avg: number
  daily_min: number
  daily_max: number
}

export interface HistoryDay {
  date: string
  avg: number
  min: number
  max: number
  day_type: "weekday" | "weekend"
  holiday: boolean
}

export interface BackendStatus {
  last_scrape: string
  backend: "ok" | "error"
  missing_days: number
  semopx_periods: number
  entsoe_periods: number
  interpolated_periods: number
}

export type Quintile = 1 | 2 | 3 | 4 | 5

export const QUINTILE_CONFIG: Record<Quintile, { label: string; signal: string; colorClass: string; bgClass: string }> = {
  1: { label: "Q1", signal: "CHEAP — USE NOW", colorClass: "text-q1-cheap", bgClass: "bg-q1-cheap" },
  2: { label: "Q2", signal: "BELOW AVERAGE", colorClass: "text-q2-below", bgClass: "bg-q2-below" },
  3: { label: "Q3", signal: "AVERAGE", colorClass: "text-q3-average", bgClass: "bg-q3-average" },
  4: { label: "Q4", signal: "ABOVE AVERAGE", colorClass: "text-q4-above", bgClass: "bg-q4-above" },
  5: { label: "Q5", signal: "EXPENSIVE — AVOID", colorClass: "text-q5-expensive", bgClass: "bg-q5-expensive" },
}

export function getQuintileColor(quintile: Quintile): string {
  const colors: Record<Quintile, string> = {
    1: "var(--q1-cheap)",
    2: "var(--q2-below)",
    3: "var(--q3-average)",
    4: "var(--q4-above)",
    5: "var(--q5-expensive)",
  }
  return colors[quintile]
}

export function getSignalText(quintile: Quintile): string {
  const signals: Record<Quintile, string> = {
    1: "CHEAP",
    2: "BELOW AVG",
    3: "AVERAGE",
    4: "ABOVE AVG",
    5: "EXPENSIVE",
  }
  return signals[quintile]
}
