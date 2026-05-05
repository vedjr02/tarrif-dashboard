"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus, Zap, Clock, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CurrentPrice, CurrentTariff, PricePeriod, DayPrices, DayTariffs, Quintile } from "@/lib/types"
import { getQuintileColor, getPriceColor, QUINTILE_CONFIG } from "@/lib/types"

interface ScreenPriceStatisticsProps {
  currentPrice: CurrentPrice
  currentTariff?: CurrentTariff
  previousPeriod?: PricePeriod
  dayPrices: DayPrices
  dayTariffs?: DayTariffs
  currentPeriodIndex: number
}

const FLAT_RATE_EUR_KWH = 0.2638

export function ScreenPriceStatistics({ 
  currentPrice, 
  currentTariff, 
  previousPeriod,
  dayPrices,
  dayTariffs,
  currentPeriodIndex,
}: ScreenPriceStatisticsProps) {
  const [countdown, setCountdown] = useState("")

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const minutes = now.getMinutes()
      const seconds = now.getSeconds()
      const nextChange = minutes < 30 ? 30 - minutes : 60 - minutes
      const remainingMinutes = nextChange - 1
      const remainingSeconds = 60 - seconds
      const displayMinutes = remainingSeconds === 60 ? nextChange : remainingMinutes
      const displaySeconds = remainingSeconds === 60 ? 0 : remainingSeconds
      setCountdown(
        `${displayMinutes.toString().padStart(2, "0")}:${displaySeconds.toString().padStart(2, "0")}`
      )
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  const quintileConfig = QUINTILE_CONFIG[currentPrice.quintile as Quintile]
  const priceTrend = previousPeriod
    ? currentPrice.price_eur_mwh > previousPeriod.price_eur_mwh
      ? "up"
      : currentPrice.price_eur_mwh < previousPeriod.price_eur_mwh
        ? "down"
        : "same"
    : "same"

  const savingVsFlat = currentTariff
    ? FLAT_RATE_EUR_KWH - currentTariff.tariff_inc_vat_eur_kwh
    : 0

  const nextPeriods = dayPrices.periods.slice(currentPeriodIndex + 1, currentPeriodIndex + 7)
  const nextTariffPeriods = dayTariffs?.periods.slice(currentPeriodIndex + 1, currentPeriodIndex + 7)

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    })
  }

  const next12 = dayPrices.periods.slice(currentPeriodIndex + 1, currentPeriodIndex + 13)
  const cheapestPeriod = next12.length > 0
    ? next12.reduce((min, p) => p.price_eur_mwh < min.price_eur_mwh ? p : min, next12[0])
    : null

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:gap-5 sm:p-5 lg:gap-8 lg:p-8">

      {/* Top Section: Day Profile + Current Price */}
      <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2">

        {/* Today's Price Profile */}
        <Card className="bg-card/50">
          <CardContent className="flex flex-col justify-between p-3 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground sm:text-base lg:text-xl">
                Today&apos;s Price Profile
              </span>
              <span className="text-xs text-muted-foreground sm:text-sm">48 periods</span>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-px" style={{ height: "80px" }}>
              {dayPrices.periods.map((period, idx) => {
                const isNow = idx === currentPeriodIndex
                const range = currentPrice.daily_max - currentPrice.daily_min
                const heightPct = range > 0
                  ? ((period.price_eur_mwh - currentPrice.daily_min) / range) * 80 + 20
                  : 50
                return (
                  <div
                    key={period.period}
                    className="relative flex-1"
                    style={{ height: "80px" }}
                    title={`${formatTime(period.start_time_dublin)} — €${period.price_eur_mwh.toFixed(1)}/MWh`}
                  >
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: getPriceColor(period.price_eur_mwh, period.quintile as Quintile),
                        opacity: isNow ? 1 : 0.65,
                        outline: isNow ? "2px solid white" : "none",
                        outlineOffset: "1px",
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Time axis */}
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>

            {/* Legend */}
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
              {([1, 2, 3, 4, 5] as Quintile[]).map((q) => (
                <div key={q} className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-sm sm:h-3 sm:w-3" style={{ backgroundColor: getQuintileColor(q) }} />
                  <span className="text-xs text-muted-foreground">{QUINTILE_CONFIG[q].signal}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Price Display */}
        <Card
          className="overflow-hidden border-4"
          style={{ borderColor: getPriceColor(currentPrice.price_eur_mwh, currentPrice.quintile as Quintile) }}
        >
          <CardContent className="p-0">
            <div
              className="px-4 py-2 text-center"
              style={{ backgroundColor: getPriceColor(currentPrice.price_eur_mwh, currentPrice.quintile as Quintile) }}
            >
              <span className="text-base font-bold uppercase tracking-wider text-background sm:text-xl lg:text-2xl">
                {quintileConfig.signal}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 p-4 sm:gap-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-5xl font-bold tabular-nums text-foreground sm:text-6xl lg:text-8xl">
                      {Math.abs(currentPrice.price_eur_mwh).toFixed(1)}
                    </span>
                    <span className="text-lg text-muted-foreground sm:text-xl lg:text-2xl">€/MWh</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  {priceTrend === "up" ? (
                    <TrendingUp className="h-8 w-8 text-destructive sm:h-10 sm:w-10 lg:h-14 lg:w-14" />
                  ) : priceTrend === "down" ? (
                    <TrendingDown className="h-8 w-8 text-primary sm:h-10 sm:w-10 lg:h-14 lg:w-14" />
                  ) : (
                    <Minus className="h-8 w-8 text-muted-foreground sm:h-10 sm:w-10 lg:h-14 lg:w-14" />
                  )}
                  <span className="text-xs text-muted-foreground sm:text-sm lg:text-lg">
                    {priceTrend === "up" ? "Rising" : priceTrend === "down" ? "Falling" : "Stable"}
                  </span>
                </div>
              </div>

              {currentTariff && (
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl bg-muted/50 px-4 py-3 sm:gap-5 sm:px-6">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-accent sm:h-6 sm:w-6" />
                    <span className="text-2xl font-bold text-foreground sm:text-3xl">
                      {currentTariff.tariff_inc_vat_eur_kwh.toFixed(4)}
                    </span>
                    <span className="text-sm text-muted-foreground">€/kWh</span>
                  </div>
                  <div className="hidden h-8 w-px bg-border sm:block" />
                  <span className={`text-sm font-semibold sm:text-base lg:text-lg ${savingVsFlat > 0 ? "text-primary" : "text-destructive"}`}>
                    {savingVsFlat > 0 ? `Save ${savingVsFlat.toFixed(4)} €/kWh` : `+${Math.abs(savingVsFlat).toFixed(4)} €/kWh`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
        {[
          { icon: TrendingDown, label: "Daily Min", value: `€${Math.abs(currentPrice.daily_min).toFixed(1)}`, color: "text-primary" },
          { icon: TrendingUp, label: "Daily Max", value: `€${Math.abs(currentPrice.daily_max).toFixed(1)}`, color: "text-destructive" },
          { icon: Activity, label: "Daily Avg", value: `€${Math.abs(currentPrice.daily_avg).toFixed(1)}`, color: "text-muted-foreground" },
          { icon: Clock, label: "Next Change", value: countdown, color: "text-accent", mono: true },
        ].map(({ icon: Icon, label, value, color, mono }) => (
          <Card key={label} className="bg-card/50">
            <CardContent className="flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6">
              <Icon className={`h-4 w-4 sm:h-6 sm:w-6 lg:h-8 lg:w-8 mb-1 ${color}`} />
              <span className="text-xs text-muted-foreground sm:text-sm lg:text-base">{label}</span>
              <span className={`text-sm font-bold tabular-nums text-foreground sm:text-xl lg:text-3xl ${mono ? "font-mono" : ""}`}>
                {value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next 6 Periods */}
      <Card className="flex-1 min-h-0">
        <CardContent className="h-full p-3 sm:p-5 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary sm:h-6 sm:w-6" />
            <h3 className="text-base font-bold text-foreground sm:text-xl lg:text-2xl">Next 6 Periods</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3 lg:gap-4">
            {nextPeriods.map((period, idx) => {
              const isCheapest = cheapestPeriod && period.period === cheapestPeriod.period
              const tariffPeriod = nextTariffPeriods?.[idx]

              return (
                <div
                  key={period.period}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-2 sm:rounded-2xl sm:p-3 lg:p-5 ${
                    isCheapest ? "border-accent bg-accent/10" : "border-border bg-card/50"
                  }`}
                >
                  {isCheapest && (
                    <Badge className="absolute -top-2.5 bg-accent text-accent-foreground text-xs px-2 py-0.5 sm:text-sm sm:px-3">
                      BEST
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground sm:text-sm lg:text-lg">
                    {formatTime(period.start_time_dublin)}
                  </span>
                  <span className="text-xl font-bold tabular-nums text-foreground sm:text-3xl lg:text-5xl">
                    {Math.abs(period.price_eur_mwh).toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground">€/MWh</span>
                  {tariffPeriod && (
                    <div className="mt-1 text-center">
                      <span className="text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                        {tariffPeriod.tariff_inc_vat_eur_kwh.toFixed(3)}
                      </span>
                      <span className="block text-xs text-muted-foreground">€/kWh</span>
                    </div>
                  )}
                  <div
                    className="mt-1.5 h-2 w-2 rounded-full sm:h-3 sm:w-3"
                    style={{ backgroundColor: getPriceColor(period.price_eur_mwh, period.quintile as Quintile) }}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attribution */}
      <div className="text-center text-xs text-muted-foreground sm:text-sm">
        Data Source: Semo PX &middot; Period {currentPrice.period}/48 &middot; {currentPrice.source}
      </div>
    </div>
  )
}
