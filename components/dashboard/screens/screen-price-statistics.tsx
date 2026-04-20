"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus, Zap, Clock, Activity, BarChart3 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CurrentPrice, CurrentTariff, PricePeriod, DayPrices, DayTariffs, Quintile } from "@/lib/types"
import { getQuintileColor, QUINTILE_CONFIG } from "@/lib/types"

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
  const [dublinDate, setDublinDate] = useState("")

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

    const updateDate = () => {
      const now = new Date()
      const dateFormatter = new Intl.DateTimeFormat("en-IE", {
        timeZone: "Europe/Dublin",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      setDublinDate(dateFormatter.format(now))
    }

    updateCountdown()
    updateDate()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  const quintileConfig = QUINTILE_CONFIG[currentPrice.quintile as Quintile]
  const deltaVsAvg = ((currentPrice.price_eur_mwh - currentPrice.daily_avg) / currentPrice.daily_avg) * 100
  
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

  // Get next 6 periods for large display
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

  // Find cheapest in next 12 periods
  const next12 = dayPrices.periods.slice(currentPeriodIndex + 1, currentPeriodIndex + 13)
  const cheapestPeriod = next12.reduce((min, p) => p.price_eur_mwh < min.price_eur_mwh ? p : min, next12[0])

  return (
    <div className="flex h-full flex-col gap-8 p-8">
      {/* Top Section: Date and Current Price */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Date Display - Large */}
        <Card className="bg-card/50">
          <CardContent className="flex h-full flex-col items-center justify-center p-8">
            <div className="text-center">
              <div className="text-6xl font-bold text-foreground tracking-tight lg:text-7xl">
                {dublinDate.split(",")[0]}
              </div>
              <div className="mt-2 text-3xl text-muted-foreground lg:text-4xl">
                {dublinDate.split(",").slice(1).join(",")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Current Price Display */}
        <Card 
          className="overflow-hidden border-4" 
          style={{ borderColor: getQuintileColor(currentPrice.quintile as Quintile) }}
        >
          <CardContent className="p-0">
            <div 
              className="px-8 py-4 text-center"
              style={{ backgroundColor: getQuintileColor(currentPrice.quintile as Quintile) }}
            >
              <span className="text-2xl font-bold uppercase tracking-wider text-background lg:text-3xl">
                {quintileConfig.signal}
              </span>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-6 p-8">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-8xl font-bold tabular-nums text-foreground lg:text-9xl">
                      {currentPrice.price_eur_mwh.toFixed(2)}
                    </span>
                    <span className="text-3xl text-muted-foreground lg:text-4xl">€/MWh</span>
                  </div>
                </div>
                
                {/* Trend Arrow */}
                <div className="flex flex-col items-center">
                  {priceTrend === "up" ? (
                    <TrendingUp className="h-16 w-16 text-destructive" />
                  ) : priceTrend === "down" ? (
                    <TrendingDown className="h-16 w-16 text-primary" />
                  ) : (
                    <Minus className="h-16 w-16 text-muted-foreground" />
                  )}
                  <span className="text-xl text-muted-foreground">
                    {priceTrend === "up" ? "Rising" : priceTrend === "down" ? "Falling" : "Stable"}
                  </span>
                </div>
              </div>

              {/* Customer Tariff */}
              {currentTariff && (
                <div className="flex items-center gap-8 rounded-xl bg-muted/50 px-8 py-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-8 w-8 text-accent" />
                    <span className="text-4xl font-bold text-foreground">
                      {currentTariff.tariff_inc_vat_eur_kwh.toFixed(4)}
                    </span>
                    <span className="text-xl text-muted-foreground">€/kWh</span>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <span className={`text-2xl font-semibold ${savingVsFlat > 0 ? "text-primary" : "text-destructive"}`}>
                    {savingVsFlat > 0 ? `Save ${savingVsFlat.toFixed(4)} €/kWh` : `+${Math.abs(savingVsFlat).toFixed(4)} €/kWh`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Statistics */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <TrendingDown className="h-10 w-10 text-primary mb-2" />
            <span className="text-xl text-muted-foreground">Daily Min</span>
            <span className="text-4xl font-bold text-foreground tabular-nums">€{currentPrice.daily_min.toFixed(2)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <TrendingUp className="h-10 w-10 text-destructive mb-2" />
            <span className="text-xl text-muted-foreground">Daily Max</span>
            <span className="text-4xl font-bold text-foreground tabular-nums">€{currentPrice.daily_max.toFixed(2)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Activity className="h-10 w-10 text-muted-foreground mb-2" />
            <span className="text-xl text-muted-foreground">Daily Avg</span>
            <span className="text-4xl font-bold text-foreground tabular-nums">€{currentPrice.daily_avg.toFixed(2)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Clock className="h-10 w-10 text-accent mb-2" />
            <span className="text-xl text-muted-foreground">Next Change</span>
            <span className="text-4xl font-bold text-foreground tabular-nums font-mono">{countdown}</span>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Next 6 Periods - Large Display */}
      <Card className="flex-1">
        <CardContent className="h-full p-6">
          <div className="mb-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <h3 className="text-3xl font-bold text-foreground">Next 6 Periods</h3>
          </div>
          <div className="grid grid-cols-6 gap-4 h-[calc(100%-4rem)]">
            {nextPeriods.map((period, idx) => {
              const isCheapest = cheapestPeriod && period.period === cheapestPeriod.period
              const tariffPeriod = nextTariffPeriods?.[idx]
              
              return (
                <div
                  key={period.period}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-6 transition-all ${
                    isCheapest ? "border-accent bg-accent/10" : "border-border bg-card/50"
                  }`}
                >
                  {isCheapest && (
                    <Badge 
                      className="absolute -top-3 bg-accent text-accent-foreground text-lg px-4 py-1"
                    >
                      BEST
                    </Badge>
                  )}
                  
                  <span className="text-2xl text-muted-foreground mb-2">
                    {formatTime(period.start_time_dublin)}
                  </span>
                  
                  <span className="text-5xl font-bold tabular-nums text-foreground lg:text-6xl">
                    {period.price_eur_mwh.toFixed(0)}
                  </span>
                  
                  <span className="text-lg text-muted-foreground">€/MWh</span>

                  {tariffPeriod && (
                    <div className="mt-4 text-center">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {tariffPeriod.tariff_inc_vat_eur_kwh.toFixed(4)}
                      </span>
                      <span className="text-sm text-muted-foreground block">€/kWh</span>
                    </div>
                  )}
                  
                  <div
                    className="mt-4 h-4 w-4 rounded-full"
                    style={{ backgroundColor: getQuintileColor(period.quintile as Quintile) }}
                    title={`Q${period.quintile}`}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Source Attribution */}
      <div className="text-center text-lg text-muted-foreground">
        Data Source: Semo PX | Period {currentPrice.period}/48 | Source: {currentPrice.source}
      </div>
    </div>
  )
}
