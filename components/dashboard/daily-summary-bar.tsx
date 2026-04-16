"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Activity, Zap } from "lucide-react"
import type { CurrentPrice, DayPrices } from "@/lib/types"

interface DailySummaryBarProps {
  currentPrice: CurrentPrice
  dayPrices: DayPrices
}

export function DailySummaryBar({ currentPrice, dayPrices }: DailySummaryBarProps) {
  const stats = [
    {
      label: "Min",
      value: currentPrice.daily_min.toFixed(2),
      icon: <TrendingDown className="h-4 w-4 text-primary" />,
    },
    {
      label: "Max",
      value: currentPrice.daily_max.toFixed(2),
      icon: <TrendingUp className="h-4 w-4 text-destructive" />,
    },
    {
      label: "Average",
      value: currentPrice.daily_avg.toFixed(2),
      icon: <Activity className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Current",
      value: currentPrice.price_eur_mwh.toFixed(2),
      icon: <Zap className="h-4 w-4 text-accent" />,
    },
  ]

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
              >
                {stat.icon}
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-muted-foreground">{stat.label}:</span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    €{stat.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={dayPrices.holiday ? "default" : "secondary"}
              className={dayPrices.holiday ? "bg-accent text-accent-foreground" : ""}
            >
              {dayPrices.holiday
                ? "Public Holiday"
                : dayPrices.day_type === "weekend"
                ? "Weekend"
                : "Weekday"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
