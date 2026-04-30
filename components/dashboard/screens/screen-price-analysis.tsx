"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { DayPrices, DayTariffs } from "@/lib/types"
import {
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, Loader2, ChevronDown } from "lucide-react"
import { getRetailTariffs } from "@/lib/priceService"
import type { RetailTariff } from "@/lib/priceService"

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
  const [retailTariffs, setRetailTariffs] = useState<RetailTariff[]>([])
  const [tariffError, setTariffError] = useState<string | null>(null)
  const [tariffLoading, setTariffLoading] = useState(true)
  const [selectedTariffs, setSelectedTariffs] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch retail tariffs on mount
  useEffect(() => {
    async function loadTariffs() {
      setTariffLoading(true)
      try {
        const { tariffs, dataAvailable, warning } = await getRetailTariffs()
        setRetailTariffs(tariffs)
        if (!dataAvailable && warning) {
          setTariffError(warning)
        }
      } catch (error) {
        console.error("[ScreenPriceAnalysis] Error fetching tariffs:", error)
        setTariffError("Failed to load retail tariff data")
      } finally {
        setTariffLoading(false)
      }
    }
    loadTariffs()
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

  const { prices: selectedPrices } = getSelectedData()

  // Build stable color map for tariffs (indexed by supplier position)
  const tariffColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    retailTariffs.forEach((tariff, idx) => {
      map[tariff.supplier] = `hsl(${60 + idx * 80}, 70%, 55%)`
    })
    return map
  }, [retailTariffs])

  // Convert 30-min periods to chart data with tariff prices (re-runs when tariffs change)
  const chartData = useMemo(() => {
    return selectedPrices.periods.map((period, idx) => {
      const semPriceCentsKwh = period.price_eur_mwh / 10 // Convert EUR/MWh to c/kWh
      const date = new Date(period.start_time_dublin)

      const dataPoint: Record<string, any> = {
        periodIdx: idx,
        time: date.toLocaleTimeString("en-IE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Dublin",
        }),
        semPrice: semPriceCentsKwh,
        quintile: period.quintile,
        source: period.source,
      }

      // Add retail tariff prices (already in c/kWh)
      retailTariffs.forEach((tariff) => {
        dataPoint[`tariff_${tariff.supplier}`] = tariff.unitRate
      })

      return dataPoint
    })
  }, [selectedPrices, retailTariffs])

  // Calculate min/max for Y-axis
  const allValues = chartData.flatMap((d) => {
    const vals = [d.semPrice]
    retailTariffs.forEach((t) => {
      vals.push(d[`tariff_${t.supplier}`])
    })
    return vals
  })
  const minPrice = Math.min(...allValues) || 0
  const maxPrice = Math.max(...allValues) || 50
  const padding = (maxPrice - minPrice) * 0.15

  // Average SEM price
  const avgSemPrice = chartData.reduce((sum, d) => sum + d.semPrice, 0) / chartData.length || 0

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null

  return (
    <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:gap-6 lg:p-8 overflow-auto h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-2xl lg:text-3xl">
            Price Analysis
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm lg:text-base">
            Day-Ahead Market with Retail Tariff Comparison
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

      {/* Error banner for missing tariff data */}
      {tariffError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{tariffError}</AlertDescription>
        </Alert>
      )}

      {/* Summary Card */}
      <Card className="bg-primary/10 border-primary">
        <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
          <span className="text-xs font-medium text-foreground sm:text-sm">Average SEM Day-Ahead Price (Today)</span>
          <span className="text-sm font-bold text-primary sm:text-base lg:text-lg">
            {avgSemPrice.toFixed(2)}c/kWh
          </span>
          <span className="text-xs text-muted-foreground mt-1">48-period average • SEM wholesale spot price</span>
        </CardContent>
      </Card>

      {/* Comparison Curve Chart */}
      <Card className="overflow-hidden flex flex-col flex-1 min-h-0">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base sm:text-lg">SEM vs Retail Tariffs</CardTitle>

          {/* Tariff selector inline checkboxes */}
          <div className="flex flex-wrap gap-2">
            {tariffLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              retailTariffs.map((tariff) => {
                const color = tariffColorMap[tariff.supplier]
                const isSelected = selectedTariffs.has(tariff.supplier)
                return (
                  <button
                    key={tariff.supplier}
                    onClick={() => {
                      const newSet = new Set(selectedTariffs)
                      if (isSelected) newSet.delete(tariff.supplier)
                      else newSet.add(tariff.supplier)
                      setSelectedTariffs(newSet)
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition-all ${
                      isSelected
                        ? "border-transparent text-white"
                        : "border-border text-muted-foreground bg-transparent"
                    }`}
                    style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {tariff.supplier}
                  </button>
                )
              })
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-2 sm:p-4 min-h-0">
          <div className="w-full h-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="semGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="time"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    interval={3}
                  />

                  <YAxis
                    domain={[minPrice - padding, maxPrice + padding]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(0)}c`}
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
                              <span className="text-xs text-primary font-semibold">SEM Day-Ahead:</span>
                              <span className="text-xs font-bold text-primary">{data.semPrice.toFixed(2)}c/kWh</span>
                            </div>
                            {Array.from(selectedTariffs).map((supplier) => (
                              <div key={supplier} className="flex items-center justify-between gap-6">
                                <span className="text-xs text-muted-foreground">{supplier}:</span>
                                <span className="text-xs font-bold text-muted-foreground">
                                  {data[`tariff_${supplier}`]?.toFixed(2)}c/kWh
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

                  {/* SEM Day-Ahead line - always shown */}
                  <Line
                    type="monotone"
                    dataKey="semPrice"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    dot={false}
                    name="SEM Day-Ahead"
                  />

                  {/* Retail tariff lines - selected only */}
                  {Array.from(selectedTariffs).map((supplier) => (
                    <Line
                      key={supplier}
                      type="stepAfter"
                      dataKey={`tariff_${supplier}`}
                      stroke={tariffColorMap[supplier]}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name={supplier}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
