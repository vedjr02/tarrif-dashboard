"use client"

import { useState, useMemo, useEffect } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts"
import { ChevronDown, Loader2 } from "lucide-react"
import type { DayPrices, DayTariffs, BackendStatus, Quintile } from "@/lib/types"
import { getPriceColor, getQuintileColor, QUINTILE_CONFIG } from "@/lib/types"
import { 
  RETAIL_TARIFFS, 
  getTariffRateForHour, 
  getTariffColor, 
  SUPPLIER_COLORS,
  type RetailTariff 
} from "@/lib/retailTariffs"

type DayView = "today" | "tomorrow" | "yesterday"

// Time-of-Use band definitions
const getTimeOfUseBand = (hour: number): { band: string; color: string } => {
  if (hour >= 23 || hour < 8) {
    return { band: "Night", color: "var(--q1-cheap)" }
  }
  if (hour >= 17 && hour < 19) {
    return { band: "Peak", color: "var(--q5-expensive)" }
  }
  if ((hour >= 8 && hour < 9) || (hour >= 19 && hour < 23)) {
    return { band: "Off-Peak", color: "var(--q2-below)" }
  }
  return { band: "Day", color: "var(--q3-average)" }
}

interface ScreenPriceAnalysisProps {
  todayPrices: DayPrices | null
  todayTariffs?: DayTariffs | null
  tomorrowPrices: DayPrices | null
  tomorrowTariffs?: DayTariffs | null
  yesterdayPrices: DayPrices | null
  yesterdayTariffs?: DayTariffs | null
  currentPeriodIndex: number
  backendStatus?: BackendStatus | null
}

function SourceBadge({ source }: { source?: string }) {
  if (!source || source === "Unknown") return null
  if (source === "SEMOPX" || source === "ENTSO-E") {
    return <span className="text-[9px] font-medium text-primary leading-none">LIVE</span>
  }
  return <span className="text-[9px] font-medium text-amber-500 leading-none">Est.</span>
}

