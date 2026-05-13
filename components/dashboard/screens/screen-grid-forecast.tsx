"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts"
import { Loader2, Wind, Zap, Activity, AlertTriangle, Gauge, Thermometer, Droplets, Cloud, Sun, CloudRain, CloudSun, CloudFog } from "lucide-react"

interface WindDataPoint {
  timestamp: string
  windSpeed: number // km/h
  windDirection: number // degrees
  windGusts: number // km/h
}

interface GridStatus {
  frequency: number | null
  co2Intensity: number | null
  demand: number | null
}

interface WeatherData {
  temperature: number
  humidity: number
  precipitation: number
  cloudCover: number
  weatherCode: number
}

interface HourlyWeather {
  timestamp: string
  temperature: number
  precipitation: number
  cloudCover: number
  weatherCode: number
}

interface ApiResponse {
  windData: WindDataPoint[]
  gridStatus: GridStatus
  currentWeather: WeatherData | null
  hourlyWeather: HourlyWeather[]
  fetchedAt: string
  hasWindData: boolean
  hasGridData: boolean
  hasWeatherData?: boolean
  hasHourlyWeather?: boolean
  windError?: boolean
  gridError?: boolean
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

// Wind direction to cardinal direction
const getWindDirection = (degrees: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

// WMO Weather codes to icon and description
const getWeatherInfo = (code: number): { icon: typeof Sun; description: string } => {
  if (code === 0) return { icon: Sun, description: "Clear" }
  if (code <= 3) return { icon: CloudSun, description: "Partly cloudy" }
  if (code <= 49) return { icon: CloudFog, description: "Foggy" }
  if (code <= 69) return { icon: CloudRain, description: "Rain" }
  if (code <= 79) return { icon: Cloud, description: "Snow" }
  if (code <= 99) return { icon: CloudRain, description: "Thunderstorm" }
  return { icon: Cloud, description: "Cloudy" }
}

export function ScreenGridForecast({ currentPeriodIndex }: ScreenGridForecastProps) {
  const [mounted, setMounted] = useState(false)
  const [lastValidWindData, setLastValidWindData] = useState<WindDataPoint[]>([])
  const [lastValidGridStatus, setLastValidGridStatus] = useState<GridStatus | null>(null)
  const [lastWindDataTime, setLastWindDataTime] = useState<string | null>(null)
  const [lastGridDataTime, setLastGridDataTime] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useSWR<ApiResponse>("/api/eirgrid", fetcher, {
    refreshInterval: 30000, // Poll every 30 seconds
    revalidateOnFocus: true,
  })
  
  // Store last valid data when we receive it
  useEffect(() => {
    if (data?.hasWindData && data.windData.length > 0) {
      setLastValidWindData(data.windData)
      setLastWindDataTime(data.fetchedAt)
    }
    if (data?.hasGridData) {
      setLastValidGridStatus(data.gridStatus)
      setLastGridDataTime(data.fetchedAt)
    }
  }, [data])
  
  // Use current data if available, otherwise use last valid data
  const displayWindData = data?.hasWindData ? data.windData : lastValidWindData
  const displayGridStatus = data?.hasGridData ? data.gridStatus : lastValidGridStatus
  const isGridError = data?.gridError && !data?.hasGridData

  // Get current hour in Dublin
  const currentHour = useMemo(() => {
    const now = new Date()
    return parseInt(
      now.toLocaleString("en-IE", { hour: "2-digit", hour12: false, timeZone: "Europe/Dublin" })
    )
  }, [])



  // Get current wind data
  const currentWindData = useMemo(() => {
    if (!displayWindData.length) return null
    const now = new Date()
    const currentHourStr = now.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    }).slice(0, 2) + ":00"
    
    return displayWindData.find(d => {
      const windHour = new Date(d.timestamp).toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit", 
        hour12: false,
        timeZone: "Europe/Dublin",
      }).slice(0, 2) + ":00"
      return windHour === currentHourStr
    }) || displayWindData[displayWindData.length - 1]
  }, [displayWindData])

  // Process wind data for chart
  const chartData = useMemo(() => {
    if (!displayWindData.length) return []

    return displayWindData.map((point, idx) => {
      const date = new Date(point.timestamp)
      const hour = date.getHours()
      const band = getTimeOfUseBand(hour)

      return {
        idx, // unique index for each data point
        time: date.toLocaleTimeString("en-IE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Dublin",
        }),
        fullTime: date.toLocaleString("en-IE", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Dublin",
        }),
        windSpeed: point.windSpeed,
        windGusts: point.windGusts,
        windDirection: point.windDirection,
        hour,
        band: band.band,
        bandColor: band.color,
        timestamp: point.timestamp, // keep original timestamp
      }
    })
  }, [displayWindData])

  // Find the current hour index in displayWindData (for NOW reference line)
  const currentHourIndex = useMemo(() => {
    if (!displayWindData.length) return -1
    const now = new Date()
    const nowHour = now.toLocaleString("en-IE", {
      year: "numeric",
      month: "2-digit", 
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    })
    // Find the index of the current hour in the data
    const idx = displayWindData.findIndex(d => {
      const dataHour = new Date(d.timestamp).toLocaleString("en-IE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit", 
        hour: "2-digit",
        hour12: false,
        timeZone: "Europe/Dublin",
      })
      return dataHour === nowHour
    })
    return idx
  }, [displayWindData])
  

  
  // Format last data time for display
  const formatDataTime = (isoString: string | null) => {
    if (!isoString) return null
    const date = new Date(isoString)
    return date.toLocaleString("en-IE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Dublin",
    })
  }

  return (
    <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:gap-6 lg:p-8 overflow-auto h-full">
      {/* Grid Server Error Warning */}
      {isGridError && lastGridDataTime && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-xs sm:text-sm">
            EirGrid server unavailable - grid data from {formatDataTime(lastGridDataTime)}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-2xl lg:text-3xl">
            Grid & Wind Forecast
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm lg:text-base">
            Wind speed forecast and grid status for Ireland
          </p>
        </div>
        {lastWindDataTime && (
          <div className="text-xs text-muted-foreground">
            Wind data: {formatDataTime(lastWindDataTime)}
          </div>
        )}
      </div>

      {/* Status Cards - Grid & Weather */}
      <TooltipProvider>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 sm:gap-3 lg:gap-4">
          {/* Current Wind Speed */}
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 cursor-help" style={{ borderLeftColor: "var(--q1-cheap)" }}>
                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Wind className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Wind Speed</span>
                  </div>
                  <div className="text-lg font-bold sm:text-xl lg:text-2xl">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : currentWindData ? (
                      `${Math.round(currentWindData.windSpeed)} km/h`
                    ) : (
                      "--"
                    )}
                  </div>
                  {currentWindData && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {getWindDirection(currentWindData.windDirection)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Current wind speed in Dublin. Higher wind speeds typically mean more renewable energy in the grid and lower prices.</p>
            </TooltipContent>
          </UITooltip>

          {/* Wind Gusts */}
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 cursor-help" style={{ borderLeftColor: "var(--q2-below)" }}>
                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Gauge className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Gusts</span>
                  </div>
                  <div className="text-lg font-bold sm:text-xl lg:text-2xl">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : currentWindData ? (
                      `${Math.round(currentWindData.windGusts)} km/h`
                    ) : (
                      "--"
                    )}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Maximum wind gusts. Strong gusts can cause turbines to shut down for safety, potentially reducing wind generation.</p>
            </TooltipContent>
          </UITooltip>

          {/* Grid Frequency */}
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 cursor-help" style={{ borderLeftColor: "var(--q4-above)" }}>
                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Frequency</span>
                  </div>
                  <div className="text-lg font-bold sm:text-xl lg:text-2xl">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : displayGridStatus?.frequency != null ? (
                      `${displayGridStatus.frequency.toFixed(2)} Hz`
                    ) : (
                      "--"
                    )}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Grid frequency must stay at 50 Hz. Values above 50 Hz mean excess generation, below 50 Hz means high demand. From EirGrid.</p>
            </TooltipContent>
          </UITooltip>

          {/* Grid Demand */}
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 cursor-help" style={{ borderLeftColor: "var(--q3-average)" }}>
                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Demand</span>
                  </div>
                  <div className="text-lg font-bold sm:text-xl lg:text-2xl">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : displayGridStatus?.demand != null ? (
                      `${Math.round(displayGridStatus.demand)} MW`
                    ) : (
                      "--"
                    )}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Total electricity demand in Ireland. High demand typically means higher prices. From EirGrid Smart Grid Dashboard.</p>
            </TooltipContent>
          </UITooltip>

          {/* Temperature */}
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 cursor-help" style={{ borderLeftColor: "#f97316" }}>
                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Thermometer className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Temp</span>
                  </div>
                  <div className="text-lg font-bold sm:text-xl lg:text-2xl">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : data?.currentWeather ? (
                      `${Math.round(data.currentWeather.temperature)}°C`
                    ) : (
                      "--"
                    )}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Current temperature in Dublin. Cold weather increases heating demand, warm weather may increase cooling demand.</p>
            </TooltipContent>
          </UITooltip>

          {/* Humidity */}
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 cursor-help" style={{ borderLeftColor: "#3b82f6" }}>
                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Droplets className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Humidity</span>
                  </div>
                  <div className="text-lg font-bold sm:text-xl lg:text-2xl">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : data?.currentWeather ? (
                      `${Math.round(data.currentWeather.humidity)}%`
                    ) : (
                      "--"
                    )}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Current relative humidity in Dublin.</p>
            </TooltipContent>
          </UITooltip>

          {/* Cloud Cover */}
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 cursor-help" style={{ borderLeftColor: "#94a3b8" }}>
                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Cloud className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Clouds</span>
                  </div>
                  <div className="text-lg font-bold sm:text-xl lg:text-2xl">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : data?.currentWeather ? (
                      `${Math.round(data.currentWeather.cloudCover)}%`
                    ) : (
                      "--"
                    )}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Cloud cover affects solar energy generation. Lower cloud cover means more solar power potential.</p>
            </TooltipContent>
          </UITooltip>
        </div>
      </TooltipProvider>

      {/* 24-Hour Weather Forecast */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            24-Hour Weather Forecast (Dublin)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {data?.hourlyWeather ? (
              (() => {
                // Filter to show next 24 hours starting from current hour
                const now = new Date()
                const currentHourTimestamp = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                  now.getHours()
                ).getTime()
                
                const next24Hours = data.hourlyWeather
                  .filter(h => new Date(h.timestamp).getTime() >= currentHourTimestamp)
                  .slice(0, 24)
                
                return next24Hours.map((hour, idx) => {
                  const date = new Date(hour.timestamp)
                  const hourStr = date.toLocaleTimeString("en-IE", {
                    hour: "2-digit",
                    hour12: false,
                    timeZone: "Europe/Dublin",
                  })
                  const WeatherIcon = getWeatherInfo(hour.weatherCode).icon
                  const isNow = idx === 0
                  
                  return (
                    <div
                      key={hour.timestamp}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] ${
                        isNow ? "bg-primary/10 border border-primary" : "bg-muted/30"
                      }`}
                    >
                      <span className={`text-xs font-medium ${isNow ? "text-primary" : "text-muted-foreground"}`}>
                        {isNow ? "Now" : hourStr}
                      </span>
                      <WeatherIcon className={`h-5 w-5 ${isNow ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-bold">{Math.round(hour.temperature)}°</span>
                      {hour.precipitation > 0 && (
                        <span className="text-xs text-blue-500">{hour.precipitation.toFixed(1)}mm</span>
                      )}
                      <span className="text-xs text-muted-foreground">{hour.cloudCover}%</span>
                    </div>
                  )
                })
              })()
            ) : (
              <div className="flex items-center justify-center w-full py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Temperature (°C)</span>
            <span className="text-blue-500">Precipitation (mm)</span>
            <span>Cloud Cover (%)</span>
          </div>
        </CardContent>
      </Card>

      {/* Wind Speed Forecast Chart */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Wind className="h-4 w-4" />
            Wind Speed Forecast (Dublin)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-2 sm:p-4">
          <div className="w-full h-[250px] sm:h-[300px] lg:h-[350px] relative">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="windSpeedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--q1-cheap)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--q1-cheap)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="windGustsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--q4-above)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--q4-above)" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="idx"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    interval={7}
                    tickFormatter={(idx) => chartData[idx]?.time ?? ""}
                  />

                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(v)}`}
                    width={35}
                    label={{
                      value: "km/h",
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
                          <p className="text-sm font-bold text-foreground">{data.fullTime}</p>
                          <div
                            className="text-xs px-2 py-0.5 rounded-full mt-1 mb-2 inline-block text-white"
                            style={{ backgroundColor: data.bandColor }}
                          >
                            {data.band}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs" style={{ color: "var(--q1-cheap)" }}>
                                Wind:
                              </span>
                              <span className="text-xs font-bold">
                                {Math.round(data.windSpeed)} km/h {getWindDirection(data.windDirection)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs" style={{ color: "var(--q4-above)" }}>
                                Gusts:
                              </span>
                              <span className="text-xs font-bold">
                                {Math.round(data.windGusts)} km/h
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  />

                  {/* Wind gusts - background area */}
                  <Area
                    type="monotone"
                    dataKey="windGusts"
                    stroke="var(--q4-above)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    fill="url(#windGustsGradient)"
                    name="Gusts"
                  />

                  {/* Wind speed - main area */}
                  <Area
                    type="monotone"
                    dataKey="windSpeed"
                    stroke="var(--q1-cheap)"
                    strokeWidth={2}
                    fill="url(#windSpeedGradient)"
                    name="Wind Speed"
                  />

                  {/* NOW reference line - rendered last so it appears on top */}
                  {currentHourIndex >= 0 && (
                    <ReferenceLine
                      x={currentHourIndex}
                      stroke="white"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      label={{
                        value: "NOW",
                        position: "top",
                        fill: "white",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    />
                  )}
                </AreaChart>
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
