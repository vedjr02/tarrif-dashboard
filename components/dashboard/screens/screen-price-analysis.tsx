"use client"

import { useState, useEffect } from "react"
import { DayAheadPriceChart } from "../day-ahead-price-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { DayPrices, DayTariffs } from "@/lib/types"
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
import { Info } from "lucide-react"
import { getQuintileColor, getSignalText } from "@/lib/types"
import type { Quintile } from "@/lib/types"

interface ScreenPriceAnalysisProps {
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

export function ScreenPriceAnalysis({
  todayPrices,
  todayTariffs,
  tomorrowPrices,
  tomorrowTariffs,
  yesterdayPrices,
  yesterdayTariffs,
  currentPeriodIndex,
}: ScreenPriceAnalysisProps) {
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
          tariffs: tomorrowTariffs || todayTariffs,
        }
      case "yesterday":
        return {
          prices: yesterdayPrices,
          tariffs: yesterdayTariffs || todayTariffs,
        }
      default:
        return {
          prices: todayPrices,
          tariffs: todayTariffs,
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

  const allValues = chartData.flatMap((d) => [d.dynamicPrice, d.irishTariff])
  const minPrice = Math.min(...allValues)
  const maxPrice = Math.max(...allValues)
  const padding = (maxPrice - minPrice) * 0.1

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null

  const totalDynamicCost = chartData.reduce((sum, d) => sum + d.dynamicPrice, 0) / 48
  const totalIrishCost = chartData.reduce((sum, d) => sum + d.irishTariff, 0) / 48
  const avgSavingPercent = ((totalIrishCost - totalDynamicCost) / totalIrishCost) * 100

  return (
    <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:gap-6 lg:p-8 overflow-auto h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-2xl lg:text-3xl">
            Price Analysis
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm lg:text-base">
            Day-Ahead Market & Irish Tariff Comparison
          </p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <Card className="bg-primary/10 border-primary">
          <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
            <span className="text-xs font-medium text-foreground sm:text-sm">ADFLEX Dynamic</span>
            <span className="text-sm font-bold text-primary sm:text-base lg:text-lg">
              €{(totalDynamicCost / 1000).toFixed(4)}/kWh
            </span>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent">
          <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
            <span className="text-xs font-medium text-foreground sm:text-sm">Irish Tariff</span>
            <span className="text-sm font-bold text-accent sm:text-base lg:text-lg">
              €{(totalIrishCost / 1000).toFixed(4)}/kWh
            </span>
          </CardContent>
        </Card>
        <Card className={avgSavingPercent > 0 ? "bg-primary/5 border-primary" : "bg-destructive/10 border-destructive"}>
          <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
            <span className="text-xs font-medium text-foreground sm:text-sm">Savings</span>
            <span className={`text-sm font-bold sm:text-base lg:text-lg ${avgSavingPercent > 0 ? "text-primary" : "text-destructive"}`}>
              {avgSavingPercent > 0 ? "+" : ""}{avgSavingPercent.toFixed(1)}%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout: Day-Ahead (left) + Curve Comparison (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 flex-1 min-h-0">
        {/* Left: Day-Ahead Price Chart */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Hourly Prices</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2 sm:p-4 min-h-0">
            <div className="h-full">
              {mounted && (
                <DayAheadPriceChart
                  compact={true}
                  height={250}
                  dayViewOverride={dayView}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Price Curve Comparison */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Comparison Curve</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2 sm:p-4 min-h-0">
            <div className="w-full h-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                      interval={7}
                    />
                    <YAxis
                      domain={[minPrice - padding, maxPrice + padding]}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                      tickFormatter={(v) => `€${(v / 1000).toFixed(2)}`}
                      width={48}
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
                      />
                    )}
                    <Line
                      type="stepAfter"
                      dataKey="irishTariff"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="dynamicPrice"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#priceGradient)"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:gap-x-4 sm:text-sm">
        <div className="flex items-center gap-1">
          <Info className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Irish Tariffs:</span>
        </div>
        <span>Day: €{IRISH_TARIFFS.day_rate.toFixed(4)}</span>
        <span>Night: €{IRISH_TARIFFS.night_rate.toFixed(4)}</span>
        <span>Peak: €{IRISH_TARIFFS.peak_rate.toFixed(4)}</span>
      </div>
    </div>
  )
}
