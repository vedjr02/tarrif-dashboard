"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Sparkles } from "lucide-react"
import type { PricePeriod, TariffPeriod, Quintile } from "@/lib/types"
import { getQuintileColor } from "@/lib/types"

interface NextPeriodsStripProps {
  periods: PricePeriod[]
  tariffPeriods?: TariffPeriod[]
  currentPeriodIndex: number
}

export function NextPeriodsStrip({ periods, tariffPeriods, currentPeriodIndex }: NextPeriodsStripProps) {
  // Get next 6 periods
  const nextPeriods = periods.slice(currentPeriodIndex + 1, currentPeriodIndex + 7)
  const nextTariffPeriods = tariffPeriods?.slice(currentPeriodIndex + 1, currentPeriodIndex + 7)
  
  // Find the cheapest period in the next 12
  const next12 = periods.slice(currentPeriodIndex + 1, currentPeriodIndex + 13)
  const cheapestIndex = next12.reduce(
    (minIdx, period, idx, arr) => 
      period.price_eur_mwh < arr[minIdx].price_eur_mwh ? idx : minIdx,
    0
  )
  const cheapestPeriod = next12[cheapestIndex]

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    })
  }

  if (nextPeriods.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Next 6 Periods
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {nextPeriods.map((period, idx) => {
            const isCheapest = cheapestPeriod && period.period === cheapestPeriod.period
            const tariffPeriod = nextTariffPeriods?.[idx]
            
            return (
              <div
                key={period.period}
                className={`relative flex min-w-[110px] flex-col items-center rounded-lg border p-3 transition-colors ${
                  isCheapest ? "border-accent bg-accent/10" : "border-border bg-card"
                }`}
              >
                {isCheapest && (
                  <Badge 
                    className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[10px] px-1.5 py-0"
                  >
                    <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                    BEST
                  </Badge>
                )}
                
                <span className="text-xs text-muted-foreground">
                  {formatTime(period.start_time_dublin)}
                </span>
                
                <span className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {period.price_eur_mwh.toFixed(0)}
                </span>
                
                <span className="text-[10px] text-muted-foreground">€/MWh</span>

                {/* Wholesale price in €/kWh */}
                <span className="mt-2 text-xs font-medium tabular-nums text-foreground">
                  {(period.price_eur_mwh / 1000).toFixed(4)}
                </span>
                <span className="text-[10px] text-muted-foreground opacity-70">€/kWh</span>
                
                <div
                  className="mt-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: getQuintileColor(period.quintile as Quintile) }}
                  title={`Q${period.quintile}`}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
