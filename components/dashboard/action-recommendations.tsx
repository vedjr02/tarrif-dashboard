"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Battery, Home, Sun } from "lucide-react"
import type { PricePeriod, Quintile, DayPrices } from "@/lib/types"
import { getQuintileColor } from "@/lib/types"
import { findCheapestWindow } from "@/lib/mock-data"

interface ActionRecommendationsProps {
  currentQuintile: Quintile
  dayPrices: DayPrices
  currentPeriodIndex: number
}

interface ActionCard {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
}

export function ActionRecommendations({
  currentQuintile,
  dayPrices,
  currentPeriodIndex,
}: ActionRecommendationsProps) {
  const formatPeriodTime = (periodIndex: number) => {
    const period = dayPrices.periods[periodIndex]
    if (!period) return ""
    const date = new Date(period.start_time_dublin)
    return date.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    })
  }

  // Find best windows for different use cases
  const remainingPeriods = dayPrices.periods.slice(currentPeriodIndex)
  const cheapestWindow = findCheapestWindow(remainingPeriods, 4)
  const bestChargingStart = formatPeriodTime(currentPeriodIndex + cheapestWindow.start)
  const bestChargingEnd = formatPeriodTime(currentPeriodIndex + cheapestWindow.start + 4)

  // Find expensive periods for export
  const expensivePeriods = remainingPeriods
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => p.quintile >= 4)
    .slice(0, 2)
  
  const exportWindowStart = expensivePeriods[0] 
    ? formatPeriodTime(currentPeriodIndex + expensivePeriods[0].idx)
    : null
  const exportWindowEnd = expensivePeriods[1]
    ? formatPeriodTime(currentPeriodIndex + expensivePeriods[1].idx + 1)
    : exportWindowStart

  const actions: ActionCard[] = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "EV Charging",
      description: currentQuintile <= 2
        ? `Charge now! Current price is ${currentQuintile === 1 ? "very cheap" : "below average"}.`
        : `Best window today: ${bestChargingStart}–${bestChargingEnd} (avg €${cheapestWindow.avgPrice}/MWh)`,
      enabled: true,
    },
    {
      icon: <Battery className="h-5 w-5" />,
      title: "Battery/Storage",
      description: currentQuintile <= 2
        ? "Charge battery now — prices are low."
        : currentQuintile >= 4
        ? "Discharge now — high prices. Good export window."
        : "Hold — wait for lower prices to charge.",
      enabled: true,
    },
    {
      icon: <Home className="h-5 w-5" />,
      title: "Home Appliances",
      description: currentQuintile <= 2
        ? "Run washing machine, dishwasher, dryer now!"
        : `Schedule appliances for ${bestChargingStart}–${bestChargingEnd} — cheapest window.`,
      enabled: currentQuintile <= 3,
    },
    {
      icon: <Sun className="h-5 w-5" />,
      title: "Solar Export",
      description: exportWindowStart
        ? `High prices ${exportWindowStart}–${exportWindowEnd} — good export opportunity.`
        : "No high-price windows remaining today.",
      enabled: currentQuintile >= 4 || expensivePeriods.length > 0,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-accent" />
          Smart Action Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-lg border p-4 transition-opacity ${
                action.enabled ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
              }`}
              style={{
                borderLeftWidth: "3px",
                borderLeftColor: action.enabled
                  ? getQuintileColor(currentQuintile)
                  : "var(--muted)",
              }}
            >
              <div className="flex items-center gap-2 text-foreground">
                <span
                  style={{
                    color: action.enabled
                      ? getQuintileColor(currentQuintile)
                      : "var(--muted-foreground)",
                  }}
                >
                  {action.icon}
                </span>
                <span className="font-medium">{action.title}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
