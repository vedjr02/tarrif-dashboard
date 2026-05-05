"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Area,
  AreaChart,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts"
import { Loader2, Wind, Zap, Leaf, Activity } from "lucide-react"

interface WindDataPoint {
  timestamp: string
  actual: number | null
  forecast: number | null
}

interface GridStatus {
  frequency: number | null
  co2Intensity: number | null
  renewablePercent: number | null
  windGeneration: number | null
  totalGeneration: number | null
  demand: number | null
}

interface EirGridResponse {
  windData: WindDataPoint[]
  gridStatus: GridStatus
  fetchedAt: string
  error?: string
}

interface ScreenGridForecastProps {
  currentPeriodIndex: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Time-of-Use band definitions for Ireland
const getTimeOfUseBand = (hour: number): { band: string; color: string; bgColor: string } => {
  if (hour >= 23 || hour < 8) {
    return { band: "Night", color: "var(--q1-cheap)", bgColor: "var(--q1-cheap)" }
  }
  if (hour >= 17 && hour < 19) {
    return { band: "Peak", color: "var(--q5-expensive)", bgColor: "var(--q5-expensive)" }
  }
  if ((hour >= 8 && hour < 9) || (hour >= 19 && hour < 23)) {
    return { band: "Off-Peak", color: "var(--q2-below)", bgColor: "var(--q2-below)" }
  }
  return { band: "Day", color: "var(--q3-average)", bgColor: "var(--q3-average)" }
}

export function ScreenGridForecast({ currentPeriodIndex }: ScreenGridForecastProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useSWR<EirGridResponse>("/api/eirgrid", fetcher, {
    refreshInterval: 300000, // 5 minutes
    revalidateOnFocus: true,
  })

  // Get current hour in Dublin
  const currentHour = useMemo(() => {
    const now = new Date()
    return parseInt(
      now.toLocaleString("en-IE", { hour: "2-digit", hour12: false, timeZone: "Europe/Dublin" })
    )
  }, [])

  const currentBand = getTimeOfUseBand(currentHour)

  // Process wind data for chart
  const chartData = useMemo(() => {
    if (!data?.windData) return []

    return data.windData.map((point) => {
      const date = new Date(point.timestamp)
      const hour = date.getHours()
      const band = getTimeOfUseBand(hour)

      return {
        time: date.toLocaleTimeString("en-IE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Dublin",
        }),
        actual: point.actual,
        forecast: point.forecast,
        hour,
        band: band.band,
        bandColor: band.color,
      }
    })
  }, [data?.windData])

  // Get current time string for reference line
  const currentTimeStr = useMemo(() => {
    const now = new Date()
    return now.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    })
  }, [])

  const gridStatus = data?.gridStatus

  return (
    <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:gap-6 lg:p-8 overflow-auto h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-2xl lg:text-3xl">
            Grid & Forecast
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm lg:text-base">
            Real-time grid status and wind generation forecast
          </p>
        </div>
      </div>

      {/* Time-of-Use Bands Visual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base">Time-of-Use Bands</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {/* Current band indicator */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="px-4 py-2 rounded-full text-white font-bold text-sm sm:text-base"
              style={{ backgroundColor: currentBand.color }}
            >
              {currentBand.band}
            </div>
            <span className="text-muted-foreground text-xs sm:text-sm">
              {currentHour}:00 - {(currentHour + 1) % 24}:00
            </span>
          </div>

          {/* 24-hour band visualization */}
          <div className="flex h-8 sm:h-10 rounded-lg overflow-hidden">
            {Array.from({ length: 24 }, (_, hour) => {
              const band = getTimeOfUseBand(hour)
              const isCurrentHour = hour === currentHour
              return (
                <div
                  key={hour}
                  className="flex-1 relative transition-all"
                  style={{
                    backgroundColor: band.bgColor,
                    opacity: isCurrentHour ? 1 : 0.6,
                  }}
                  title={`${hour}:00 - ${band.band}`}
                >
                  {isCurrentHour && (
                    <div className="absolute inset-0 border-2 border-white rounded-sm" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs sm:text-sm">
            {[
              { band: "Night", hours: "23:00-08:00", color: "var(--q1-cheap)" },
              { band: "Off-Peak", hours: "08:00-09:00, 19:00-23:00", color: "var(--q2-below)" },
              { band: "Day", hours: "09:00-17:00", color: "var(--q3-average)" },
              { band: "Peak", hours: "17:00-19:00", color: "var(--q5-expensive)" },
            ].map((item) => (
              <div key={item.band} className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.band}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:gap-4">
        <Card className="border-l-4" style={{ borderLeftColor: "var(--q1-cheap)" }}>
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wind className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Wind</span>
            </div>
            <div className="text-lg font-bold sm:text-xl lg:text-2xl">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : gridStatus?.windGeneration != null ? (
                `${Math.round(gridStatus.windGeneration)} MW`
              ) : (
                "--"
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: "var(--q2-below)" }}>
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Leaf className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Renewable</span>
            </div>
            <div className="text-lg font-bold sm:text-xl lg:text-2xl">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : gridStatus?.renewablePercent != null ? (
                `${gridStatus.renewablePercent.toFixed(0)}%`
              ) : (
                "--"
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: "var(--q4-above)" }}>
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Frequency</span>
            </div>
            <div className="text-lg font-bold sm:text-xl lg:text-2xl">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : gridStatus?.frequency != null ? (
                `${gridStatus.frequency.toFixed(2)} Hz`
              ) : (
                "--"
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: "var(--q3-average)" }}>
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Demand</span>
            </div>
            <div className="text-lg font-bold sm:text-xl lg:text-2xl">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : gridStatus?.demand != null ? (
                `${Math.round(gridStatus.demand)} MW`
              ) : (
                "--"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wind Forecast Chart */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Wind className="h-4 w-4" />
            Wind Generation - Actual vs Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-2 sm:p-4">
          <div className="w-full h-[250px] sm:h-[300px] lg:h-[350px] relative">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="windActualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--q1-cheap)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--q1-cheap)" stopOpacity={0} />
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
                    tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(v)}`}
                    width={45}
                    label={{
                      value: "MW",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 10, fill: "var(--muted-foreground)" },
                    }}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
                          <p className="text-sm font-bold text-foreground">{data.time}</p>
                          <div
                            className="text-xs px-2 py-0.5 rounded-full mt-1 mb-2 inline-block text-white"
                            style={{ backgroundColor: data.bandColor }}
                          >
                            {data.band}
                          </div>
                          <div className="space-y-1">
                            {data.actual != null && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs" style={{ color: "var(--q1-cheap)" }}>
                                  Actual:
                                </span>
                                <span className="text-xs font-bold">
                                  {Math.round(data.actual)} MW
                                </span>
                              </div>
                            )}
                            {data.forecast != null && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-muted-foreground">Forecast:</span>
                                <span className="text-xs font-bold text-muted-foreground">
                                  {Math.round(data.forecast)} MW
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }}
                  />

                  <ReferenceLine
                    x={currentTimeStr}
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />

                  {/* Actual wind - filled area */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--q1-cheap)"
                    strokeWidth={2}
                    fill="url(#windActualGradient)"
                    name="Actual"
                  />

                  {/* Forecast wind - dashed line */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Forecast"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
