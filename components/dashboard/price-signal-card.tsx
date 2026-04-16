"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { CurrentPrice, PricePeriod, Quintile } from "@/lib/types"
import { getQuintileColor, QUINTILE_CONFIG } from "@/lib/types"

interface PriceSignalCardProps {
  currentPrice: CurrentPrice
  previousPeriod?: PricePeriod
}

export function PriceSignalCard({ currentPrice, previousPeriod }: PriceSignalCardProps) {
  const [countdown, setCountdown] = useState("")

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const minutes = now.getMinutes()
      const seconds = now.getSeconds()
      
      // Next period starts at :00 or :30
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
  const deltaVsAvg = ((currentPrice.price_eur_mwh - currentPrice.daily_avg) / currentPrice.daily_avg) * 100
  
  const priceTrend = previousPeriod 
    ? currentPrice.price_eur_mwh > previousPeriod.price_eur_mwh 
      ? "up" 
      : currentPrice.price_eur_mwh < previousPeriod.price_eur_mwh 
        ? "down" 
        : "same"
    : "same"

  return (
    <Card className="overflow-hidden border-2" style={{ borderColor: getQuintileColor(currentPrice.quintile as Quintile) }}>
      <CardContent className="p-0">
        <div 
          className="px-6 py-3 text-center"
          style={{ backgroundColor: getQuintileColor(currentPrice.quintile as Quintile) }}
        >
          <span className="text-sm font-bold uppercase tracking-wider text-background">
            {quintileConfig.signal}
          </span>
        </div>
        
        <div className="space-y-4 p-6">
          {/* Current Price */}
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-6xl font-bold tabular-nums text-foreground md:text-7xl">
                  {currentPrice.price_eur_mwh.toFixed(2)}
                </span>
                <span className="text-xl text-muted-foreground">€/MWh</span>
              </div>
            </div>
            
            {/* Trend Arrow */}
            <div className="flex flex-col items-center">
              {priceTrend === "up" ? (
                <TrendingUp className="h-8 w-8 text-destructive" />
              ) : priceTrend === "down" ? (
                <TrendingDown className="h-8 w-8 text-primary" />
              ) : (
                <Minus className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {priceTrend === "up" ? "Rising" : priceTrend === "down" ? "Falling" : "Stable"}
              </span>
            </div>
          </div>

          {/* Countdown & Delta */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Next change in</p>
              <p className="font-mono text-2xl font-semibold text-foreground">{countdown}</p>
            </div>
            
            <div className="h-10 w-px bg-border" />
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">vs today&apos;s average</p>
              <p 
                className={`text-2xl font-semibold ${
                  deltaVsAvg < 0 ? "text-primary" : deltaVsAvg > 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {deltaVsAvg > 0 ? "+" : ""}{deltaVsAvg.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Period Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Period {currentPrice.period}/48</span>
            <span>Source: {currentPrice.source}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
