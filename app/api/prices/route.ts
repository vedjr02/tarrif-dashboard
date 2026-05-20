import { NextResponse } from "next/server"
import type { DayPrices, PricePeriod, DayTariffs, TariffPeriod } from "@/lib/types"

// Tariff calculation constants
const FLAT_MARKUP_EUR_MWH = 20
const MARKUP_PCT = 0.03
const VAT_RATE = 0.09

// Ireland bidding zone in ENTSO-E
const IRELAND_BIDDING_ZONE = "10Y1001A1001A016" // SEM (Single Electricity Market)

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

// Returns Dublin UTC offset in hours: 0 (GMT, Oct–Mar) or 1 (IST, Mar–Oct)
function getDublinUtcOffsetHours(tradingDay: string): number {
  const noon = new Date(`${tradingDay}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Dublin",
    hour: "numeric",
    hour12: false,
  }).formatToParts(noon)
  const dublinHour = parseInt(parts.find(p => p.type === "hour")?.value ?? "12")
  return dublinHour - 12
}

// Format date for ENTSO-E API (YYYYMMDDHHMM)
function formatEntsoeDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}${month}${day}0000`
}

// Get Dublin date for a given offset
function getDublinDate(daysOffset = 0): string {
  const now = new Date()
  const dublinTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Dublin" }))
  dublinTime.setDate(dublinTime.getDate() + daysOffset)
  return formatDate(dublinTime)
}

// Calculate quintiles for price periods
function calculateQuintiles(periods: PricePeriod[]): void {
  const sortedPrices = [...periods].sort((a, b) => a.price_eur_mwh - b.price_eur_mwh)
  const quintileSize = Math.ceil(periods.length / 5)
  
  sortedPrices.forEach((sortedPeriod, index) => {
    const quintile = Math.min(5, Math.floor(index / quintileSize) + 1) as 1 | 2 | 3 | 4 | 5
    const originalPeriod = periods.find(p => p.period === sortedPeriod.period)
    if (originalPeriod) {
      originalPeriod.quintile = quintile
    }
  })
}

// Convert spot price to customer tariff
function calculateTariff(spotPrice: number): { tariff_eur_mwh: number; tariff_eur_kwh: number; tariff_inc_vat_eur_kwh: number } {
  const tariff_eur_mwh = (spotPrice + FLAT_MARKUP_EUR_MWH) * (1 + MARKUP_PCT)
  const tariff_eur_kwh = tariff_eur_mwh / 1000
  const tariff_inc_vat_eur_kwh = tariff_eur_kwh * (1 + VAT_RATE)
  
  return {
    tariff_eur_mwh: Math.round(tariff_eur_mwh * 100) / 100,
    tariff_eur_kwh: Math.round(tariff_eur_kwh * 10000) / 10000,
    tariff_inc_vat_eur_kwh: Math.round(tariff_inc_vat_eur_kwh * 10000) / 10000,
  }
}

// Parse ENTSO-E XML response to extract Day-Ahead prices
function parseEntsoeXml(xmlContent: string, tradingDay: string): number[] | null {
  try {
    // Extract all price points from the XML
    const prices: { position: number; price: number }[] = []
    
    // Find TimeSeries with A44 (Day-ahead prices)
    const timeSeriesMatches = xmlContent.match(/<TimeSeries>[\s\S]*?<\/TimeSeries>/g)
    if (!timeSeriesMatches) return null
    
    for (const ts of timeSeriesMatches) {
      // Check if this is a price time series (not volumes)
      if (!ts.includes("A62") && !ts.includes("price")) continue
      
      // Extract period
      const periodMatch = ts.match(/<Period>[\s\S]*?<\/Period>/g)
      if (!periodMatch) continue
      
      for (const period of periodMatch) {
        // Check if this period covers our trading day
        const startMatch = period.match(/<start>([\d\-T:Z]+)<\/start>/)
        if (startMatch) {
          const startDate = startMatch[1].split("T")[0]
          // Only process if this is for the correct day
          if (startDate !== tradingDay) continue
        }
        
        // Extract all points
        const pointMatches = period.match(/<Point>[\s\S]*?<\/Point>/g)
        if (!pointMatches) continue
        
        for (const point of pointMatches) {
          const posMatch = point.match(/<position>(\d+)<\/position>/)
          const priceMatch = point.match(/<price\.amount>([\d.]+)<\/price\.amount>/)
          
          if (posMatch && priceMatch) {
            prices.push({
              position: parseInt(posMatch[1]),
              price: parseFloat(priceMatch[2]),
            })
          }
        }
      }
    }
    
    if (prices.length === 0) return null
    
    // Sort by position and return prices
    prices.sort((a, b) => a.position - b.position)
    return prices.map(p => p.price)
  } catch {
    return null
  }
}

// Fetch prices from ENTSO-E Transparency Platform
async function fetchEntsoePrices(tradingDay: string): Promise<PricePeriod[] | null> {
  const token = process.env.ENTSOE_API_TOKEN
  if (!token) {
    return null
  }
  
  try {
    const startDate = new Date(tradingDay + "T00:00:00Z")
    const endDate = new Date(tradingDay + "T23:59:59Z")
    endDate.setDate(endDate.getDate() + 1)
    
    const url = `https://web-api.tp.entsoe.eu/api?documentType=A44&in_Domain=${IRELAND_BIDDING_ZONE}&out_Domain=${IRELAND_BIDDING_ZONE}&periodStart=${formatEntsoeDate(startDate)}&periodEnd=${formatEntsoeDate(endDate)}&securityToken=${token}`
    
    const response = await fetch(url, { next: { revalidate: 300 } })
    
    if (!response.ok) {
      return null
    }
    
    const xmlContent = await response.text()
    const hourlyPrices = parseEntsoeXml(xmlContent, tradingDay)
    
    if (!hourlyPrices || hourlyPrices.length < 20) {
      return null
    }
    
    // Convert to half-hourly periods
    return convertToPeriods(tradingDay, hourlyPrices, "ENTSO-E")
  } catch {
    return null
  }
}

// Parse SEMO CSV and extract ROI-DA EUR prices
// CSV structure:
//   Market Area;ROI-DA
//   Index prices;60;EUR
//   2025-05-24T22:00:00Z;2025-05-24T23:00:00Z;... (timestamps)
//   15,000;0,000;-0,100;-4,000;... (prices in EUR/MWh)
function parseSemoCsv(csvContent: string): number[] | null {
  try {
    const lines = csvContent.split('\n')
    let inRoiSection = false
    let foundEurPricesHeader = false
    let skippedTimestampLine = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Enter ROI-DA section
      if (line.startsWith('Market Area;ROI-DA')) {
        inRoiSection = true
        foundEurPricesHeader = false
        skippedTimestampLine = false
        continue
      }
      
      // Exit ROI-DA section when we hit another Market Area
      if (inRoiSection && line.startsWith('Market Area;') && !line.includes('ROI-DA')) {
        inRoiSection = false
        continue
      }
      
      // Found EUR prices header
      if (inRoiSection && (line.startsWith('Index prices;60;EUR') || line.startsWith('Index prices;30;EUR'))) {
        foundEurPricesHeader = true
        skippedTimestampLine = false
        continue
      }
      
      // Skip the timestamp line (contains ISO dates like 2025-05-24T22:00:00Z)
      if (foundEurPricesHeader && !skippedTimestampLine && line.includes('T') && line.includes('Z')) {
        skippedTimestampLine = true
        continue
      }
      
      // This is THE prices line - immediately after timestamp line
      // Format: 15,000;0,000;-0,100;-4,000;... (comma = decimal separator)
      if (foundEurPricesHeader && skippedTimestampLine) {
        const parts = line.split(';')
        const prices: number[] = []
        
        for (const part of parts) {
          const trimmed = part.trim()
          if (!trimmed) continue
          
          // Replace comma with dot for decimal parsing (European format: 15,000 -> 15.000)
          const normalized = trimmed.replace(/,/g, '.')
          const value = parseFloat(normalized)
          
          // Accept any valid number (including negatives - DAM can have negative prices)
          if (!isNaN(value)) {
            prices.push(value)
          }
        }
        
        // We found the prices line - return if we have enough values
        if (prices.length >= 20) {
          return prices
        }
        
        // If we got here but don't have enough prices, something is wrong
        // Reset and keep looking for another Index prices;60;EUR section
        foundEurPricesHeader = false
        skippedTimestampLine = false
      }
    }
    
    return null
  } catch (e) {
    console.error("[v0] SEMO CSV parse error:", e)
    return null
  }
}

