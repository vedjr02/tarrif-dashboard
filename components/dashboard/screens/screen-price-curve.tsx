"use client"

import { useState } from "react"
import {
  Area,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Info } from "lucide-react"
import type { DayPrices, DayTariffs, Quintile } from "@/lib/types"
import { getQuintileColor, getSignalText } from "@/lib/types"

interface ScreenPriceCurveProps {
  todayPrices: DayPrices
  todayTariffs?: DayTariffs
  tomorrowPrices: DayPrices | null
  yesterdayPrices: DayPrices
  currentPeriodIndex: number
}

type DayView = "today" | "tomorrow" | "yesterday"

// Irish electricity tariff tiers (typical residential rates in €/kWh incl. VAT)
const IRISH_TARIFFS = {
  day_rate: 0.4285,      // Day rate (08:00-23:00)
  night_rate: 0.2304,    // Night rate (23:00-08:00)
  peak_rate: 0.4899,     // Peak rate (17:00-19:00)
  flat_rate: 0.2638,     // Standard flat rate
}

export function ScreenPriceCurve({
  todayPrices,
  todayTariffs,
  tomorrowPrices,
  yesterdayPrices,
  currentPeriodIndex,
}: ScreenPriceCurveProps) {
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
  const selectedTariffs = dayView === "today" ? todayTariffs : undefined

  // Helper to determine which Irish tariff applies for a given hour
  const getIrishTariffForPeriod = (periodIndex: number): number => {
    const hour = Math.floor(periodIndex / 2)
    // Peak: 17:00-19:00 (periods 34-38)
    if (hour >= 17 && hour < 19) {
      return IRISH_TARIFFS.peak_rate
    }
    // Night: 23:00-08:00 (periods 46-48 and 0-16)
    if (hour >= 23 || hour < 8) {
      return IRISH_TARIFFS.night_rate
    }
    // Day: 08:00-23:00
    return IRISH_TARIFFS.day_rate
  }

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
      irishTariff: irishTariff * 1000, // Convert to €/MWh equivalent for comparison
      wholesale: period.price_eur_mwh,
      quintile: period.quintile,
      source: period.source,
      period: period.period,
      tariff_inc_vat: tariff?.tariff_inc_vat_eur_kwh,
      irishTariffKwh: irishTariff,
    }
  })

  const allValues = chartData.flatMap(d => [d.dynamicPrice, d.irishTariff])
  const minPrice = Math.min(...allValues)
  const maxPrice = Math.max(...allValues)
  const padding = (maxPrice - minPrice) * 0.1

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null

  // Calculate savings summary
  const totalDynamicCost = chartData.reduce((sum, d) => sum + d.dynamicPrice, 0) / 48
  const totalIrishCost = chartData.reduce((sum, d) => sum + d.irishTariff, 0) / 48
  const avgSavingPercent = ((totalIrishCost - totalDynamicCost) / totalIrishCost) * 100

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LineChart className="h-10 w-10 text-primary" />
          <div>
            <h2 className="text-4xl font-bold text-foreground">Dynamic Price Curve</h2>
            <p className="text-xl text-muted-foreground">48 Periods with Irish Tariff Comparison</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={dayView === "yesterday" ? "default" : "outline"}
              size="lg"
              onClick={() => setDayView("yesterday")}
              className="text-lg px-6"
            >
              Yesterday
            </Button>
            <Button
              variant={dayView === "today" ? "default" : "outline"}
              size="lg"
              onClick={() => setDayView("today")}
              className="text-lg px-6"
            >
              Today
            </Button>
            <Button
              variant={dayView === "tomorrow" ? "default" : "outline"}
              size="lg"
              onClick={() => setDayView("tomorrow")}
              disabled={!tomorrowPrices}
              className="text-lg px-6"
            >
              Tomorrow
            </Button>
          </div>
        </div>
      </div>

      {/* Legend Cards */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="bg-primary/10 border-primary">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 bg-primary rounded" />
              <span className="text-xl font-semibold text-foreground">Dynamic Price (ADFLEX)</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              €{(totalDynamicCost / 1000).toFixed(4)}/kWh avg
            </span>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 bg-accent rounded" style={{ background: "repeating-linear-gradient(90deg, var(--accent), var(--accent) 4px, transparent 4px, transparent 8px)" }} />
              <span className="text-xl font-semibold text-foreground">Irish Tariff (Time-of-Use)</span>
            </div>
            <span className="text-2xl font-bold text-accent">
              €{(totalIrishCost / 1000).toFixed(4)}/kWh avg
            </span>
          </CardContent>
        </Card>
        <Card className={avgSavingPercent > 0 ? "bg-q1-cheap/10 border-q1-cheap" : "bg-destructive/10 border-destructive"}>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-xl font-semibold text-foreground">Potential Savings</span>
            <span className={`text-3xl font-bold ${avgSavingPercent > 0 ? "text-q1-cheap" : "text-destructive"}`}>
              {avgSavingPercent > 0 ? "+" : ""}{avgSavingPercent.toFixed(1)}%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="flex-1">
        <CardContent className="h-full p-6">
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  domain={[minPrice - padding, maxPrice + padding]}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(2)}`}
                  width={70}
                  label={{ 
                    value: '€/kWh', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'var(--muted-foreground)', fontSize: 14 }
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className="rounded-xl border-2 border-border bg-popover px-6 py-4 shadow-xl">
                        <p className="text-xl font-bold text-foreground">{data.time}</p>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between gap-8">
                            <span className="text-lg text-primary">Dynamic:</span>
                            <span className="text-xl font-bold text-primary">
                              €{data.tariff_inc_vat?.toFixed(4) || (data.dynamicPrice / 1000).toFixed(4)}/kWh
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-8">
                            <span className="text-lg text-accent">Irish Tariff:</span>
                            <span className="text-xl font-bold text-accent">
                              €{data.irishTariffKwh.toFixed(4)}/kWh
                            </span>
                          </div>
                          <div className="border-t border-border pt-2 flex items-center justify-between">
                            <span className="text-lg text-muted-foreground">Difference:</span>
                            <span className={`text-xl font-bold ${data.irishTariffKwh > (data.tariff_inc_vat || data.dynamicPrice / 1000) ? "text-q1-cheap" : "text-destructive"}`}>
                              {data.irishTariffKwh > (data.tariff_inc_vat || data.dynamicPrice / 1000) ? "Save " : "+"}
                              €{Math.abs(data.irishTariffKwh - (data.tariff_inc_vat || data.dynamicPrice / 1000)).toFixed(4)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: getQuintileColor(data.quintile as Quintile) }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {getSignalText(data.quintile)} | {data.source}
                          </span>
                        </div>
                      </div>
                    )
                  }}
                />
                {currentTimeStr && (
                  <ReferenceLine
                    x={currentTimeStr}
                    stroke="var(--foreground)"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    label={{
                      value: "NOW",
                      position: "top",
                      fill: "var(--foreground)",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  />
                )}
                {/* Irish Tariff Line */}
                <Line
                  type="stepAfter"
                  dataKey="irishTariff"
                  stroke="var(--accent)"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  dot={false}
                  name="Irish Tariff"
                />
                {/* Dynamic Price Area */}
                <Area
                  type="monotone"
                  dataKey="dynamicPrice"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{
                    r: 8,
                    fill: "var(--primary)",
                    stroke: "var(--background)",
                    strokeWidth: 3,
                  }}
                  name="Dynamic Price"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tariff Info */}
      <div className="flex items-center justify-center gap-8 text-lg text-muted-foreground">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          <span>Irish Tariffs:</span>
        </div>
        <span>Day (08-23h): €{IRISH_TARIFFS.day_rate.toFixed(4)}/kWh</span>
        <span>|</span>
        <span>Night (23-08h): €{IRISH_TARIFFS.night_rate.toFixed(4)}/kWh</span>
        <span>|</span>
        <span>Peak (17-19h): €{IRISH_TARIFFS.peak_rate.toFixed(4)}/kWh</span>
        <span>|</span>
        <span className="text-muted-foreground/70">Data Source: Semo PX</span>
      </div>
    </div>
  )
}
