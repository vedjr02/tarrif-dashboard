"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "./header"
import { Footer } from "./footer"
import { PriceSignalCard } from "./price-signal-card"
import { NextPeriodsStrip } from "./next-periods-strip"
import { PriceCurveChart } from "./price-curve-chart"
import { DynamicPricingCard } from "./dynamic-pricing-card"
import { ActionRecommendations } from "./action-recommendations"
import { DailySummaryBar } from "./daily-summary-bar"
import { PriceTable } from "./price-table"
import { HistoricalView } from "./historical-view"
import { SettingsModal } from "./settings-modal"
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
import type { DayPrices, CurrentPrice, HistoryDay, BackendStatus, Quintile, DayTariffs, CurrentTariff } from "@/lib/types"
import { Activity, Table2, History } from "lucide-react"

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

  if (!todayPrices || !currentPrice || !yesterdayPrices || !backendStatus || !todayTariffs || !currentTariff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading pricing data...</p>
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
      : timeSinceLastScrape > 600000 // 10 minutes
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
      />

      <main className="container mx-auto flex-1 px-4 py-6">
        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Live</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            {/* Hero Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <PriceSignalCard currentPrice={currentPrice} currentTariff={currentTariff} previousPeriod={previousPeriod} />
              </div>
              <div className="space-y-6 lg:col-span-2">
                <NextPeriodsStrip periods={todayPrices.periods} tariffPeriods={todayTariffs.periods} currentPeriodIndex={currentPeriodIndex} />
                <DailySummaryBar currentPrice={currentPrice} dayPrices={todayPrices} />
              </div>
            </div>

            {/* Dynamic Pricing Card */}
            <DynamicPricingCard currentTariff={currentTariff} dayTariffs={todayTariffs} />

            {/* Price Curve Chart */}
            <PriceCurveChart
              todayPrices={todayPrices}
              todayTariffs={todayTariffs}
              tomorrowPrices={tomorrowPrices}
              yesterdayPrices={yesterdayPrices}
              currentPeriodIndex={currentPeriodIndex}
            />

            {/* Action Recommendations */}
            <ActionRecommendations
              currentQuintile={currentPrice.quintile as Quintile}
              dayPrices={todayPrices}
              currentPeriodIndex={currentPeriodIndex}
            />
          </TabsContent>

          <TabsContent value="table">
            <PriceTable dayPrices={todayPrices} currentPeriodIndex={currentPeriodIndex} />
          </TabsContent>

          <TabsContent value="history">
            <HistoricalView historyData={historyData} />
          </TabsContent>
        </Tabs>

        {/* Last refresh indicator */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          Last refreshed: {lastRefresh.toLocaleTimeString("en-IE", { timeZone: "Europe/Dublin" })} •
          Auto-refreshes every 60s
        </div>
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