export function ScreenPriceAnalysis({
  todayPrices,
  tomorrowPrices,
  yesterdayPrices,
  currentPeriodIndex,
  backendStatus,
}: ScreenPriceAnalysisProps) {
  const { resolvedTheme } = useTheme()
  const [dayView, setDayView] = useState<DayView>(() => todayPrices ? "today" : "yesterday")
  const [mounted, setMounted] = useState(false)
  const [selectedTariffs, setSelectedTariffs] = useState<Set<string>>(() => {
    // Initialize from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("adflex-selected-tariffs")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            return new Set(parsed)
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    return new Set(RETAIL_TARIFFS.map(t => t.id))
  })
  const [tariffTypeFilter, setTariffTypeFilter] = useState<"all" | "dynamic" | "fixed">(() => {
    if (typeof window !== 'undefined') {
      const savedFilter = localStorage.getItem("adflex-tariff-filter")
      if (savedFilter && ["all", "dynamic", "fixed"].includes(savedFilter)) {
        return savedFilter as "all" | "dynamic" | "fixed"
      }
    }
    return "all"
  })
  const [userChangedFilter, setUserChangedFilter] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Save tariff selections to localStorage when they change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("adflex-selected-tariffs", JSON.stringify([...selectedTariffs]))
    }
  }, [selectedTariffs, mounted])

  // Save filter to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("adflex-tariff-filter", tariffTypeFilter)
    }
  }, [tariffTypeFilter, mounted])

  // DAM line color based on theme
  const damLineColor = resolvedTheme === "dark" ? "#ffffff" : "#000000"

  const getSelectedPrices = () => {
    if (dayView === "tomorrow" && tomorrowPrices) return tomorrowPrices
    if (dayView === "yesterday" && yesterdayPrices) return yesterdayPrices
    return todayPrices
  }

  const selectedPrices = getSelectedPrices()

  // Get displayed date based on dayView
  const getDisplayDate = () => {
    const now = new Date()
    const targetDate = new Date(now)
    if (dayView === "yesterday") {
      targetDate.setDate(targetDate.getDate() - 1)
    } else if (dayView === "tomorrow") {
      targetDate.setDate(targetDate.getDate() + 1)
    }
    return targetDate.toLocaleDateString("en-IE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Dublin",
    })
  }

  // Filter tariffs by type (dynamic = tou/daynight/ev, fixed = flat)
  const filteredTariffs = useMemo(() => {
    if (tariffTypeFilter === "all") return RETAIL_TARIFFS
    if (tariffTypeFilter === "fixed") return RETAIL_TARIFFS.filter(t => t.type === "flat")
    return RETAIL_TARIFFS.filter(t => t.type !== "flat") // dynamic
  }, [tariffTypeFilter])

  // Update selectedTariffs when filter changes - only when user explicitly changes filter
  useEffect(() => {
    if (!mounted || !userChangedFilter) return
    setSelectedTariffs(new Set(filteredTariffs.map(t => t.id)))
    setUserChangedFilter(false)
  }, [tariffTypeFilter, filteredTariffs, mounted, userChangedFilter])

  // Group tariffs by supplier for dropdown
  const tariffsBySupplier = useMemo(() => {
    const grouped: Record<string, RetailTariff[]> = {}
    RETAIL_TARIFFS.forEach((tariff) => {
      if (!grouped[tariff.supplier]) {
        grouped[tariff.supplier] = []
      }
      grouped[tariff.supplier].push(tariff)
    })
    return grouped
  }, [])

  // Chart data: always 48 half-hourly slots; DAM price included when available
  // All values in c/kWh (EUR/MWh ÷ 10)
  const chartData = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const hour = Math.floor(i / 2)
      const minute = (i % 2) * 30
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`

      const damPeriod = selectedPrices?.periods[i]
      const semPriceEurMwh = damPeriod?.price_eur_mwh ?? undefined
      const semPrice = semPriceEurMwh !== undefined ? semPriceEurMwh / 10 : undefined

      const touBand = getTimeOfUseBand(hour)
      // Bar color: actual price quintile when DAM data available, fixed ToU band otherwise
      const barColor = damPeriod
        ? getPriceColor(damPeriod.price_eur_mwh, damPeriod.quintile as Quintile)
        : touBand.color
      const barTitle = damPeriod
        ? `${time} — €${damPeriod.price_eur_mwh.toFixed(0)}/MWh`
        : `${time} — ${touBand.band}`
      const dataPoint: Record<string, number | string | undefined> = {
        periodIdx: i,
        hour,
        time,
        semPriceEurMwh,
        semPrice,
        quintile: damPeriod?.quintile ?? 3,
        touBand: touBand.band,
        touColor: touBand.color,
        barColor,
        barTitle,
      }

      RETAIL_TARIFFS.forEach((tariff) => {
        dataPoint[`tariff_${tariff.id}`] = getTariffRateForHour(tariff, hour)
      })

      return dataPoint
    })
  }, [selectedPrices])

  // Calculate Y-axis domain (all values in c/kWh); DAM may be absent
  const { minY, maxY } = useMemo(() => {
    let min = Infinity
    let max = -Infinity

    chartData.forEach((d) => {
      const sem = d.semPrice as number | undefined
      if (sem !== undefined) {
        min = Math.min(min, sem)
        max = Math.max(max, sem)
      }
      RETAIL_TARIFFS.forEach((tariff) => {
        if (selectedTariffs.has(tariff.id)) {
          const val = d[`tariff_${tariff.id}`] as number
          min = Math.min(min, val)
          max = Math.max(max, val)
        }
      })
    })

    if (min === Infinity) return { minY: 0, maxY: 50 }
    const padding = (max - min) * 0.1
    return {
      minY: Math.max(0, min - padding),
      maxY: max + padding,
    }
  }, [chartData, selectedTariffs])

  // Average SEM price for the day (only when DAM data is available)
  const avgSemPrice = selectedPrices
    ? chartData.reduce((sum, d) => sum + ((d.semPrice as number | undefined) ?? 0), 0) / chartData.length
    : null

  // Toggle functions
  const toggleTariff = (id: string) => {
    const newSet = new Set(selectedTariffs)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedTariffs(newSet)
  }

  const toggleSupplier = (supplier: string) => {
    const supplierTariffs = tariffsBySupplier[supplier] || []
    const allSelected = supplierTariffs.every(t => selectedTariffs.has(t.id))
    
    const newSet = new Set(selectedTariffs)
    supplierTariffs.forEach(t => {
      if (allSelected) {
        newSet.delete(t.id)
      } else {
        newSet.add(t.id)
      }
    })
    setSelectedTariffs(newSet)
  }

  const selectAllTariffs = () => {
    setSelectedTariffs(new Set(RETAIL_TARIFFS.map(t => t.id)))
  }

  const deselectAllTariffs = () => {
    setSelectedTariffs(new Set())
  }

  const currentTimeStr = dayView === "today" ? chartData[currentPeriodIndex]?.time : null

  // Get type label for tariff
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "flat": return "24hr"
      case "daynight": return "Day/Night"
      case "tou": return "ToU"
      case "ev": return "EV"
      default: return type
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6 overflow-auto">
      {/* Header with Day Selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-2xl lg:text-3xl">
            Price Analysis
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm lg:text-base">
            DAM wholesale vs Irish retail tariffs (c/kWh) &middot; {getDisplayDate()}
          </p>
        </div>
        <div className="flex gap-1 border border-border rounded-lg p-1">
          <Button
            variant={dayView === "yesterday" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDayView("yesterday")}
            className="h-7 text-xs flex flex-col items-center gap-0 leading-none py-1"
          >
            Yesterday
            <SourceBadge source={backendStatus?.yesterday_source} />
          </Button>
          <Button
            variant={dayView === "today" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDayView("today")}
            className="h-7 text-xs flex flex-col items-center gap-0 leading-none py-1"
          >
            Today
            <SourceBadge source={backendStatus?.today_source} />
          </Button>
          <Button
            variant={dayView === "tomorrow" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDayView("tomorrow")}
            className="h-7 text-xs flex flex-col items-center gap-0 leading-none py-1"
          >
            Tomorrow
            <SourceBadge source={backendStatus?.tomorrow_source} />
          </Button>
        </div>
      </div>

      {/* Controls: Tariff Selector + Type Filter + Stats */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Tariff Type Filter */}
          <div className="flex gap-1 border border-border rounded-lg p-1">
            <Button
              variant={tariffTypeFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setUserChangedFilter(true)
                setTariffTypeFilter("all")
              }}
              className="h-7 text-xs"
            >
              All
            </Button>
            <Button
              variant={tariffTypeFilter === "dynamic" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setUserChangedFilter(true)
                setTariffTypeFilter("dynamic")
              }}
              className="h-7 text-xs"
            >
              Dynamic
            </Button>
            <Button
              variant={tariffTypeFilter === "fixed" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setUserChangedFilter(true)
                setTariffTypeFilter("fixed")
              }}
              className="h-7 text-xs"
            >
              Fixed
            </Button>
          </div>

          {/* Tariff Multi-Select Dropdown */}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <span>Retail Tariffs ({selectedTariffs.size}/{filteredTariffs.length})</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Select tariffs to compare</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={selectAllTariffs} className="h-6 text-xs px-2">
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllTariffs} className="h-6 text-xs px-2">
                  None
                </Button>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {Object.entries(tariffsBySupplier).map(([supplier, tariffs]) => {
              const allSelected = tariffs.every(t => selectedTariffs.has(t.id))
              
              return (
                <div key={supplier}>
                  <DropdownMenuCheckboxItem
                    checked={allSelected}
                    onCheckedChange={() => toggleSupplier(supplier)}
                    className="font-semibold"
                  >
                    <span 
                      className="mr-2 h-3 w-3 rounded-full inline-block"
                      style={{ backgroundColor: SUPPLIER_COLORS[supplier] }}
                    />
                    {supplier}
                  </DropdownMenuCheckboxItem>
                  
                  {tariffs.map((tariff, idx) => (
                    <DropdownMenuCheckboxItem
                      key={tariff.id}
                      checked={selectedTariffs.has(tariff.id)}
                      onCheckedChange={() => toggleTariff(tariff.id)}
                      className="pl-8 text-sm"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{tariff.planName}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {getTypeLabel(tariff.type)}
                        </span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {/* Average DAM price */}
        {avgSemPrice !== null && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <span className="text-xs text-muted-foreground">Avg DAM ({dayView}):</span>
            <span className="text-sm font-bold text-amber-600">{avgSemPrice.toFixed(2)} c/kWh</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <Card className="overflow-hidden flex flex-col flex-1 min-h-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">DAM Wholesale vs Retail Tariffs</CardTitle>
            {!selectedPrices && (
              <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
                DAM unavailable · retail tariffs only
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="w-full" style={{ height: '400px' }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 25, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="semGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />

                  <XAxis
                    dataKey="time"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    interval={5}
                  />
                  <YAxis
                    domain={[minY, maxY]}
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
                      const hasDam = data.semPriceEurMwh !== undefined
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg max-w-sm">
                          <p className="text-sm font-bold text-foreground">{data.time}</p>
                          {hasDam && (
                            <p className="text-xs text-muted-foreground mb-2">
                              DAM: {(data.semPriceEurMwh as number).toFixed(2)} €/MWh
                            </p>
                          )}
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {hasDam && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                                  DAM Wholesale:
                                </span>
                                <span className="text-xs font-bold text-amber-600">
                                  {(data.semPrice as number).toFixed(2)} c/kWh
                                </span>
                              </div>
                            )}
                            {RETAIL_TARIFFS.filter(t => selectedTariffs.has(t.id)).map((tariff, idx) => {
                              const color = getTariffColor(tariff, idx)
                              const rate = data[`tariff_${tariff.id}`] as number
                              return (
                                <div key={tariff.id} className="flex items-center justify-between gap-4">
                                  <span
                                    className="flex items-center gap-1.5 text-xs truncate"
                                    style={{ color }}
                                  >
                                    <span
                                      className="h-2 w-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: color }}
                                    />
                                    {tariff.supplier} {tariff.planName}:
                                  </span>
                                  <span
                                    className="text-xs font-bold flex-shrink-0"
                                    style={{ color }}
                                  >
                                    {rate.toFixed(2)} c/kWh
                                  </span>
                                </div>
                              )
                            })}
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

                  {/* DAM wholesale area — only when price data is available */}
                  {selectedPrices && (
                    <Area
                      type="monotone"
                      dataKey="semPrice"
                      stroke={damLineColor}
                      strokeWidth={2.5}
                      fill="url(#semGradient)"
                      dot={false}
                      name="DAM Wholesale"
                      connectNulls={false}
                    />
                  )}

                  {/* Retail tariff lines — always shown */}
                  {RETAIL_TARIFFS.filter(t => selectedTariffs.has(t.id)).map((tariff, i) => {
                    const color = getTariffColor(tariff, i)
                    const isFlat = tariff.type === "flat"
                    return (
                      <Line
                        key={tariff.id}
                        type={isFlat ? "monotone" : "stepAfter"}
                        dataKey={`tariff_${tariff.id}`}
                        stroke={color}
                        strokeWidth={isFlat ? 1.5 : 2}
                        strokeDasharray={isFlat ? "6 3" : undefined}
                        dot={false}
                        name={`${tariff.supplier} ${tariff.planName}`}
                      />
                    )
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {/* Price bar: quintile colors when DAM available, ToU bands otherwise */}
          {mounted && (
            <div className="mt-2 px-[35px] pr-[10px]">
              <div className="flex h-4 rounded overflow-hidden">
                {chartData.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex-1"
                    style={{ backgroundColor: point.barColor as string, opacity: 0.75 }}
                    title={point.barTitle as string}
                  />
                ))}
              </div>
              {selectedPrices ? (
                /* Quintile legend — reflects actual price distribution */
                <div className="flex justify-center gap-3 mt-2 text-xs">
                  {([1, 2, 3, 4, 5] as Quintile[]).map((q) => (
                    <div key={q} className="flex items-center gap-1">
                      <div className="h-2 w-3 rounded-sm" style={{ backgroundColor: getQuintileColor(q), opacity: 0.75 }} />
                      <span className="text-muted-foreground">{QUINTILE_CONFIG[q].signal}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Fixed ToU band legend — shown when no DAM data */
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  {[
                    { band: "Night", color: "var(--q1-cheap)" },
                    { band: "Off-Peak", color: "var(--q2-below)" },
                    { band: "Day", color: "var(--q3-average)" },
                    { band: "Peak", color: "var(--q5-expensive)" },
                  ].map((item) => (
                    <div key={item.band} className="flex items-center gap-1">
                      <div className="h-2 w-3 rounded-sm" style={{ backgroundColor: item.color, opacity: 0.75 }} />
                      <span className="text-muted-foreground">{item.band}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">
          <div className="h-2 w-5 bg-amber-500 rounded" />
          <span className="text-amber-600 font-medium">DAM Wholesale</span>
        </div>
        
        {/* Show supplier legend when many tariffs selected */}
        {selectedTariffs.size > 0 && (
          Object.entries(SUPPLIER_COLORS).map(([supplier, color]) => {
            const hasSelected = RETAIL_TARIFFS.some(t => 
              t.supplier === supplier && selectedTariffs.has(t.id)
            )
            if (!hasSelected) return null
            return (
              <div 
                key={supplier}
                className="flex items-center gap-1.5 px-2 py-1 rounded border"
                style={{ borderColor: color, backgroundColor: `${color}15` }}
              >
                <div 
                  className="h-2 w-5 rounded"
                  style={{ backgroundColor: color }}
                />
                <span style={{ color }} className="font-medium">{supplier}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