// Fetch real DAM prices from SEMO for a specific date
async function fetchSemoPrices(tradingDay: string): Promise<PricePeriod[] | null> {
  try {
    // semopx.com is the correct domain (sem-o.com only has 2025 data).
    // The API PublishTime = midnight D+2, so today/tomorrow reports are not yet indexed.
    // We match by the Date field (delivery day) which is D+1 = the actual trading day.
    const searchUrl = `https://reports.semopx.com/api/v1/documents/static-reports?name=MarketResult_SEM-DA&group=Market+Data&page_size=10&sort_by=PublishTime&order_by=DESC`

    const searchResponse = await fetch(searchUrl, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 },
    })

    if (!searchResponse.ok) {
      return null
    }

    const searchData = await searchResponse.json()

    if (!searchData.items || searchData.items.length === 0) {
      return null
    }

    // Match by Date field (= delivery/trading day, format "YYYY-MM-DDT10:00:00")
    const selectedReport = searchData.items.find(
      (report: { Date?: string }) => report.Date?.startsWith(tradingDay)
    ) ?? null

    if (!selectedReport) {
      return null
    }

    const csvUrl = `https://reports.semopx.com/documents/${selectedReport.ResourceName}`
    
    const csvResponse = await fetch(csvUrl, { next: { revalidate: 300 } })
    if (!csvResponse.ok) {
      return null
    }
    
    const csvContent = await csvResponse.text()
    const hourlyPrices = parseSemoCsv(csvContent)
    
    if (!hourlyPrices || hourlyPrices.length < 20) {
      return null
    }
    
    return convertToPeriods(tradingDay, hourlyPrices, "SEMOPX")
  } catch {
    return null
  }
}

