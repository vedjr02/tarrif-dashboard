"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { ChevronDown, Loader2 } from "lucide-react"
import type { DayPrices, DayTariffs, Quintile } from "@/lib/types"
import { getPriceColor } from "@/lib/types"

type DayView = "today" | "tomorrow" | "yesterday"

// Retail tariffs from CRU data (c/kWh, VAT inclusive) - exact values from user spec
const RETAIL_TARIFFS = [
  { id: "energia", name: "Energia Standard", unitRate: 24.88, standingCharge: 56.15, color: "#ef4444" },
  { id: "bordgais", name: "Bord Gáis Standard", unitRate: 25.12, standingCharge: 54.00, color: "#f97316" },
  { id: "electricireland", name: "Electric Ireland Standard", unitRate: 26.40, standingCharge: 55.00, color: "#3b82f6" },
  { id: "sse", name: "SSE Airtricity Standard", unitRate: 25.60, standingCharge: 52.00, color: "#8b5cf6" },
]

interface ScreenPriceAnalysisProps {
  todayPrices: DayPrices
  todayTariffs?: DayTariffs | null
  tomorrowPrices: DayPrices | null
  tomorrowTariffs?: DayTariffs | null
  yesterdayPrices: DayPrices | null
  yesterdayTariffs?: DayTariffs | null
  currentPeriodIndex: number
}

