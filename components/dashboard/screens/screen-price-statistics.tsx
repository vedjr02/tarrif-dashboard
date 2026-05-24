"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus, Zap, Clock, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CurrentPrice, CurrentTariff, PricePeriod, DayPrices, DayTariffs, Quintile } from "@/lib/types"
import { getQuintileColor, getPriceColor, QUINTILE_CONFIG } from "@/lib/types"

interface ScreenPriceStatisticsProps {
  currentPrice: CurrentPrice | null
  currentTariff?: CurrentTariff | null
  previousPeriod?: PricePeriod
  dayPrices: DayPrices | null
  dayTariffs?: DayTariffs | null
  currentPeriodIndex: number
  dayView?: "today" | "tomorrow" | "yesterday"
  todayUnavailable?: boolean
}

export function ScreenPriceStatistics({
  currentPrice,
  currentTariff,
  previousPeriod,
  dayPrices,
  dayTariffs,
  currentPeriodIndex,
  dayView = "today",
  todayUnavailable = false,
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

  if (!currentPrice || !dayPrices) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Activity className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold text-muted-foreground">No Price Data Available</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Neither SEMO PX nor ENTSO-E returned data.</p>
        </div>
      </div>
    )
  }

  const quintileConfig = QUINTILE_CONFIG[currentPrice.quintile as Quintile]
  const priceTrend = previousPeriod
    ? currentPrice.price_eur_mwh > previousPeriod.price_eur_mwh
      ? "up"
      : currentPrice.price_eur_mwh < previousPeriod.price_eur_mwh
        ? "down"
        : "same"
    : "same"

  const nextPeriods = dayPrices.periods.slice(currentPeriodIndex + 1, currentPeriodIndex + 7)

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

  // Get displayed date based on dayView
  const getDisplayDate = () => {
    const now = new Date()
    const targetDate = new Date(now)
    if (dayView === "yesterday") {
      targetDate.setDate(targetDate.getDate() - 1)
    } else if (dayView === "tomorrow") {
      targetDate.setDate(targetDate.getDate() + 1)
    }
    return targetDate.toLocaleDateString("en-IE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Dublin",
    })
  }



  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:gap-5 sm:p-5 lg:gap-8 lg:p-8">

      {/* Banner when falling back to yesterday */}
      {todayUnavailable && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-600">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>Today&apos;s prices are not yet published — showing yesterday&apos;s profile as reference.</span>
        </div>
      )}

      {/* Top Section: Day Profile + Current Price */}
      <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2">

        {/* Today's Price Profile */}
        <Card className="bg-card/50">
          <CardContent className="flex flex-col justify-between p-3 sm:p-5">
            <div className="mb-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground sm:text-base lg:text-xl">
                  Day Ahead Price Profile
                </span>
                <span className="text-xs text-muted-foreground sm:text-sm">48 periods</span>
              </div>
              <span className="text-xs text-muted-foreground">{getDisplayDate()}</span>
            </div>

            {/* Bar chart with NOW indicator */}
            <div className="relative">
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
                      {isNow && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className="w-0.5 h-2 bg-foreground" />
                          <span className="text-[8px] font-bold text-foreground whitespace-nowrap">NOW</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Time axis */}
            <div className="mt-6 flex justify-between text-xs text-muted-foreground">
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


            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row - Centered Inline */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:gap-4">
        {[
          { icon: TrendingDown, label: "Daily Min", value: `€${Math.abs(currentPrice.daily_min).toFixed(1)}`, color: "text-primary" },
          { icon: TrendingUp, label: "Daily Max", value: `€${Math.abs(currentPrice.daily_max).toFixed(1)}`, color: "text-destructive" },
          { icon: Activity, label: "Daily Avg", value: `€${Math.abs(currentPrice.daily_avg).toFixed(1)}`, color: "text-muted-foreground" },
          { icon: Clock, label: "Next Change", value: countdown, color: "text-accent", mono: true },
        ].map(({ icon: Icon, label, value, color, mono }) => (
          <Card key={label} className="bg-card/50">
            <CardContent className="flex items-center justify-center gap-2 p-2 sm:p-3 lg:p-4">
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${color}`} />
              <span className="text-xs text-muted-foreground sm:text-sm whitespace-nowrap">{label}:</span>
              <span className={`text-sm font-bold tabular-nums text-foreground sm:text-base lg:text-lg ${mono ? "font-mono" : ""}`}>
                {value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next 6 Periods - Compact */}
      <Card className="flex-1 min-h-0">
        <CardContent className="h-full p-2 sm:p-3 lg:p-4">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
            <h3 className="text-sm font-bold text-foreground sm:text-base lg:text-lg">Next 6 Periods</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2 lg:gap-3">
            {nextPeriods.map((period, idx) => {
              const isCheapest = cheapestPeriod && period.period === cheapestPeriod.period

              return (
                <div
                  key={period.period}
                  className={`relative flex flex-col items-center justify-center rounded-lg border p-1.5 sm:rounded-xl sm:p-2 lg:p-3 ${
                    isCheapest ? "border-accent bg-accent/10 border-2" : "border-border bg-card/50"
                  }`}
                >
                  {isCheapest && (
                    <Badge className="absolute -top-2 bg-accent text-accent-foreground text-[10px] px-1.5 py-0 sm:text-xs sm:px-2">
                      BEST
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground sm:text-xs">
                    {formatTime(period.start_time_dublin)}
                  </span>
                  <span className="text-base font-bold tabular-nums text-foreground sm:text-xl lg:text-2xl">
                    {Math.abs(period.price_eur_mwh).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">€/MWh</span>
                  <div
                    className="mt-1 h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2"
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
        {todayUnavailable ? "Yesterday reference" : "Live"} &middot; {currentPrice.source} &middot; Period {currentPrice.period}/48
      </div>
    </div>
  )
}
