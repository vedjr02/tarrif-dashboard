"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { Header } from "./header"
import { Footer } from "./footer"
import { SettingsModal } from "./settings-modal"
import { ScreenPriceStatistics } from "./screens/screen-price-statistics"
import { ScreenPriceAnalysis } from "./screens/screen-price-analysis"
import { ScreenGridForecast } from "./screens/screen-grid-forecast"
import type { DayPrices, CurrentPrice, BackendStatus, DayTariffs, CurrentTariff } from "@/lib/types"

interface PricesApiResponse {
  todayPrices: DayPrices | null
  tomorrowPrices: DayPrices | null
  yesterdayPrices: DayPrices | null
  todayTariffs: DayTariffs | null
  tomorrowTariffs: DayTariffs | null
  yesterdayTariffs: DayTariffs | null
  currentPrice: CurrentPrice | null
  currentTariff: CurrentTariff | null
  currentPeriodIndex: number
  tomorrowIsRealData: boolean
  backendStatus: BackendStatus
  fetchedAt: string
}

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then(res => res.json())

const SCREENS = [
  { id: "price-stats", label: "Dynamic Price & Statistics" },
  { id: "price-analysis", label: "Price Analysis" },
  { id: "grid-forecast", label: "Grid & Forecast" },
]

const DEFAULT_ROTATION_INTERVAL = 15000 // 15 seconds

export function Dashboard() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0)
  
  // Carousel state
  const [currentScreen, setCurrentScreen] = useState(0)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [rotationInterval, setRotationInterval] = useState(DEFAULT_ROTATION_INTERVAL)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Fetch real-time data from SEMO PX API
  const { data, error, isLoading } = useSWR<PricesApiResponse>(
    "/api/prices",
    fetcher,
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  )

  // Extract data from API response
  const todayPrices = data?.todayPrices ?? null
  const tomorrowPrices = data?.tomorrowPrices ?? null
  const yesterdayPrices = data?.yesterdayPrices ?? null
  const todayTariffs = data?.todayTariffs ?? null
  const currentPrice = data?.currentPrice ?? null
  const currentTariff = data?.currentTariff ?? null
  const backendStatus = data?.backendStatus ?? null
  const currentPeriodIndexFromApi = data?.currentPeriodIndex ?? 0

  // Update current period index every 30s using Dublin timezone
  useEffect(() => {
    const updatePeriod = () => {
      const now = new Date()
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Dublin",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(now)
      const dublinHour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0")
      const dublinMinute = parseInt(parts.find(p => p.type === "minute")?.value ?? "0")
      setCurrentPeriodIndex(Math.min(dublinHour * 2 + (dublinMinute >= 30 ? 1 : 0), 47))
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
    // Stop auto-rotation when manually navigating (user must re-enable via header button)
    setIsAutoRotating(false)
  }

  const nextScreen = () => goToScreen((currentScreen + 1) % SCREENS.length)
  const prevScreen = () => goToScreen((currentScreen - 1 + SCREENS.length) % SCREENS.length)

  // Loading state — only block on backendStatus, which is always returned
  if (isLoading || !backendStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-lg text-muted-foreground sm:text-xl">Loading real-time pricing data...</p>
          <p className="text-xs text-muted-foreground/70 mt-2 sm:text-sm">Source: SEMO PX Day-Ahead Market</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">!</span>
          </div>
          <p className="text-lg text-destructive sm:text-xl">Failed to load pricing data</p>
          <p className="text-xs text-muted-foreground mt-2 sm:text-sm">Please check your connection and refresh</p>
        </div>
      </div>
    )
  }

  const previousPeriod = (currentPeriodIndex > 0 && todayPrices) ? todayPrices.periods[currentPeriodIndex - 1] : undefined

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
            <ScreenPriceAnalysis
              todayPrices={todayPrices}
              todayTariffs={todayTariffs}
              tomorrowPrices={tomorrowPrices}
              tomorrowTariffs={data?.tomorrowTariffs ?? null}
              yesterdayPrices={yesterdayPrices}
              yesterdayTariffs={data?.yesterdayTariffs ?? null}
              currentPeriodIndex={currentPeriodIndex}
              tomorrowIsRealData={data?.tomorrowIsRealData ?? false}
              backendStatus={backendStatus}
            />
          )}
          {currentScreen === 2 && (
            <ScreenGridForecast
              currentPeriodIndex={currentPeriodIndex}
            />
          )}
        </div>

        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm border border-border sm:left-4 sm:h-14 sm:w-14"
          onClick={prevScreen}
        >
          <ChevronLeft className="h-5 w-5 sm:h-8 sm:w-8" />
          <span className="sr-only">Previous screen</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm border border-border sm:right-4 sm:h-14 sm:w-14"
          onClick={nextScreen}
        >
          <ChevronRight className="h-5 w-5 sm:h-8 sm:w-8" />
          <span className="sr-only">Next screen</span>
        </Button>
      </main>

      {/* Navigation Bar - Below main content, above footer */}
      <nav className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Screen Indicators - Centered */}
          <div className="flex items-center gap-2 sm:gap-3">
            {SCREENS.map((screen, index) => (
              <button
                key={screen.id}
                onClick={() => goToScreen(index)}
                className={`flex items-center gap-1.5 rounded-full transition-all sm:gap-2 ${
                  currentScreen === index
                    ? "bg-primary text-primary-foreground scale-105 px-3 py-1.5 text-xs font-semibold sm:px-5 sm:py-2.5 sm:text-sm"
                    : "bg-muted/80 text-muted-foreground hover:bg-muted px-2 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${currentScreen === index ? "bg-primary-foreground" : "bg-muted-foreground"}`} />
                <span className="hidden sm:inline">{screen.label}</span>
                <span className="sm:hidden">{index + 1}</span>
              </button>
            ))}
          </div>

          {/* Auto-rotation indicator - Right aligned */}
          {isAutoRotating && (
            <div className="absolute right-4 sm:right-6 flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-1 text-xs text-muted-foreground sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse sm:h-2 sm:w-2" />
              <span className="hidden sm:inline">Auto {rotationInterval / 1000}s</span>
              <span className="sm:hidden">{rotationInterval / 1000}s</span>
            </div>
          )}
        </div>
      </nav>

      <Footer status={backendStatus} />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        dayPrices={todayPrices}
      />
    </div>
  )
}
