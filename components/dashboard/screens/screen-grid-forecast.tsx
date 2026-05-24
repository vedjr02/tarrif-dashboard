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
  const [lastValidWindData, setLastValidWindData] = useState<WindDataPoint[]>([])
  const [lastValidGridStatus, setLastValidGridStatus] = useState<GridStatus | null>(null)
  const [lastWindDataTime, setLastWindDataTime] = useState<string | null>(null)
  const [lastGridDataTime, setLastGridDataTime] = useState<string | null>(null)

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

      {/* 12-Hour Weather & Wind Forecast */}
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            12-Hour Weather & Wind Forecast (Dublin)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12 sm:gap-3">
            {data?.hourlyWeather && displayWindData.length > 0 ? (
              (() => {
                // Filter to show next 12 hours starting from current hour
                const now = new Date()
                const currentHourTimestamp = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                  now.getHours()
                ).getTime()
                
                const next12Hours = data.hourlyWeather
                  .filter(h => new Date(h.timestamp).getTime() >= currentHourTimestamp)
                  .slice(0, 12)
                
                return next12Hours.map((hour, idx) => {
                  const date = new Date(hour.timestamp)
                  const hourStr = date.toLocaleTimeString("en-IE", {
                    hour: "2-digit",
                    hour12: false,
                    timeZone: "Europe/Dublin",
                  })
                  const WeatherIcon = getWeatherInfo(hour.weatherCode).icon
                  const weatherDesc = getWeatherInfo(hour.weatherCode).description
                  const isNow = idx === 0
                  
                  // Find matching wind data for this hour
                  const windPoint = displayWindData.find(w => {
                    const windDate = new Date(w.timestamp)
                    return windDate.getHours() === date.getHours() && 
                           windDate.getDate() === date.getDate()
                  })
                  
                  return (
                    <div
                      key={hour.timestamp}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${
                        isNow ? "bg-primary/10 border-2 border-primary" : "bg-muted/30 border border-border"
                      }`}
                    >
                      <span className={`text-xs font-semibold ${isNow ? "text-primary" : "text-muted-foreground"}`}>
                        {isNow ? "Now" : hourStr}
                      </span>
                      <WeatherIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${isNow ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-base sm:text-lg font-bold">{Math.round(hour.temperature)}°C</span>
                      
                      {/* Wind Speed & Gusts */}
                      {windPoint && (
                        <div className="flex flex-col items-center gap-1 mt-1 pt-2 border-t border-border/50 w-full">
                          <div className="flex items-center gap-1">
                            <Wind className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-bold">{Math.round(windPoint.windSpeed)}</span>
                            <span className="text-[10px] text-muted-foreground">km/h</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Gust: {Math.round(windPoint.windGusts)} km/h
                          </div>
                        </div>
                      )}
                      
                      {hour.precipitation > 0 && (
                        <div className="text-xs text-blue-500 font-medium">
                          {hour.precipitation.toFixed(1)} mm
                        </div>
                      )}
                    </div>
                  )
                })
              })()
            ) : (
              <div className="col-span-full flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temperature (°C)</span>
            <span className="flex items-center gap-1"><Wind className="h-3 w-3" /> Wind Speed (km/h)</span>
            <span className="flex items-center gap-1 text-blue-500"><Droplets className="h-3 w-3" /> Precipitation (mm)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
