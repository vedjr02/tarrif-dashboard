"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "./header"
import { Footer } from "./footer"
import { SettingsModal } from "./settings-modal"
import { ScreenPriceStatistics } from "./screens/screen-price-statistics"
import { ScreenPriceCurve } from "./screens/screen-price-curve"
import { ScreenOperationsSavings } from "./screens/screen-operations-savings"
import {
  getTodayPrices,
  getTomorrowPrices,
  getYesterdayPrices,
  getCurrentPeriod,
  getHistoricalData,
  getBackendStatus,
  getTodayTariffs,
  getTomorrowTariffs,
  getYesterdayTariffs,
  getCurrentTariff,
} from "@/lib/mock-data"
import type { DayPrices, CurrentPrice, HistoryDay, BackendStatus, DayTariffs, CurrentTariff } from "@/lib/types"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const SCREENS = [
  { id: "price-stats", label: "Dynamic Price & Statistics" },
  { id: "price-curve", label: "Price Curve Comparison" },
  { id: "operations", label: "Operations & Savings" },
]

const DEFAULT_ROTATION_INTERVAL = 15000 // 15 seconds

export function Dashboard() {
  const [todayPrices, setTodayPrices] = useState<DayPrices | null>(null)
  const [tomorrowPrices, setTomorrowPrices] = useState<DayPrices | null>(null)
  const [yesterdayPrices, setYesterdayPrices] = useState<DayPrices | null>(null)
  const [todayTariffs, setTodayTariffs] = useState<DayTariffs | null>(null)
  const [currentPrice, setCurrentPrice] = useState<CurrentPrice | null>(null)
  const [currentTariff, setCurrentTariff] = useState<CurrentTariff | null>(null)
  const [historyData, setHistoryData] = useState<HistoryDay[]>([])
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  
  // Carousel state
  const [currentScreen, setCurrentScreen] = useState(0)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [rotationInterval, setRotationInterval] = useState(DEFAULT_ROTATION_INTERVAL)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fetchData = useCallback(() => {
    const today = getTodayPrices()
    const tomorrow = getTomorrowPrices()
    const yesterday = getYesterdayPrices()
    const current = getCurrentPeriod(today)
    const todayTariff = getTodayTariffs()
    const currentTariffData = getCurrentTariff(todayTariff)
    const history = getHistoricalData(30)
    const status = getBackendStatus()

    setTodayPrices(today)
    setTomorrowPrices(tomorrow)
    setYesterdayPrices(yesterday)
    setCurrentPrice(current)
    setTodayTariffs(todayTariff)
    setCurrentTariff(currentTariffData)
    setHistoryData(history)
    setBackendStatus(status)
    setCurrentPeriodIndex(current.period - 1)
    setLastRefresh(new Date())
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchData])

  // Update current period index every minute
  useEffect(() => {
    const updatePeriod = () => {
      const now = new Date()
      const dublinHour = now.getHours()
      const dublinMinute = now.getMinutes()
      const newIndex = dublinHour * 2 + (dublinMinute >= 30 ? 1 : 0)
      setCurrentPeriodIndex(Math.min(newIndex, 47))
    }

    updatePeriod()
    const interval = setInterval(updatePeriod, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-rotate screens
  useEffect(() => {
    if (!isAutoRotating) return

    const interval = setInterval(() => {
      setCurrentScreen((prev) => (prev + 1) % SCREENS.length)
    }, rotationInterval)

    return () => clearInterval(interval)
  }, [isAutoRotating, rotationInterval])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        setCurrentScreen((prev) => (prev + 1) % SCREENS.length)
      } else if (e.key === "ArrowLeft") {
        setCurrentScreen((prev) => (prev - 1 + SCREENS.length) % SCREENS.length)
      } else if (e.key === "p" || e.key === "P") {
        setIsAutoRotating((prev) => !prev)
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleFullscreen])

  const goToScreen = (index: number) => {
    setCurrentScreen(index)
    // Pause auto-rotation briefly when manually navigating
    setIsAutoRotating(false)
    setTimeout(() => setIsAutoRotating(true), 5000)
  }

  const nextScreen = () => goToScreen((currentScreen + 1) % SCREENS.length)
  const prevScreen = () => goToScreen((currentScreen - 1 + SCREENS.length) % SCREENS.length)

  if (!todayPrices || !currentPrice || !yesterdayPrices || !backendStatus || !todayTariffs || !currentTariff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-xl text-muted-foreground">Loading pricing data from Semo PX...</p>
        </div>
      </div>
    )
  }

  const previousPeriod = currentPeriodIndex > 0 ? todayPrices.periods[currentPeriodIndex - 1] : undefined

  // Determine backend status for header
  const timeSinceLastScrape = Date.now() - new Date(backendStatus.last_scrape).getTime()
  const statusForHeader: "ok" | "error" | "stale" =
    backendStatus.backend === "error"
      ? "error"
      : timeSinceLastScrape > 600000
      ? "stale"
      : "ok"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        backendStatus={statusForHeader}
        lastUpdate={new Date(backendStatus.last_scrape).toLocaleTimeString("en-IE", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Dublin",
        })}
        onSettingsClick={() => setSettingsOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isAutoRotating={isAutoRotating}
        onToggleAutoRotate={() => setIsAutoRotating((prev) => !prev)}
      />

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-hidden min-h-0">
        {/* Screen Content */}
        <div className="h-full flex flex-col">
          {currentScreen === 0 && (
            <ScreenPriceStatistics
              currentPrice={currentPrice}
              currentTariff={currentTariff}
              previousPeriod={previousPeriod}
              dayPrices={todayPrices}
              dayTariffs={todayTariffs}
              currentPeriodIndex={currentPeriodIndex}
            />
          )}
          {currentScreen === 1 && (
            <ScreenPriceCurve
              todayPrices={todayPrices}
              todayTariffs={todayTariffs}
              tomorrowPrices={tomorrowPrices}
              yesterdayPrices={yesterdayPrices}
              currentPeriodIndex={currentPeriodIndex}
            />
          )}
          {currentScreen === 2 && (
            <ScreenOperationsSavings
              currentPrice={currentPrice}
              currentTariff={currentTariff}
              dayPrices={todayPrices}
              dayTariffs={todayTariffs}
              currentPeriodIndex={currentPeriodIndex}
            />
          )}
        </div>

        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm border border-border"
          onClick={prevScreen}
        >
          <ChevronLeft className="h-10 w-10" />
          <span className="sr-only">Previous screen</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm border border-border"
          onClick={nextScreen}
        >
          <ChevronRight className="h-10 w-10" />
          <span className="sr-only">Next screen</span>
        </Button>

        {/* Screen Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
          {SCREENS.map((screen, index) => (
            <button
              key={screen.id}
              onClick={() => goToScreen(index)}
              className={`flex items-center gap-2 rounded-full px-6 py-3 text-lg font-medium transition-all ${
                currentScreen === index
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className={`h-3 w-3 rounded-full ${currentScreen === index ? "bg-primary-foreground" : "bg-muted-foreground"}`} />
              {screen.label}
            </button>
          ))}
        </div>

        {/* Auto-rotation indicator */}
        {isAutoRotating && (
          <div className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full bg-muted/80 px-4 py-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Auto-rotating every {rotationInterval / 1000}s
          </div>
        )}
      </main>

      <Footer status={backendStatus} />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        dayPrices={todayPrices}
      />
    </div>
  )
}