export function ScreenPriceAnalysis({
  todayPrices,
  tomorrowPrices,
  yesterdayPrices,
  currentPeriodIndex,
}: ScreenPriceAnalysisProps) {
  const [dayView, setDayView] = useState<DayView>("today")
  const [mounted, setMounted] = useState(false)
  const [renewMargin, setRenewMargin] = useState(2.0) // c/kWh margin, editable
  const [selectedTariffs, setSelectedTariffs] = useState<Set<string>>(
    new Set(RETAIL_TARIFFS.map(t => t.id)) // All selected by default
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const getSelectedPrices = () => {
    if (dayView === "tomorrow" && tomorrowPrices) return tomorrowPrices
    if (dayView === "yesterday" && yesterdayPrices) return yesterdayPrices
    return todayPrices
  }

  const selectedPrices = getSelectedPrices()

  // Chart data: all values in c/kWh
  // Renew formula: (SEM EUR/MWh / 10) + margin = c/kWh
  const chartData = useMemo(() => {
    if (!selectedPrices?.periods) return []
    
    return selectedPrices.periods.map((period, idx) => {
      const date = new Date(period.start_time_dublin)
      const semPriceEurMwh = period.price_eur_mwh
      
      // Renew price formula: (SEM EUR/MWh / 10) + margin = c/kWh
      const renewPriceCents = (semPriceEurMwh / 10) + renewMargin
      
      const dataPoint: Record<string, number | string> = {
        periodIdx: idx,
        time: date.toLocaleTimeString("en-IE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Dublin",
        }),
        semPrice: semPriceEurMwh,
        renewPrice: renewPriceCents, // c/kWh
        quintile: period.quintile,
      }

      // Add retail tariff prices (flat rates in c/kWh)
      RETAIL_TARIFFS.forEach((tariff) => {
        dataPoint[`tariff_${tariff.id}`] = tariff.unitRate
      })

      return dataPoint
    })
  }, [selectedPrices, renewMargin])

  // Calculate Y-axis domain (all values in c/kWh)
  const allValues = chartData.flatMap((d) => {
    const vals = [d.renewPrice as number]
    RETAIL_TARIFFS.forEach((t) => {
      if (selectedTariffs.has(t.id)) {
        vals.push(d[`tariff_${t.id}`] as number)
      }
    })
    return vals
  })
  const minY = Math.min(...allValues) || 0
  const maxY = Math.max(...allValues) || 30
  const padding = (maxY - minY) * 0.1

  // Average Renew price for the day
  const avgRenewPrice = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + (d.renewPrice as number), 0) / chartData.length 
    : 0

  // Toggle tariff selection
  const toggleTariff = (id: string) => {
    const newSet = new Set(selectedTariffs)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedTariffs(newSet)
  }

  const selectAllTariffs = () => {
    setSelectedTariffs(new Set(RETAIL_TARIFFS.map(t => t.id)))
  }

  const deselectAllTariffs = () => {
    setSelectedTariffs(new Set())
  }

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6 overflow-auto">
      {/* Header with Day Selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-2xl lg:text-3xl">
            Price Analysis
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm lg:text-base">
            Renew dynamic tariff vs retail providers (c/kWh)
          </p>
        </div>
        <div className="flex gap-1 border border-border rounded-lg p-1">
          <Button
            variant={dayView === "yesterday" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDayView("yesterday")}
            disabled={!yesterdayPrices}
            className="h-7 text-xs"
          >
            Yesterday
          </Button>
          <Button
            variant={dayView === "today" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDayView("today")}
            className="h-7 text-xs"
          >
            Today
          </Button>
          <Button
            variant={dayView === "tomorrow" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDayView("tomorrow")}
            disabled={!tomorrowPrices}
            className="h-7 text-xs"
          >
            Tomorrow
          </Button>
        </div>
      </div>

      {/* Controls: Renew Margin + Tariff Selector */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Renew Margin Input */}
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="margin" className="text-xs text-muted-foreground">
                  Renew margin (c/kWh)
                </Label>
                <Input
                  id="margin"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={renewMargin}
                  onChange={(e) => setRenewMargin(parseFloat(e.target.value) || 0)}
                  className="h-8 w-24 text-sm"
                />
              </div>
              <div className="text-xs text-muted-foreground pb-1.5">
                Formula: (SEM €/MWh ÷ 10) + margin
              </div>
            </div>

            {/* Tariff Multi-Select Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <span>Retail Tariffs ({selectedTariffs.size}/{RETAIL_TARIFFS.length})</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Compare with retail tariffs</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="flex gap-2 px-2 py-1.5">
                  <Button variant="ghost" size="sm" onClick={selectAllTariffs} className="h-6 text-xs flex-1">
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllTariffs} className="h-6 text-xs flex-1">
                    Clear
                  </Button>
                </div>
                <DropdownMenuSeparator />
                {RETAIL_TARIFFS.map((tariff) => (
                  <DropdownMenuCheckboxItem
                    key={tariff.id}
                    checked={selectedTariffs.has(tariff.id)}
                    onCheckedChange={() => toggleTariff(tariff.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tariff.color }}
                      />
                      <span className="flex-1">{tariff.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {tariff.unitRate} c/kWh
                      </span>
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        <Card className="bg-amber-500/10 border-amber-500">
          <CardContent className="p-2 sm:p-3">
            <div className="text-xs text-muted-foreground">Avg Renew ({dayView})</div>
            <div className="text-lg font-bold text-amber-600 sm:text-xl">
              {avgRenewPrice.toFixed(2)} c/kWh
            </div>
          </CardContent>
        </Card>
        {RETAIL_TARIFFS.map((tariff) => (
          <Card 
            key={tariff.id} 
            className="border"
            style={{ borderColor: selectedTariffs.has(tariff.id) ? tariff.color : undefined }}
          >
            <CardContent className="p-2 sm:p-3">
              <div className="text-xs text-muted-foreground truncate">{tariff.name}</div>
              <div 
                className="text-lg font-bold sm:text-xl" 
                style={{ color: selectedTariffs.has(tariff.id) ? tariff.color : 'var(--muted-foreground)' }}
              >
                {tariff.unitRate} c/kWh
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="overflow-hidden flex flex-col flex-1 min-h-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Renew vs Retail Tariffs (c/kWh)</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
          <div className="w-full h-full min-h-[250px]">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    interval={5}
                  />
                  <YAxis
                    domain={[Math.max(0, minY - padding), maxY + padding]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    tickFormatter={(value) => `${value.toFixed(0)}`}
                    width={35}
                    label={{ 
                      value: 'c/kWh', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fontSize: 10, fill: 'var(--muted-foreground)' }
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                          <p className="text-sm font-bold text-foreground">{data.time}</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            SEM: {(data.semPrice as number).toFixed(2)} €/MWh
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                Renew:
                              </span>
                              <span className="text-xs font-bold text-amber-600">
                                {(data.renewPrice as number).toFixed(2)} c/kWh
                              </span>
                            </div>
                            {RETAIL_TARIFFS.filter(t => selectedTariffs.has(t.id)).map((tariff) => (
                              <div key={tariff.id} className="flex items-center justify-between gap-4">
                                <span 
                                  className="flex items-center gap-1.5 text-xs"
                                  style={{ color: tariff.color }}
                                >
                                  <span 
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: tariff.color }}
                                  />
                                  {tariff.name}:
                                </span>
                                <span 
                                  className="text-xs font-bold"
                                  style={{ color: tariff.color }}
                                >
                                  {tariff.unitRate.toFixed(2)} c/kWh
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }}
                  />

                  {/* Current time reference line */}
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

                  {/* Renew price line (dynamic, always shown, bold amber) */}
                  <Line
                    type="stepAfter"
                    dataKey="renewPrice"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                    name="Renew"
                  />

                  {/* Retail tariff lines (flat horizontal, user-selectable, dashed) */}
                  {RETAIL_TARIFFS.filter(t => selectedTariffs.has(t.id)).map((tariff) => (
                    <Line
                      key={tariff.id}
                      type="monotone"
                      dataKey={`tariff_${tariff.id}`}
                      stroke={tariff.color}
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      name={tariff.name}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-6 bg-amber-500 rounded" />
          <span className="text-muted-foreground">Renew (dynamic)</span>
        </div>
        {RETAIL_TARIFFS.filter(t => selectedTariffs.has(t.id)).map((tariff) => (
          <div key={tariff.id} className="flex items-center gap-1.5">
            <div 
              className="h-0.5 w-6 rounded"
              style={{ 
                backgroundColor: tariff.color,
                backgroundImage: `repeating-linear-gradient(90deg, ${tariff.color} 0px, ${tariff.color} 8px, transparent 8px, transparent 12px)`
              }} 
            />
            <span className="text-muted-foreground">{tariff.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
