"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  Battery, 
  Home, 
  Sun, 
  TrendingDown, 
  Clock,
  Droplets,
  Flame,
  Car,
  PiggyBank,
  ArrowRight,
  CheckCircle2,
  XCircle,
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

// Appliance data with consumption
const APPLIANCES = [
  { id: "ev", icon: Car, label: "EV Charging", subLabel: "60 kWh full charge", consumption: 60, color: "text-blue-500" },
  { id: "heatpump", icon: Flame, label: "Heat Pump", subLabel: "2 kWh per hour", consumption: 2, color: "text-orange-500" },
  { id: "washing", icon: Droplets, label: "Washing Machine", subLabel: "1.5 kWh per cycle", consumption: 1.5, color: "text-cyan-500" },
  { id: "dryer", icon: Sun, label: "Tumble Dryer", subLabel: "2.5 kWh per cycle", consumption: 2.5, color: "text-yellow-500" },
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
    .slice(0, 3)

  // Calculate daily savings potential
  const savingVsFlat = currentTariff 
    ? FLAT_RATE_EUR_KWH - currentTariff.tariff_inc_vat_eur_kwh
    : 0

  // Find cheapest tariff in upcoming periods
  const upcomingTariffs = dayTariffs?.periods.slice(currentPeriodIndex, Math.min(currentPeriodIndex + 12, 48))
  const cheapestTariff = upcomingTariffs?.reduce((min, p) => 
    p.tariff_inc_vat_eur_kwh < min.tariff_inc_vat_eur_kwh ? p : min
  )

  // Action recommendations
  const actions = [
    {
      icon: <Car className="h-12 w-12" />,
      title: "EV Charging",
      status: currentPrice.quintile <= 2 ? "GO" : "WAIT",
      description: currentPrice.quintile <= 2
        ? "Charge now! Current price is optimal."
        : `Best window: ${bestChargingStart}–${bestChargingEnd}`,
      saving: currentPrice.quintile <= 2 ? savingVsFlat * 60 : null,
      color: currentPrice.quintile <= 2 ? "text-q1-cheap" : "text-accent",
    },
    {
      icon: <Battery className="h-12 w-12" />,
      title: "Battery Storage",
      status: currentPrice.quintile <= 2 ? "CHARGE" : currentPrice.quintile >= 4 ? "DISCHARGE" : "HOLD",
      description: currentPrice.quintile <= 2
        ? "Charge battery — prices are low."
        : currentPrice.quintile >= 4
        ? "Discharge now — maximize export value."
        : "Hold — wait for better opportunity.",
      saving: null,
      color: currentPrice.quintile <= 2 ? "text-q1-cheap" : currentPrice.quintile >= 4 ? "text-accent" : "text-muted-foreground",
    },
    {
      icon: <Home className="h-12 w-12" />,
      title: "Home Appliances",
      status: currentPrice.quintile <= 2 ? "RUN NOW" : "SCHEDULE",
      description: currentPrice.quintile <= 2
        ? "Run high-consumption appliances now!"
        : `Schedule for ${bestChargingStart}–${bestChargingEnd}`,
      saving: currentPrice.quintile <= 2 ? savingVsFlat * 3 : null,
      color: currentPrice.quintile <= 2 ? "text-q1-cheap" : "text-accent",
    },
    {
      icon: <Sun className="h-12 w-12" />,
      title: "Solar Export",
      status: currentPrice.quintile >= 4 ? "EXPORT" : "STORE",
      description: expensivePeriods.length > 0
        ? `High prices at ${formatPeriodTime(currentPeriodIndex + expensivePeriods[0].idx)} — good export opportunity.`
        : "No high-price windows remaining today.",
      saving: null,
      color: currentPrice.quintile >= 4 ? "text-accent" : "text-muted-foreground",
    },
  ]

  // Calculate appliance costs
  const getApplianceCosts = (consumption: number) => {
    const costNow = consumption * (currentTariff?.tariff_inc_vat_eur_kwh || currentPrice.price_eur_mwh / 1000)
    const costFixed = consumption * FLAT_RATE_EUR_KWH
    const costBest = consumption * (cheapestTariff?.tariff_inc_vat_eur_kwh || currentPrice.price_eur_mwh / 1000)
    return { costNow, costFixed, costBest, savingVsFixed: costFixed - costNow, savingVsBest: costNow - costBest }
  }

  // Calculate total daily savings
  const totalDailyUsage = 25 // kWh average household
  const dailySavingVsFixed = savingVsFlat * totalDailyUsage
  const monthlySavingVsFixed = dailySavingVsFixed * 30

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      {/* Header with Current Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div 
            className="flex h-24 w-24 items-center justify-center rounded-2xl"
            style={{ backgroundColor: getQuintileColor(currentPrice.quintile as Quintile) }}
          >
            <Zap className="h-14 w-14 text-background" />
          </div>
          <div>
            <h2 className="text-4xl font-bold text-foreground">Dynamic Pricing Operations</h2>
            <p className="text-2xl text-muted-foreground mt-1">Real-time recommendations for maximum savings</p>
          </div>
        </div>
        
        <Card className="border-2" style={{ borderColor: getQuintileColor(currentPrice.quintile as Quintile) }}>
          <CardContent className="flex items-center gap-6 p-6">
            <div className="text-center">
              <span className="text-lg text-muted-foreground">Current Signal</span>
              <div 
                className="text-3xl font-bold mt-1"
                style={{ color: getQuintileColor(currentPrice.quintile as Quintile) }}
              >
                {quintileConfig.signal}
              </div>
            </div>
            <div className="h-16 w-px bg-border" />
            <div className="text-center">
              <span className="text-lg text-muted-foreground">Price</span>
              <div className="text-3xl font-bold text-foreground mt-1">
                €{currentPrice.price_eur_mwh.toFixed(2)}/MWh
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Actions and Savings */}
      <div className="grid flex-1 grid-cols-3 gap-6">
        {/* Left Column: Action Recommendations */}
        <div className="col-span-2 grid grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <Card 
              key={index}
              className="border-2 transition-all hover:scale-[1.02]"
              style={{ 
                borderLeftWidth: "6px",
                borderLeftColor: action.status === "GO" || action.status === "CHARGE" || action.status === "RUN NOW" || action.status === "EXPORT"
                  ? getQuintileColor(currentPrice.quintile as Quintile)
                  : "var(--border)",
              }}
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between">
                  <div className={action.color}>
                    {action.icon}
                  </div>
                  <Badge 
                    className="text-lg px-4 py-1"
                    variant={action.status === "GO" || action.status === "CHARGE" || action.status === "RUN NOW" || action.status === "EXPORT" ? "default" : "secondary"}
                    style={{
                      backgroundColor: action.status === "GO" || action.status === "CHARGE" || action.status === "RUN NOW" || action.status === "EXPORT"
                        ? getQuintileColor(currentPrice.quintile as Quintile)
                        : undefined,
                    }}
                  >
                    {action.status}
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-foreground mt-4">{action.title}</h3>
                <p className="text-lg text-muted-foreground mt-2 flex-1">{action.description}</p>
                {action.saving !== null && action.saving > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-q1-cheap">
                    <PiggyBank className="h-6 w-6" />
                    <span className="text-xl font-bold">Save €{action.saving.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right Column: Savings Summary */}
        <div className="flex flex-col gap-4">
          {/* Savings Overview Card */}
          <Card className="border-q1-cheap bg-q1-cheap/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <PiggyBank className="h-8 w-8 text-q1-cheap" />
                Savings Potential
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg text-muted-foreground">Current vs Fixed:</span>
                <span className={`text-2xl font-bold ${savingVsFlat > 0 ? "text-q1-cheap" : "text-destructive"}`}>
                  {savingVsFlat > 0 ? "+" : ""}{(savingVsFlat * 100).toFixed(2)} c/kWh
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg text-muted-foreground">Daily (25 kWh):</span>
                <span className={`text-2xl font-bold ${dailySavingVsFixed > 0 ? "text-q1-cheap" : "text-destructive"}`}>
                  €{dailySavingVsFixed.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="text-xl font-semibold text-foreground">Monthly Est:</span>
                <span className={`text-3xl font-bold ${monthlySavingVsFixed > 0 ? "text-q1-cheap" : "text-destructive"}`}>
                  €{monthlySavingVsFixed.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Appliance Cost Calculator */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Appliance Costs Now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {APPLIANCES.map((appliance) => {
                const costs = getApplianceCosts(appliance.consumption)
                const Icon = appliance.icon
                const isGoodTime = currentPrice.quintile <= 2
                
                return (
                  <div key={appliance.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-8 w-8 ${appliance.color}`} />
                      <div>
                        <span className="font-semibold text-foreground">{appliance.label}</span>
                        <span className="text-sm text-muted-foreground block">{appliance.subLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xl font-bold text-foreground">€{costs.costNow.toFixed(2)}</span>
                        {costs.savingVsFixed > 0 && (
                          <span className="text-sm text-q1-cheap block">
                            Save €{costs.savingVsFixed.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {isGoodTime ? (
                        <CheckCircle2 className="h-8 w-8 text-q1-cheap" />
                      ) : (
                        <Clock className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer: Best Time Windows */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <span className="text-lg text-muted-foreground">Best Charging Window</span>
                <span className="text-2xl font-bold text-foreground block">
                  {bestChargingStart} – {bestChargingEnd}
                </span>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div>
              <span className="text-lg text-muted-foreground">Average Price</span>
              <span className="text-2xl font-bold text-primary block">
                €{cheapestWindow.avgPrice.toFixed(2)}/MWh
              </span>
            </div>
          </div>
          <div className="text-lg text-muted-foreground">
            Data Source: Semo PX | Updated in real-time
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
