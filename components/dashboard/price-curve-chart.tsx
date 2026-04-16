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
type PriceMode = "wholesale" | "customer"

const FLAT_RATE_EUR_KWH = 0.2638

export function PriceCurveChart({
  todayPrices,
  todayTariffs,
  tomorrowPrices,
  yesterdayPrices,
  currentPeriodIndex,
}: PriceCurveChartProps) {
  const [dayView, setDayView] = useState<DayView>("today")
  const [priceMode, setPriceMode] = useState<PriceMode>("wholesale")

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
  const selectedTariffs = dayView === "today" ? todayTariffs : undefined

  const chartData = selectedPrices.periods.map((period, idx) => {
    const tariff = selectedTariffs?.periods[idx]
    const date = new Date(period.start_time_dublin)
    return {
      time: date.toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Dublin",
      }),
      wholesale: period.price_eur_mwh,
      customer: tariff ? tariff.tariff_inc_vat_eur_kwh * 1000 : undefined, // Scale to MWh equivalent for y-axis
      quintile: period.quintile,
      source: period.source,
      period: period.period,
      tariff_inc_vat: tariff?.tariff_inc_vat_eur_kwh,
    }
  })

  const isCustomerMode = priceMode === "customer" && selectedTariffs

  const dataKey = isCustomerMode ? "customer" : "wholesale"
  const showData = chartData.filter(d => d[dataKey as keyof typeof chartData] !== undefined)

  const minPrice = Math.min(...showData.map((d) => d[dataKey as keyof typeof chartData] as number))
  const maxPrice = Math.max(...showData.map((d) => d[dataKey as keyof typeof chartData] as number))
  const padding = (maxPrice - minPrice) * 0.1

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null
  const flatRateY = isCustomerMode ? FLAT_RATE_EUR_KWH * 1000 : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-4 w-4 text-primary" />
          Price Curve — 48 Periods
        </CardTitle>
        <div className="flex gap-2">
          {selectedTariffs && (
            <div className="flex gap-1 border border-border rounded-lg p-1">
              <Button
                variant={priceMode === "wholesale" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPriceMode("wholesale")}
                className="h-7 text-xs"
              >
                Wholesale €/MWh
              </Button>
              <Button
                variant={priceMode === "customer" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPriceMode("customer")}
                className="h-7 text-xs"
              >
                Customer €/kWh
              </Button>
            </div>
          )}
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
                tickFormatter={(value) => isCustomerMode ? `€${(value / 1000).toFixed(3)}` : `€${value.toFixed(0)}`}
                width={isCustomerMode ? 60 : 50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                      <p className="text-sm font-medium text-foreground">{data.time}</p>
                      {isCustomerMode && data.tariff_inc_vat ? (
                        <p className="text-lg font-bold text-foreground">
                          €{data.tariff_inc_vat.toFixed(4)}/kWh
                        </p>
                      ) : (
                        <p className="text-lg font-bold text-foreground">
                          €{data.wholesale.toFixed(2)}/MWh
                        </p>
                      )}
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
              {isCustomerMode && flatRateY > 0 && (
                <ReferenceLine
                  y={flatRateY}
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={{
                    value: "Fixed plan",
                    position: "right",
                    fill: "var(--muted-foreground)",
                    fontSize: 10,
                    offset: 10,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey={dataKey}
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
