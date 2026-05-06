"use client"

import { useState } from "react"
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart } from "lucide-react"
import type { DayPrices, DayTariffs, Quintile } from "@/lib/types"
import { getQuintileColor, getSignalText } from "@/lib/types"

interface PriceCurveChartProps {
  todayPrices: DayPrices
  todayTariffs?: DayTariffs
  tomorrowPrices: DayPrices | null
  yesterdayPrices: DayPrices
  currentPeriodIndex: number
}

type DayView = "today" | "tomorrow" | "yesterday"


export function PriceCurveChart({
  todayPrices,
  todayTariffs,
  tomorrowPrices,
  yesterdayPrices,
  currentPeriodIndex,
}: PriceCurveChartProps) {
  const [dayView, setDayView] = useState<DayView>("today")

  const getSelectedPrices = () => {
    switch (dayView) {
      case "tomorrow":
        return tomorrowPrices || todayPrices
      case "yesterday":
        return yesterdayPrices
      default:
        return todayPrices
    }
  }

  const selectedPrices = getSelectedPrices()

  const chartData = selectedPrices.periods.map((period) => {
    const date = new Date(period.start_time_dublin)
    return {
      time: date.toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Dublin",
      }),
      wholesale: period.price_eur_mwh,
      wholesaleKwh: period.price_eur_mwh / 1000,
      quintile: period.quintile,
      source: period.source,
      period: period.period,
    }
  })

  const minPrice = Math.min(...chartData.map((d) => d.wholesale))
  const maxPrice = Math.max(...chartData.map((d) => d.wholesale))
  const padding = (maxPrice - minPrice) * 0.1

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-4 w-4 text-primary" />
          Price Curve — 48 Periods
        </CardTitle>
        <div className="flex gap-1">
            <Button
              variant={dayView === "yesterday" ? "default" : "outline"}
              size="sm"
              onClick={() => setDayView("yesterday")}
              className="h-7 text-xs"
            >
              Yesterday
            </Button>
            <Button
              variant={dayView === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setDayView("today")}
              className="h-7 text-xs"
            >
              Today
            </Button>
            <Button
              variant={dayView === "tomorrow" ? "default" : "outline"}
              size="sm"
              onClick={() => setDayView("tomorrow")}
              disabled={!tomorrowPrices}
              className="h-7 text-xs"
            >
              Tomorrow
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                interval={5}
              />
              <YAxis
                domain={[minPrice - padding, maxPrice + padding]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                tickFormatter={(value) => `€${value.toFixed(0)}`}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                      <p className="text-sm font-medium text-foreground">{data.time}</p>
                      <p className="text-lg font-bold text-foreground">
                        €{data.wholesale.toFixed(2)}/MWh
                      </p>
                      <p className="text-sm text-muted-foreground">
                        €{data.wholesaleKwh.toFixed(4)}/kWh
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: getQuintileColor(data.quintile as Quintile) }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {getSignalText(data.quintile)} • {data.source}
                        </span>
                      </div>
                    </div>
                  )
                }}
              />
              {currentTimeStr && (
                <ReferenceLine
                  x={currentTimeStr}
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: "NOW",
                    position: "top",
                    fill: "var(--accent)",
                    fontSize: 10,
                    fontWeight: "bold",
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="wholesale"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "var(--primary)",
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
