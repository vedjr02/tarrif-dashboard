"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Zap,
  Battery,
  Home,
  Sun,
  Clock,
  Droplets,
  Flame,
  Car,
  PiggyBank,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import type { DayPrices, DayTariffs, CurrentPrice, CurrentTariff, Quintile } from "@/lib/types"
import { getQuintileColor, QUINTILE_CONFIG } from "@/lib/types"
import { findCheapestWindow } from "@/lib/mock-data"

interface ScreenOperationsSavingsProps {
  currentPrice: CurrentPrice
  currentTariff?: CurrentTariff
  dayPrices: DayPrices
  dayTariffs?: DayTariffs
  currentPeriodIndex: number
}

const FLAT_RATE_EUR_KWH = 0.2638

const APPLIANCES = [
  { id: "ev", icon: Car, label: "EV Charging", subLabel: "60 kWh", consumption: 60, color: "text-blue-500" },
  { id: "heatpump", icon: Flame, label: "Heat Pump", subLabel: "2 kWh/h", consumption: 2, color: "text-orange-500" },
  { id: "washing", icon: Droplets, label: "Washer", subLabel: "1.5 kWh", consumption: 1.5, color: "text-cyan-500" },
  { id: "dryer", icon: Sun, label: "Dryer", subLabel: "2.5 kWh", consumption: 2.5, color: "text-yellow-500" },
]

