"use client"

import { useState, useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, TrendingUp } from "lucide-react"
import type { HistoryDay } from "@/lib/types"

interface HistoricalViewProps {
  historyData: HistoryDay[]
}

type DateRange = "7d" | "14d" | "30d"

export function HistoricalView({ historyData }: HistoricalViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>("14d")

  const filteredData = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "14d" ? 14 : 30
    return historyData.slice(-days).map((day) => ({
      ...day,
      date: new Date(day.date).toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
      }),
      fullDate: day.date,
    }))
  }, [historyData, dateRange])

  // Calculate weekday vs weekend averages
  const weekdayAvg = useMemo(() => {
    const weekdays = filteredData.filter((d) => d.day_type === "weekday")
    if (weekdays.length === 0) return 0
    return weekdays.reduce((sum, d) => sum + d.avg, 0) / weekdays.length
  }, [filteredData])

  const weekendAvg = useMemo(() => {
    const weekends = filteredData.filter((d) => d.day_type === "weekend")
    if (weekends.length === 0) return 0
    return weekends.reduce((sum, d) => sum + d.avg, 0) / weekends.length
  }, [filteredData])

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          Historical Analysis
        </h2>
        <div className="flex gap-1">
          {(["7d", "14d", "30d"] as DateRange[]).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(range)}
              className="h-8"
            >
              {range === "7d" ? "7 Days" : range === "14d" ? "14 Days" : "30 Days"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Average Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Average Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    tickFormatter={(value) => `€${value.toFixed(0)}`}
                    width={45}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                          <p className="text-sm font-medium text-foreground">{data.fullDate}</p>
                          <p className="text-lg font-bold text-foreground">
                            Avg: €{data.avg.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Min: €{data.min.toFixed(2)} | Max: €{data.max.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {data.day_type}
                            {data.holiday && " (Holiday)"}
                          </p>
                        </div>
                      )
                    }}
                  />
                  {/* Min/Max shadow band */}
                  <Area
                    type="monotone"
                    dataKey="max"
                    stroke="transparent"
                    fill="var(--muted)"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="min"
                    stroke="transparent"
                    fill="var(--background)"
                  />
                  {/* Average line */}
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#avgGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekday vs Weekend Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Weekday vs Weekend Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Weekday", avg: weekdayAvg, fill: "var(--primary)" },
                    { name: "Weekend", avg: weekendAvg, fill: "var(--muted-foreground)" },
                  ]}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    tickFormatter={(value) => `€${value.toFixed(0)}`}
                    width={45}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                          <p className="text-sm font-medium text-foreground">{data.name}</p>
                          <p className="text-lg font-bold text-foreground">
                            €{data.avg.toFixed(2)}/MWh
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary" />
                <span className="text-muted-foreground">
                  Weekday: <span className="font-semibold text-foreground">€{weekdayAvg.toFixed(2)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-muted-foreground" />
                <span className="text-muted-foreground">
                  Weekend: <span className="font-semibold text-foreground">€{weekendAvg.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Price Heatmap Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {filteredData.map((day, index) => {
              // Calculate quintile based on price relative to the period's data
              const avgPrices = filteredData.map((d) => d.avg)
              const sorted = [...avgPrices].sort((a, b) => a - b)
              const quintile = Math.min(
                5,
                Math.ceil(((sorted.indexOf(day.avg) + 1) / sorted.length) * 5)
              ) as 1 | 2 | 3 | 4 | 5

              const colors: Record<number, string> = {
                1: "var(--q1-cheap)",
                2: "var(--q2-below)",
                3: "var(--q3-average)",
                4: "var(--q4-above)",
                5: "var(--q5-expensive)",
              }

              return (
                <div
                  key={index}
                  className="group relative h-10 w-10 cursor-pointer rounded-md transition-transform hover:scale-110"
                  style={{ backgroundColor: colors[quintile] }}
                  title={`${day.fullDate}: €${day.avg.toFixed(2)} avg`}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                    {new Date(day.fullDate).getDate()}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Cheap</span>
            {[1, 2, 3, 4, 5].map((q) => (
              <div
                key={q}
                className="h-3 w-6 rounded"
                style={{
                  backgroundColor: `var(--q${q}-${
                    q === 1 ? "cheap" : q === 2 ? "below" : q === 3 ? "average" : q === 4 ? "above" : "expensive"
                  })`,
                }}
              />
            ))}
            <span>Expensive</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
