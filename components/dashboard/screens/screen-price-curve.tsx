"use client"

import { useState, useEffect } from "react"
import {
  Area,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import type { DayPrices, DayTariffs, Quintile } from "@/lib/types"
import { getQuintileColor, getSignalText } from "@/lib/types"

interface ScreenPriceCurveProps {
  todayPrices: DayPrices
  todayTariffs?: DayTariffs | null
  tomorrowPrices: DayPrices | null
  tomorrowTariffs?: DayTariffs | null
  yesterdayPrices: DayPrices
  yesterdayTariffs?: DayTariffs | null
  currentPeriodIndex: number
}

type DayView = "today" | "tomorrow" | "yesterday"

const IRISH_TARIFFS = {
  day_rate: 0.4285,
  night_rate: 0.2304,
  peak_rate: 0.4899,
  flat_rate: 0.2638,
}

const getIrishTariffForPeriod = (periodIndex: number): number => {
  const hour = Math.floor(periodIndex / 2)
  if (hour >= 17 && hour < 19) return IRISH_TARIFFS.peak_rate
  if (hour >= 23 || hour < 8) return IRISH_TARIFFS.night_rate
  return IRISH_TARIFFS.day_rate
}

export function ScreenPriceCurve({
  todayPrices,
  todayTariffs,
  tomorrowPrices,
  tomorrowTariffs,
  yesterdayPrices,
  yesterdayTariffs,
  currentPeriodIndex,
}: ScreenPriceCurveProps) {
  const [dayView, setDayView] = useState<DayView>("today")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getSelectedData = () => {
    switch (dayView) {
      case "tomorrow": 
        return { 
          prices: tomorrowPrices || todayPrices, 
          tariffs: tomorrowTariffs || todayTariffs 
        }
      case "yesterday": 
        return { 
          prices: yesterdayPrices, 
          tariffs: yesterdayTariffs || todayTariffs 
        }
      default: 
        return { 
          prices: todayPrices, 
          tariffs: todayTariffs 
        }
    }
  }

  const { prices: selectedPrices, tariffs: selectedTariffs } = getSelectedData()

  const chartData = selectedPrices.periods.map((period, idx) => {
    const tariff = selectedTariffs?.periods[idx]
    const date = new Date(period.start_time_dublin)
    const irishTariff = getIrishTariffForPeriod(idx)
    return {
      time: date.toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Dublin",
      }),
      dynamicPrice: tariff ? tariff.tariff_inc_vat_eur_kwh * 1000 : period.price_eur_mwh,
      irishTariff: irishTariff * 1000,
      quintile: period.quintile,
      source: period.source,
      tariff_inc_vat: tariff?.tariff_inc_vat_eur_kwh,
      irishTariffKwh: irishTariff,
    }
  })

  const allValues = chartData.flatMap(d => [d.dynamicPrice, d.irishTariff])
  const minPrice = Math.min(...allValues)
  const maxPrice = Math.max(...allValues)
  const padding = (maxPrice - minPrice) * 0.1

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null

  const totalDynamicCost = chartData.reduce((sum, d) => sum + d.dynamicPrice, 0) / 48
  const totalIrishCost = chartData.reduce((sum, d) => sum + d.irishTariff, 0) / 48
  const avgSavingPercent = ((totalIrishCost - totalDynamicCost) / totalIrishCost) * 100

  return (
    <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:gap-6 lg:p-8 overflow-auto">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-2xl lg:text-3xl">Dynamic Price Curve</h2>
          <p className="text-xs text-muted-foreground sm:text-sm lg:text-base">48 Periods with Irish Tariff Comparison</p>
        </div>
        <div className="flex gap-1.5 sm:gap-2">
          {(["yesterday", "today", "tomorrow"] as DayView[]).map((view) => (
            <Button
              key={view}
              variant={dayView === view ? "default" : "outline"}
              size="sm"
              onClick={() => setDayView(view)}
              disabled={view === "tomorrow" && !tomorrowPrices}
              className="text-xs capitalize sm:text-sm"
            >
              {view}
            </Button>
          ))}
        </div>
      </div>

      {/* Legend Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-5">
        <Card className="bg-primary/10 border-primary">
          <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-5 rounded bg-primary sm:h-3 sm:w-6" />
              <span className="text-xs font-medium text-foreground sm:text-sm">ADFLEX Dynamic</span>
            </div>
            <span className="text-sm font-bold text-primary sm:text-base lg:text-xl">
              €{(totalDynamicCost / 1000).toFixed(4)}/kWh
            </span>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent">
          <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-5 rounded border-2 border-dashed border-accent sm:h-3 sm:w-6" />
              <span className="text-xs font-medium text-foreground sm:text-sm">Irish Tariff</span>
            </div>
            <span className="text-sm font-bold text-accent sm:text-base lg:text-xl">
              €{(totalIrishCost / 1000).toFixed(4)}/kWh
            </span>
          </CardContent>
        </Card>
        <Card className={avgSavingPercent > 0 ? "bg-primary/5 border-primary" : "bg-destructive/10 border-destructive"}>
          <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
            <span className="text-xs font-medium text-foreground sm:text-sm">Potential Savings</span>
            <span className={`text-sm font-bold sm:text-base lg:text-xl ${avgSavingPercent > 0 ? "text-primary" : "text-destructive"}`}>
              {avgSavingPercent > 0 ? "+" : ""}{avgSavingPercent.toFixed(1)}%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-2 sm:p-4 lg:p-6">
          <div className="w-full h-[250px] sm:h-[300px] lg:h-[350px]">
            {mounted && <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
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
                  tickFormatter={(v) => `€${(v / 1000).toFixed(2)}`}
                  width={52}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
                        <p className="text-sm font-bold text-foreground">{data.time}</p>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-xs text-primary">Dynamic:</span>
                            <span className="text-xs font-bold text-primary">
                              €{(data.tariff_inc_vat ?? data.dynamicPrice / 1000).toFixed(4)}/kWh
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-xs text-accent">Irish:</span>
                            <span className="text-xs font-bold text-accent">
                              €{data.irishTariffKwh.toFixed(4)}/kWh
                            </span>
                          </div>
                          <div className="flex items-center gap-2 border-t border-border pt-1">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: getQuintileColor(data.quintile as Quintile) }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {getSignalText(data.quintile)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                {currentTimeStr && (
                  <ReferenceLine
                    x={currentTimeStr}
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    label={{ value: "NOW", position: "top", fill: "var(--foreground)", fontSize: 11, fontWeight: "bold" }}
                  />
                )}
                <Line
                  type="stepAfter"
                  dataKey="irishTariff"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  name="Irish Tariff"
                />
                <Area
                  type="monotone"
                  dataKey="dynamicPrice"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
                  name="Dynamic Price"
                />
              </ComposedChart>
            </ResponsiveContainer>}
          </div>
        </CardContent>
      </Card>

      {/* Tariff Info Footer */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:gap-x-5 sm:text-sm">
        <div className="flex items-center gap-1">
          <Info className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Irish Tariffs:</span>
        </div>
        <span>Day: €{IRISH_TARIFFS.day_rate.toFixed(4)}/kWh</span>
        <span>Night: €{IRISH_TARIFFS.night_rate.toFixed(4)}/kWh</span>
        <span>Peak: €{IRISH_TARIFFS.peak_rate.toFixed(4)}/kWh</span>
        <span className="text-muted-foreground/60">Semo PX</span>
      </div>
    </div>
  )
}