export function ScreenOperationsSavings({
  currentPrice,
  currentTariff,
  dayPrices,
  dayTariffs,
  currentPeriodIndex,
}: ScreenOperationsSavingsProps) {
  const quintileConfig = QUINTILE_CONFIG[currentPrice.quintile as Quintile]

  const formatPeriodTime = (periodIndex: number) => {
    const period = dayPrices.periods[periodIndex]
    if (!period) return ""
    return new Date(period.start_time_dublin).toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    })
  }

  const remainingPeriods = dayPrices.periods.slice(currentPeriodIndex)
  const cheapestWindow = findCheapestWindow(remainingPeriods, 4)
  const bestStart = formatPeriodTime(currentPeriodIndex + cheapestWindow.start)
  const bestEnd = formatPeriodTime(currentPeriodIndex + cheapestWindow.start + 4)

  const expensivePeriods = remainingPeriods
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => p.quintile >= 4)
    .slice(0, 3)

  const savingVsFlat = currentTariff
    ? FLAT_RATE_EUR_KWH - currentTariff.tariff_inc_vat_eur_kwh
    : 0

  const upcomingTariffs = dayTariffs?.periods.slice(currentPeriodIndex, Math.min(currentPeriodIndex + 12, 48))
  const cheapestTariff = upcomingTariffs?.reduce((min, p) =>
    p.tariff_inc_vat_eur_kwh < min.tariff_inc_vat_eur_kwh ? p : min
  )

  const isGoodPrice = currentPrice.quintile <= 2
  const isHighPrice = currentPrice.quintile >= 4

  const actions = [
    {
      icon: Car,
      title: "EV Charging",
      status: isGoodPrice ? "GO" : "WAIT",
      description: isGoodPrice ? "Charge now — optimal price" : `Best window: ${bestStart}–${bestEnd}`,
      saving: isGoodPrice ? savingVsFlat * 60 : null,
      good: isGoodPrice,
    },
    {
      icon: Battery,
      title: "Battery",
      status: isGoodPrice ? "CHARGE" : isHighPrice ? "DISCHARGE" : "HOLD",
      description: isGoodPrice ? "Charge — prices are low" : isHighPrice ? "Discharge — export value" : "Hold for better opportunity",
      saving: null,
      good: isGoodPrice || isHighPrice,
    },
    {
      icon: Home,
      title: "Appliances",
      status: isGoodPrice ? "RUN NOW" : "SCHEDULE",
      description: isGoodPrice ? "Run high-consumption loads!" : `Schedule for ${bestStart}–${bestEnd}`,
      saving: isGoodPrice ? savingVsFlat * 3 : null,
      good: isGoodPrice,
    },
    {
      icon: Sun,
      title: "Solar Export",
      status: isHighPrice ? "EXPORT" : "STORE",
      description: expensivePeriods.length > 0
        ? `High prices at ${formatPeriodTime(currentPeriodIndex + expensivePeriods[0].idx)}`
        : "No high-price windows today",
      saving: null,
      good: isHighPrice,
    },
  ]

  const getApplianceCosts = (consumption: number) => {
    const costNow = consumption * (currentTariff?.tariff_inc_vat_eur_kwh ?? currentPrice.price_eur_mwh / 1000)
    const costFixed = consumption * FLAT_RATE_EUR_KWH
    return { costNow, savingVsFixed: costFixed - costNow }
  }

  const dailySavingVsFixed = savingVsFlat * 25
  const monthlySavingVsFixed = dailySavingVsFixed * 30

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:gap-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 lg:h-16 lg:w-16"
            style={{ backgroundColor: getQuintileColor(currentPrice.quintile as Quintile) }}
          >
            <Zap className="h-5 w-5 text-background sm:h-8 sm:w-8 lg:h-9 lg:w-9" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground sm:text-xl lg:text-2xl">Dynamic Pricing Operations</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">Real-time recommendations for maximum savings</p>
          </div>
        </div>

        <Card className="shrink-0 border-2" style={{ borderColor: getQuintileColor(currentPrice.quintile as Quintile) }}>
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="text-center">
              <span className="block text-xs text-muted-foreground">Signal</span>
              <div className="text-lg font-bold sm:text-2xl" style={{ color: getQuintileColor(currentPrice.quintile as Quintile) }}>
                {quintileConfig.signal}
              </div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <span className="block text-xs text-muted-foreground">Price</span>
              <div className="text-base font-bold text-foreground sm:text-xl">
                €{currentPrice.price_eur_mwh.toFixed(1)}<span className="text-xs font-normal text-muted-foreground">/MWh</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid flex-1 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">

        {/* Action Cards: 2x2 on sm+, stacked on mobile */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:col-span-2 lg:gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <Card
                key={index}
                className="border-2 transition-all"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: action.good
                    ? getQuintileColor(currentPrice.quintile as Quintile)
                    : "var(--border)",
                }}
              >
                <CardContent className="flex h-full flex-col p-3 sm:p-4 lg:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Icon className={`h-6 w-6 shrink-0 sm:h-8 sm:w-8 ${action.good ? "text-primary" : "text-muted-foreground"}`} />
                    <Badge
                      className="shrink-0 text-xs px-2 py-0.5"
                      variant={action.good ? "default" : "secondary"}
                      style={action.good ? { backgroundColor: getQuintileColor(currentPrice.quintile as Quintile) } : undefined}
                    >
                      {action.status}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-foreground sm:text-base lg:text-lg">{action.title}</h3>
                  <p className="mt-1 flex-1 text-xs text-muted-foreground sm:text-sm">{action.description}</p>
                  {action.saving !== null && action.saving > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-primary">
                      <PiggyBank className="h-4 w-4" />
                      <span className="text-xs font-bold sm:text-sm">Save €{action.saving.toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Right Column: Savings + Appliances */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Savings Card */}
          <Card className="border-primary bg-primary/5">
            <CardHeader className="pb-1 pt-3 px-3 sm:px-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <PiggyBank className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                Savings Potential
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0 sm:p-4 sm:pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">vs Fixed rate:</span>
                <span className={`text-sm font-bold sm:text-base ${savingVsFlat > 0 ? "text-primary" : "text-destructive"}`}>
                  {savingVsFlat > 0 ? "+" : ""}{(savingVsFlat * 100).toFixed(2)}c/kWh
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Daily (25 kWh):</span>
                <span className={`text-sm font-bold sm:text-base ${dailySavingVsFixed > 0 ? "text-primary" : "text-destructive"}`}>
                  €{dailySavingVsFixed.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-xs font-semibold text-foreground sm:text-sm">Monthly Est:</span>
                <span className={`text-base font-bold sm:text-xl ${monthlySavingVsFixed > 0 ? "text-primary" : "text-destructive"}`}>
                  €{monthlySavingVsFixed.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Appliance Costs */}
          <Card className="flex-1">
            <CardHeader className="pb-1 pt-3 px-3 sm:px-4">
              <CardTitle className="text-sm sm:text-base">Appliance Costs Now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0 sm:p-4 sm:pt-0">
              {APPLIANCES.map((appliance) => {
                const costs = getApplianceCosts(appliance.consumption)
                const Icon = appliance.icon
                return (
                  <div key={appliance.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-2 py-2 sm:px-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 shrink-0 ${appliance.color}`} />
                      <div>
                        <span className="block text-xs font-semibold text-foreground sm:text-sm">{appliance.label}</span>
                        <span className="text-xs text-muted-foreground">{appliance.subLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="block text-sm font-bold text-foreground sm:text-base">€{costs.costNow.toFixed(2)}</span>
                        {costs.savingVsFixed > 0 && (
                          <span className="block text-xs text-primary">-€{costs.savingVsFixed.toFixed(2)}</span>
                        )}
                      </div>
                      {isGoodPrice ? (
                        <CheckCircle2 className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Best Window Footer */}
      <Card className="bg-muted/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Clock className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            <div>
              <span className="block text-xs text-muted-foreground">Best Charging Window</span>
              <span className="text-sm font-bold text-foreground sm:text-base">
                {bestStart} – {bestEnd}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="block text-xs text-muted-foreground">Avg Price</span>
              <span className="text-sm font-bold text-primary sm:text-base">
                €{cheapestWindow.avgPrice.toFixed(2)}/MWh
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Semo PX &middot; Updated in real-time</span>
        </CardContent>
      </Card>
    </div>
  )
}