// Convert hourly prices to half-hourly periods
function convertToPeriods(tradingDay: string, hourlyPrices: number[], source: "SEMOPX" | "ENTSO-E" | "Interpolated"): PricePeriod[] {
  const periods: PricePeriod[] = []
  const offsetHours = getDublinUtcOffsetHours(tradingDay)
  const offsetStr = offsetHours === 1 ? "+01:00" : "+00:00"

  for (let i = 0; i < 48; i++) {
    const hourIndex = Math.floor(i / 2)
    const price = hourlyPrices[hourIndex] ?? hourlyPrices[Math.min(hourIndex, hourlyPrices.length - 1)] ?? 80

    const hour = Math.floor(i / 2)
    const minute = (i % 2) * 30
    const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`

    // Construct Dublin local time string, then parse to get correct UTC
    const dublinLocalStr = `${tradingDay}T${startTime}:00${offsetStr}`
    const utcDate = new Date(dublinLocalStr)

    periods.push({
      period: i + 1,
      start_time_utc: utcDate.toISOString(),
      start_time_dublin: dublinLocalStr,
      price_eur_mwh: Math.round(price * 100) / 100,
      quintile: 3 as 1 | 2 | 3 | 4 | 5,
      source,
    })
  }

  calculateQuintiles(periods)
  return periods
}

// Build DayPrices object
function buildDayPrices(tradingDay: string, periods: PricePeriod[]): DayPrices {
  const date = new Date(tradingDay)
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  
  const publishedAt = new Date(date)
  publishedAt.setDate(publishedAt.getDate() - 1)
  publishedAt.setHours(13, 42, 0, 0)
  
  return {
    trading_day: tradingDay,
    day_type: isWeekend ? "weekend" : "weekday",
    holiday: false,
    published_at: publishedAt.toISOString(),
    periods,
  }
}

// Build DayTariffs from DayPrices
function buildDayTariffs(dayPrices: DayPrices): DayTariffs {
  const periods: TariffPeriod[] = dayPrices.periods.map(period => {
    const tariff = calculateTariff(period.price_eur_mwh)
    return {
      ...period,
      ...tariff,
    }
  })
  
  return {
    trading_day: dayPrices.trading_day,
    day_type: dayPrices.day_type,
    holiday: dayPrices.holiday,
    published_at: dayPrices.published_at,
    periods,
  }
}

export async function GET() {
  try {
    const todayStr = getDublinDate(0)
    const tomorrowStr = getDublinDate(1)
    const yesterdayStr = getDublinDate(-1)

    // Fetch prices: try ENTSO-E first, then SEMO — no fake fallback
    const fetchPricesForDay = async (day: string): Promise<PricePeriod[] | null> => {
      const entsoePrices = await fetchEntsoePrices(day)
      if (entsoePrices) return entsoePrices
      return fetchSemoPrices(day)
    }

    const [todayPeriods, tomorrowPeriods, yesterdayPeriods] = await Promise.all([
      fetchPricesForDay(todayStr),
      fetchPricesForDay(tomorrowStr),
      fetchPricesForDay(yesterdayStr),
    ])

    // Build response — null when no real data available
    const todayPrices = todayPeriods ? buildDayPrices(todayStr, todayPeriods) : null
    const tomorrowPrices = tomorrowPeriods ? buildDayPrices(tomorrowStr, tomorrowPeriods) : null
    const yesterdayPrices = yesterdayPeriods ? buildDayPrices(yesterdayStr, yesterdayPeriods) : null

    const todayTariffs = todayPrices ? buildDayTariffs(todayPrices) : null
    const tomorrowTariffs = tomorrowPrices ? buildDayTariffs(tomorrowPrices) : null
    const yesterdayTariffs = yesterdayPrices ? buildDayTariffs(yesterdayPrices) : null

    // Calculate current period
    const now = new Date()
    const dublinHour = parseInt(now.toLocaleTimeString("en-IE", { hour: "2-digit", hour12: false, timeZone: "Europe/Dublin" }))
    const dublinMinute = now.getMinutes()
    const currentPeriodIndex = dublinHour * 2 + (dublinMinute >= 30 ? 1 : 0)

    const currentPrice = todayPrices ? (() => {
      const period = todayPrices.periods[Math.min(currentPeriodIndex, 47)]
      const prices = todayPrices.periods.map(p => p.price_eur_mwh)
      return {
        ...period,
        daily_avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
        daily_min: Math.min(...prices),
        daily_max: Math.max(...prices),
      }
    })() : null

    // Current tariff
    const currentTariffPeriod = todayTariffs?.periods[Math.min(currentPeriodIndex, 47)] ?? null
    const tariffs = todayTariffs?.periods.map(p => p.tariff_inc_vat_eur_kwh) ?? []
    const daily_avg_tariff = tariffs.length > 0 ? tariffs.reduce((a, b) => a + b, 0) / tariffs.length : 0
    
    const signalMap: Record<number, "CHEAP" | "BELOW_AVERAGE" | "AVERAGE" | "ABOVE_AVERAGE" | "EXPENSIVE"> = {
      1: "CHEAP",
      2: "BELOW_AVERAGE",
      3: "AVERAGE",
      4: "ABOVE_AVERAGE",
      5: "EXPENSIVE",
    }
    
    const currentTariff = currentTariffPeriod && todayTariffs ? {
      ...currentTariffPeriod,
      daily_avg: Math.round(daily_avg_tariff * 10000) / 10000,
      daily_min: tariffs.length > 0 ? Math.min(...tariffs) : 0,
      daily_max: tariffs.length > 0 ? Math.max(...tariffs) : 0,
      signal: signalMap[currentTariffPeriod.quintile] ?? "AVERAGE",
      tariff_name: "Standard",
      next_periods: todayTariffs.periods.slice(Math.min(currentPeriodIndex + 1, 47), Math.min(currentPeriodIndex + 7, 48)),
      daily_avg_tariff_eur_kwh: Math.round(daily_avg_tariff * 10000) / 10000,
      delta_vs_avg_pct: daily_avg_tariff > 0
        ? Math.round(((currentTariffPeriod.tariff_inc_vat_eur_kwh - daily_avg_tariff) / daily_avg_tariff) * 1000) / 10
        : 0,
    } : null

    // Determine data source
    const allSources: string[] = [
      ...(todayPrices?.periods.map(p => p.source) ?? []),
      ...(tomorrowPrices?.periods.map(p => p.source) ?? []),
      ...(yesterdayPrices?.periods.map(p => p.source) ?? []),
    ]
    const sources = [...new Set(allSources)]
    const primarySource = sources.includes("ENTSO-E") ? "ENTSO-E" : sources.includes("SEMOPX") ? "SEMOPX" : "Unknown"

    const missingDays = [todayPrices, tomorrowPrices, yesterdayPrices].filter(d => d === null).length

    // Backend status
    const backendStatus = {
      last_scrape: new Date().toISOString(),
      backend: "ok" as const,
      missing_days: missingDays,
      data_source: primarySource,
      today_source: todayPrices?.periods[0]?.source ?? "Unknown",
      tomorrow_source: tomorrowPrices?.periods[0]?.source ?? "Unknown",
      yesterday_source: yesterdayPrices?.periods[0]?.source ?? "Unknown",
    }

    const tomorrowIsRealData = tomorrowPrices !== null && tomorrowPrices.periods[0]?.source !== "Interpolated"

    return NextResponse.json({
      todayPrices,
      tomorrowPrices,
      yesterdayPrices,
      todayTariffs,
      tomorrowTariffs,
      yesterdayTariffs,
      currentPrice,
      currentTariff,
      currentPeriodIndex,
      tomorrowIsRealData,
      backendStatus,
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    )
  }
}
