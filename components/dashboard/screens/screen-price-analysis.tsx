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
import { Info, ChevronDown } from "lucide-react"
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

// Retail tariff options (c/kWh, VAT inclusive)
const RETAIL_TARIFFS = {
  "Energia Standard": { rate: 24.88, standing: 6.15 },
  "Bord Gáis Standard": { rate: 25.12, standing: 4.00 },
  "Electric Ireland Standard": { rate: 26.40, standing: 5.00 },
  "SSE Airtricity Standard": { rate: 25.60, standing: 2.00 },
}

type TariffName = keyof typeof RETAIL_TARIFFS

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
  const [renewMargin, setRenewMargin] = useState(2.0) // c/kWh margin
  const [selectedRetailTariffs, setSelectedRetailTariffs] = useState<Set<TariffName>>(
    new Set(Object.keys(RETAIL_TARIFFS) as TariffName[])
  )
  const [showTariffDropdown, setShowTariffDropdown] = useState(false)

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

  const { prices: selectedPrices, tariffs: _selectedDayTariffs } = getSelectedData()

  const chartData = selectedPrices.periods.map((period, idx) => {
    // Convert SEM price from EUR/MWh to c/kWh: divide by 10
    const semPriceCentsKwh = (period.price_eur_mwh / 10)
    
    // Calculate Renew price: SEM price + margin
    const renewPrice = semPriceCentsKwh + renewMargin
    
    // Calculate retail tariff prices (already in c/kWh)
    const retailPrices: Record<TariffName, number> = {} as Record<TariffName, number>
    Object.entries(RETAIL_TARIFFS).forEach(([name, tariff]) => {
      retailPrices[name as TariffName] = tariff.rate
    })
    
    const date = new Date(period.start_time_dublin)
    return {
      time: date.toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Dublin",
      }),
      semPrice: semPriceCentsKwh,
      renewPrice: renewPrice,
      ...retailPrices,
      quintile: period.quintile,
      source: period.source,
    }
  })

  const allValues = chartData.flatMap((d) => [
    d.semPrice,
    d.renewPrice,
    ...Object.keys(RETAIL_TARIFFS).map((name) => d[name as TariffName]),
  ])
  const minPrice = Math.min(...allValues)
  const maxPrice = Math.max(...allValues)
  const padding = (maxPrice - minPrice) * 0.1

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null

  // Calculate average Renew price
  const avgRenewPrice = chartData.reduce((sum, d) => sum + d.renewPrice, 0) / chartData.length

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
            <span className="text-xs font-medium text-foreground sm:text-sm">SEM Price</span>
            <span className="text-sm font-bold text-primary sm:text-base lg:text-lg">
              {chartData[0]?.semPrice.toFixed(2)}c/kWh
            </span>
          </CardContent>
        </Card>
        <Card className="bg-amber-100/30 border-amber-400">
          <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
            <span className="text-xs font-medium text-foreground sm:text-sm">Renew</span>
            <span className="text-sm font-bold text-amber-600 sm:text-base lg:text-lg">
              {avgRenewPrice.toFixed(2)}c/kWh
            </span>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent">
          <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
            <span className="text-xs font-medium text-foreground sm:text-sm">Margin</span>
            <span className="text-sm font-bold text-accent sm:text-base lg:text-lg">
              {renewMargin.toFixed(1)}c/kWh
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

        {/* Right: Comparison Curve */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Comparison Curve</CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-xs">Renew Margin:</label>
              <input
                type="number"
                value={renewMargin}
                onChange={(e) => setRenewMargin(parseFloat(e.target.value) || 2.0)}
                step="0.1"
                min="0"
                max="5"
                className="w-12 px-1 py-0.5 text-xs border rounded"
              />
              <span className="text-xs">c/kWh</span>
            </div>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowTariffDropdown(!showTariffDropdown)}
              >
                <ChevronDown className="h-3 w-3 mr-1" />
                Tariffs ({selectedRetailTariffs.size})
              </Button>
              {showTariffDropdown && (
                <div className="absolute right-0 mt-1 bg-background border border-border rounded shadow-lg z-10 min-w-max">
                  {Object.keys(RETAIL_TARIFFS).map((tariff) => (
                    <label
                      key={tariff}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRetailTariffs.has(tariff as TariffName)}
                        onChange={(e) => {
                          const newSet = new Set(selectedRetailTariffs)
                          if (e.target.checked) {
                            newSet.add(tariff as TariffName)
                          } else {
                            newSet.delete(tariff as TariffName)
                          }
                          setSelectedTariffs(newSet)
                        }}
                      />
                      {tariff}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2 sm:p-4 min-h-0">
            <div className="w-full h-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="renewGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                      tickFormatter={(v) => `${v.toFixed(1)}c`}
                      width={45}
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
                                <span className="text-xs text-amber-600">Renew:</span>
                                <span className="text-xs font-bold text-amber-600">
                                  {data.renewPrice.toFixed(2)}c/kWh
                                </span>
                              </div>
                              {Array.from(selectedRetailTariffs).map((tariff) => (
                                <div key={tariff} className="flex items-center justify-between gap-6">
                                  <span className="text-xs text-muted-foreground">{tariff}:</span>
                                  <span className="text-xs font-bold text-muted-foreground">
                                    {data[tariff].toFixed(2)}c/kWh
                                  </span>
                                </div>
                              ))}
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
                    {/* Renew line - always shown */}
                    <Line
                      type="monotone"
                      dataKey="renewPrice"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={false}
                      name="Renew"
                    />
                    {/* Retail tariff lines */}
                    {Array.from(selectedRetailTariffs).map((tariff, idx) => (
                      <Line
                        key={tariff}
                        type="stepAfter"
                        dataKey={tariff}
                        stroke={`hsl(${idx * 60}, 70%, 50%)`}
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                      />
                    ))}
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
          <span>Retail Tariffs (c/kWh):</span>
        </div>
        {Object.entries(RETAIL_TARIFFS).map(([name, tariff]) => (
          <span key={name}>{name}: {tariff.rate}c</span>
        ))}
      </div>
    </div>
  )
}
