"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, Zap, Droplets, Flame, BarChart3 } from "lucide-react"
import type { CurrentTariff, DayTariffs, Quintile } from "@/lib/types"
import { getQuintileColor } from "@/lib/types"

interface DynamicPricingCardProps {
  currentTariff: CurrentTariff
  dayTariffs: DayTariffs
}

const FLAT_RATE_EUR_KWH = 0.2638

// Appliance consumption specs
const APPLIANCES = [
  { id: "ev", icon: "car", label: "EV full charge (60 kWh)", consumption: 60 },
  { id: "washing", icon: "washing", label: "Washing machine (1.5 kWh)", consumption: 1.5 },
  { id: "heatpump", icon: "flame", label: "Heat pump 1h (2 kWh)", consumption: 2 },
]

export function DynamicPricingCard({ currentTariff, dayTariffs }: DynamicPricingCardProps) {
  // Find cheapest upcoming tariff
  const upcomingTariffs = dayTariffs.periods.slice(
    currentTariff.period,
    Math.min(currentTariff.period + 12, 48)
  )
  const cheapestTariff = upcomingTariffs.reduce((min, p) => 
    p.tariff_inc_vat_eur_kwh < min.tariff_inc_vat_eur_kwh ? p : min
  )

  const savingVsFlat = FLAT_RATE_EUR_KWH - currentTariff.tariff_inc_vat_eur_kwh
  const totalUsageKwh = 10
  const totalSaving = savingVsFlat * totalUsageKwh
  const avgSaving = FLAT_RATE_EUR_KWH - currentTariff.daily_avg_tariff_eur_kwh

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    })
  }

  const getApplianceIcon = (iconType: string) => {
    switch (iconType) {
      case "car":
        return <Zap className="h-5 w-5" />
      case "washing":
        return <Droplets className="h-5 w-5" />
      case "flame":
        return <Flame className="h-5 w-5" />
      default:
        return <Zap className="h-5 w-5" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dynamic Tariff — Today&apos;s Savings Potential</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Column A: Cost Comparison */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Your cost right now</h3>
            <div className="space-y-2">
              <div>
                <div className="text-3xl font-bold tabular-nums text-primary">
                  {currentTariff.tariff_inc_vat_eur_kwh.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground">€/kWh · incl. 9% VAT · Standard tariff</p>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm line-through text-muted-foreground">Fixed plan</span>
                <span className="text-sm line-through font-mono text-muted-foreground">
                  {FLAT_RATE_EUR_KWH.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-q1-cheap" />
                  You save
                </span>
                <span className="text-sm font-bold tabular-nums text-q1-cheap">
                  {savingVsFlat.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Column B: Appliance Cost Estimator */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">What does it cost now vs tonight?</h3>
            <div className="space-y-3">
              {APPLIANCES.map((appliance) => {
                const costNow = appliance.consumption * currentTariff.tariff_inc_vat_eur_kwh
                const costBest = appliance.consumption * cheapestTariff.tariff_inc_vat_eur_kwh
                const saving = costNow - costBest
                const isCurrentCheaper = currentTariff.tariff_inc_vat_eur_kwh <= cheapestTariff.tariff_inc_vat_eur_kwh

                return (
                  <div key={appliance.id} className="text-xs space-y-1 bg-muted/30 rounded-lg p-2">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      {getApplianceIcon(appliance.icon)}
                      <span>{appliance.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Now: €{costNow.toFixed(2)}</span>
                      <span>Best {formatTime(cheapestTariff.start_time_dublin)}: €{costBest.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {isCurrentCheaper ? (
                        <Badge variant="outline" className="bg-q1-cheap/10 text-q1-cheap border-q1-cheap/50">
                          USE NOW
                        </Badge>
                      ) : (
                        <span className="text-q1-cheap font-semibold">
                          Save €{saving.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Column C: Daily Savings Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Today&apos;s savings vs fixed plan</h3>
            
            {/* Mini bar chart */}
            <div className="bg-muted/30 rounded-lg p-3 h-24 flex flex-col justify-end gap-px">
              <div className="flex gap-px items-flex-end justify-center h-16">
                {dayTariffs.periods.map((period) => {
                  const tariff = period.tariff_inc_vat_eur_kwh
                  const isSaving = tariff < FLAT_RATE_EUR_KWH
                  const height = ((Math.abs(tariff - FLAT_RATE_EUR_KWH) / FLAT_RATE_EUR_KWH) * 100)
                  
                  return (
                    <div
                      key={period.period}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        height: `${Math.max(2, height)}px`,
                        backgroundColor: isSaving ? "var(--q1-cheap)" : "var(--q5-expensive)",
                        opacity: 0.7,
                      }}
                      title={`Period ${period.period}: €${tariff.toFixed(4)}/kWh`}
                    />
                  )
                })}
              </div>
              <div className="border-t border-dashed border-muted-foreground/30 my-1" />
              <div className="text-xs text-muted-foreground text-center">
                Fixed rate: {FLAT_RATE_EUR_KWH.toFixed(4)} €/kWh
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg saving today:</span>
                <span className="font-semibold text-q1-cheap">{avgSaving.toFixed(4)} €/kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total if {totalUsageKwh} kWh used:</span>
                <span className="font-bold text-q1-cheap">€{totalSaving.toFixed(2)} saved</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
