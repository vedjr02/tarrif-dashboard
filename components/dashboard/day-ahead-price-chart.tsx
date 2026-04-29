"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import type { HourlyPrice, DayAheadPriceResult } from "@/lib/priceService"

// ============================================================================
// TYPES
// ============================================================================

interface DayAheadPriceChartProps {
  /** Override default data with externally fetched prices */
  externalData?: DayAheadPriceResult
  /** Show compact version without header */
  compact?: boolean
  /** Custom height for the chart */
  height?: number
}

type DayView = "yesterday" | "today" | "tomorrow"

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Failed to fetch prices")
  return response.json()
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color based on price quintile
 * Q1 (cheapest 20%) = green
 * Q2-Q4 = gradient yellow to orange
 * Q5 (most expensive 20%) = red
 */
function getPriceColor(price: number, minPrice: number, maxPrice: number): string {
  const range = maxPrice - minPrice
  if (range === 0) return "var(--primary)"
  
  const normalized = (price - minPrice) / range
  
  if (normalized < 0.2) return "var(--q1-cheap)"
  if (normalized < 0.4) return "var(--q2-below)"
  if (normalized < 0.6) return "var(--q3-average)"
  if (normalized < 0.8) return "var(--q4-above)"
  return "var(--q5-expensive)"
}

/**
 * Format hour for X-axis label
 */
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DayAheadPriceChart({
  externalData,
  compact = false,
  height = 300,
}: DayAheadPriceChartProps) {
  const [mounted, setMounted] = useState(false)
  const [dayView, setDayView] = useState<DayView>("today")

  // Fetch data from API (only if no external data provided)
  const { data: apiData, error, isLoading, mutate } = useSWR<{
    todayPrices: { periods: { price_eur_mwh: number; start_time_dublin: string }[] }
    tomorrowPrices: { periods: { price_eur_mwh: number; start_time_dublin: string }[] } | null
    yesterdayPrices: { periods: { price_eur_mwh: number; start_time_dublin: string }[] }
    backendStatus: { data_source: string }
  }>(
    externalData ? null : "/api/prices",
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
    }
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Transform API data to HourlyPrice format
  const transformApiData = (): HourlyPrice[] | null => {
    if (!apiData) return null

    const selectedPrices = dayView === "tomorrow" 
      ? apiData.tomorrowPrices?.periods 
      : dayView === "yesterday" 
        ? apiData.yesterdayPrices?.periods 
        : apiData.todayPrices?.periods

    if (!selectedPrices) return null

    // Convert half-hourly to hourly (take first of each pair)
    const hourlyPrices: HourlyPrice[] = []
    for (let hour = 0; hour < 24; hour++) {
      const periodIndex = hour * 2
      const period = selectedPrices[periodIndex]
      if (period) {
        hourlyPrices.push({
          hour,
          timestamp: period.start_time_dublin,
          priceEurMwh: period.price_eur_mwh,
          source: (apiData.backendStatus?.data_source as "SEMO" | "ENTSOE") || "SEMO",
        })
      }
    }
    return hourlyPrices
  }

  // Get chart data
  const chartPrices: HourlyPrice[] | null = externalData?.prices || transformApiData()

  // Calculate current hour for reference line
  const currentHour = new Date().getHours()

  // Handle loading state
  if (isLoading && !externalData) {
    return (
      <Card className={compact ? "" : "w-full"}>
        {!compact && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Day-Ahead Price (EUR/MWh)</CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading prices...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handle error state (Task 3)
  if (error || (!chartPrices || chartPrices.length === 0)) {
    return (
      <Card className={compact ? "" : "w-full"}>
        {!compact && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Day-Ahead Price (EUR/MWh)</CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Day-Ahead price data unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">Check SEMO connection.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate min/max for color coding
  const prices = chartPrices.map(p => p.priceEurMwh)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

  // Prepare chart data
  const chartData = chartPrices.map(p => ({
    hour: formatHour(p.hour),
    hourNum: p.hour,
    price: p.priceEurMwh,
    source: p.source,
  }))

  return (
    <Card className={compact ? "" : "w-full"}>
      {!compact && (
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Day-Ahead Price (EUR/MWh)</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Source: {externalData?.source || apiData?.backendStatus?.data_source || "SEMO"}
                {externalData?.isRealData === false && " (Simulated)"}
              </p>
            </div>
            <div className="flex gap-1">
              {(["yesterday", "today", "tomorrow"] as DayView[]).map((view) => (
                <Button
                  key={view}
                  variant={dayView === view ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDayView(view)}
                  disabled={view === "tomorrow" && !apiData?.tomorrowPrices}
                  className="text-xs capitalize px-2 py-1 h-7"
                >
                  {view}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-2" : "p-2 sm:p-4"}>
        {/* Stats row */}
        <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
          <span>Min: <span className="font-medium text-primary">€{minPrice.toFixed(2)}</span></span>
          <span>Avg: <span className="font-medium">€{avgPrice.toFixed(2)}</span></span>
          <span>Max: <span className="font-medium text-destructive">€{maxPrice.toFixed(2)}</span></span>
        </div>

        {/* Chart */}
        <div style={{ height }}>
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  tickFormatter={(v) => `€${v}`}
                  width={45}
                  domain={[Math.floor(minPrice * 0.9), Math.ceil(maxPrice * 1.1)]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
                        <p className="text-sm font-bold text-foreground">{data.hour}</p>
                        <p className="text-lg font-bold text-primary">€{data.price.toFixed(2)}/MWh</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {data.price < avgPrice ? "Below" : "Above"} average
                        </p>
                      </div>
                    )
                  }}
                />
                {/* Average price reference line */}
                <ReferenceLine
                  y={avgPrice}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                {/* Current hour reference line (only for today) */}
                {dayView === "today" && (
                  <ReferenceLine
                    x={formatHour(currentHour)}
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />
                )}
                <Bar dataKey="price" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getPriceColor(entry.price, minPrice, maxPrice)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: "var(--q1-cheap)" }} />
            <span>Cheap</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: "var(--q3-average)" }} />
            <span>Average</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: "var(--q5-expensive)" }} />
            <span>Expensive</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
