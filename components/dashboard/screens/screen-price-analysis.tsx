"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { DayPrices, DayTariffs, Quintile } from "@/lib/types"
import { getPriceColor } from "@/lib/types"
import {
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, Loader2 } from "lucide-react"
import { getRetailTariffs, getTouRateForHour } from "@/lib/priceService"
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
        // Auto-select first 4 tariffs by default (mix of flat and ToU)
        setSelectedTariffs(new Set(tariffs.slice(0, 4).map(t => `${t.supplier}-${t.planName}`)))
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

  // Build stable color map for tariffs (indexed by supplier-plan)
  const tariffColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    retailTariffs.forEach((tariff, idx) => {
      const key = `${tariff.supplier}-${tariff.planName}`
      // Use distinct colors: flat tariffs = warm colors, ToU = cool colors
      const hue = tariff.type === "flat" ? 30 + idx * 25 : 180 + idx * 25
      map[key] = `hsl(${hue}, 70%, 50%)`
    })
    return map
  }, [retailTariffs])

  // Convert 30-min periods to chart data with Renew and tariff prices (all in EUR/kWh)
  const chartData = useMemo(() => {
    if (!selectedPrices?.periods || selectedPrices.periods.length === 0) {
      return []
    }
    return selectedPrices.periods.map((period, idx) => {
      // Renew price = SEM price: EUR/MWh -> EUR/kWh (divide by 1000)
      const renewPriceEurKwh = period.price_eur_mwh / 1000
      
      const date = new Date(period.start_time_dublin)

      // Get hour from Dublin time for ToU calculation
      const hour = date.getHours()
      
      const dataPoint: Record<string, any> = {
        periodIdx: idx,
        hour,
        time: date.toLocaleTimeString("en-IE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Dublin",
        }),
        renewPrice: renewPriceEurKwh,
        quintile: period.quintile,
        source: period.source,
      }

      // Add retail tariff prices (convert from c/kWh to EUR/kWh)
      // For ToU tariffs, use the correct rate based on the hour
      retailTariffs.forEach((tariff) => {
        const key = `${tariff.supplier}-${tariff.planName}`
        const rateInCents = getTouRateForHour(tariff, hour)
        dataPoint[`tariff_${key}`] = rateInCents / 100
      })

      return dataPoint
    })
  }, [selectedPrices, retailTariffs])

  // Calculate min/max for Y-axis (all values now in EUR/kWh)
  const allValues = chartData.flatMap((d) => {
    const vals = [d.renewPrice]
    retailTariffs.forEach((t) => {
      const key = `${t.supplier}-${t.planName}`
      vals.push(d[`tariff_${key}`])
    })
    return vals
  })
  const minPrice = Math.min(...allValues) || 0
  const maxPrice = Math.max(...allValues) || 0.50
  const padding = (maxPrice - minPrice) * 0.15

  // Average Renew price (EUR/kWh)
  const avgRenewPrice = chartData.reduce((sum, d) => sum + d.renewPrice, 0) / chartData.length || 0

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
      <Card className="bg-amber-100/30 border-amber-400">
        <CardContent className="flex flex-col gap-0.5 p-2 sm:p-3 lg:p-4">
          <span className="text-xs font-medium text-foreground sm:text-sm">Average Renew Price ({dayView})</span>
          <span className="text-sm font-bold text-amber-600 sm:text-base lg:text-lg">
            {Math.abs(avgRenewPrice).toFixed(4)} EUR/kWh
          </span>
          <span className="text-xs text-muted-foreground mt-1">48-period average SEM wholesale spot price</span>
        </CardContent>
      </Card>

      {/* Tariff Selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base">Compare with Retail Tariffs</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {tariffLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              retailTariffs.map((tariff) => {
                const key = `${tariff.supplier}-${tariff.planName}`
                const color = tariffColorMap[key]
                const isSelected = selectedTariffs.has(key)
                return (
                  <button
                    key={key}
                    onClick={() => {
                      const newSet = new Set(selectedTariffs)
                      if (isSelected) newSet.delete(key)
                      else newSet.add(key)
                      setSelectedTariffs(newSet)
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? "border-transparent text-white"
                        : "border-border text-muted-foreground bg-transparent hover:bg-muted/50"
                    }`}
                    style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {tariff.supplier} - {tariff.planName}
                  </button>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Curve Chart */}
      <Card className="overflow-hidden flex flex-col flex-1 min-h-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Renew vs Retail Tariffs</CardTitle>
        </CardHeader>

        <CardContent className="p-2 sm:p-4">
          <div className="w-full h-[300px] sm:h-[350px] lg:h-[400px] relative">
            {mounted && chartData.length > 0 && (
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
                    tickFormatter={(v) => `${v.toFixed(2)}`}
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
                              <span 
                                className="flex items-center gap-1 text-xs font-semibold"
                                style={{ color: getPriceColor(data.renewPrice * 1000, data.quintile as Quintile) }}
                              >
                                <span 
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: getPriceColor(data.renewPrice * 1000, data.quintile as Quintile) }}
                                />
                                Renew:
                              </span>
                              <span 
                                className="text-xs font-bold"
                                style={{ color: getPriceColor(data.renewPrice * 1000, data.quintile as Quintile) }}
                              >
                                {Math.abs(data.renewPrice).toFixed(4)} EUR/kWh
                              </span>
                            </div>
                            {Array.from(selectedTariffs).map((key) => {
                              const tariff = retailTariffs.find(t => `${t.supplier}-${t.planName}` === key)
                              const displayName = tariff ? `${tariff.supplier} ${tariff.planName}` : key
                              return (
                                <div key={key} className="flex items-center justify-between gap-6">
                                  <span 
                                    className="flex items-center gap-1 text-xs"
                                    style={{ color: tariffColorMap[key] }}
                                  >
                                    <span 
                                      className="h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: tariffColorMap[key] }}
                                    />
                                    {displayName}:
                                  </span>
                                  <span className="text-xs font-bold" style={{ color: tariffColorMap[key] }}>
                                    {data[`tariff_${key}`]?.toFixed(4)} EUR/kWh
                                  </span>
                                </div>
                              )
                            })}
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

                  {/* Renew line - always shown, bold amber/orange */}
                  <Line
                    type="monotone"
                    dataKey="renewPrice"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                    name="Renew"
                  />

                  {/* Retail tariff lines - selected only */}
                  {Array.from(selectedTariffs).map((key) => {
                    const tariff = retailTariffs.find(t => `${t.supplier}-${t.planName}` === key)
                    const isFlat = tariff?.type === "flat"
                    return (
                      <Line
                        key={key}
                        type={isFlat ? "monotone" : "stepAfter"}
                        dataKey={`tariff_${key}`}
                        stroke={tariffColorMap[key]}
                        strokeWidth={isFlat ? 1.5 : 2}
                        strokeDasharray={isFlat ? "6 3" : undefined}
                        dot={false}
                        name={key}
                      />
                    )
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            )}
            {(!mounted || chartData.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
