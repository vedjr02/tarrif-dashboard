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

// Format date for ENTSO-E API (YYYYMMDDHHMM in UTC)
function formatEntsoeDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  const hour = String(date.getUTCHours()).padStart(2, "0")
  const minute = String(date.getUTCMinutes()).padStart(2, "0")
  return `${year}${month}${day}${hour}${minute}`
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
    const prices: { position: number; price: number }[] = []

    const timeSeriesMatches = xmlContent.match(/<TimeSeries>[\s\S]*?<\/TimeSeries>/g)
    if (!timeSeriesMatches) return null

    for (const ts of timeSeriesMatches) {
      if (!ts.includes("A62") && !ts.includes("price")) continue

      const periodMatch = ts.match(/<Period>[\s\S]*?<\/Period>/g)
      if (!periodMatch) continue

      for (const period of periodMatch) {
        const startMatch = period.match(/<start>([\d\-T:Z]+)<\/start>/)
        if (startMatch) {
          // Compare Dublin local date (not raw UTC date — SEM zone is UTC+0/+1)
          const startDublinDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" })
            .format(new Date(startMatch[1]))
          if (startDublinDate !== tradingDay) continue
        }

        const pointMatches = period.match(/<Point>[\s\S]*?<\/Point>/g)
        if (!pointMatches) continue

        for (const point of pointMatches) {
          const posMatch = point.match(/<position>(\d+)<\/position>/)
          const priceMatch = point.match(/<price\.amount>([\d.]+)<\/price\.amount>/)
          if (posMatch && priceMatch) {
            prices.push({ position: parseInt(posMatch[1]), price: parseFloat(priceMatch[1]) })
          }
        }
      }
    }

    if (prices.length === 0) return null
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
    // Query from previous day 22:00Z — SEM zone day starts at 23:00Z (summer) or 00:00Z (winter),
    // which in UTC is always at or after 22:00Z of the previous calendar day.
    const prevDay = new Date(tradingDay + "T22:00:00Z")
    prevDay.setDate(prevDay.getDate() - 1)
    const startDate = prevDay // D-1 @ 22:00Z
    const endDate = new Date(tradingDay + "T23:00:00Z") // D @ 23:00Z (covers Dublin 23:30 in summer)

    const url = `https://web-api.tp.entsoe.eu/api?documentType=A44&in_Domain=${IRELAND_BIDDING_ZONE}&out_Domain=${IRELAND_BIDDING_ZONE}&periodStart=${formatEntsoeDate(startDate)}&periodEnd=${formatEntsoeDate(endDate)}&securityToken=${token}`
    
    const response = await fetch(url, { next: { revalidate: 300 } })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      console.error(`[entsoe] ${tradingDay}: HTTP ${response.status} — ${body.slice(0, 300)}`)
      return null
    }

    const xmlContent = await response.text()
    const hourlyPrices = parseEntsoeXml(xmlContent, tradingDay)

    if (!hourlyPrices || hourlyPrices.length < 20) {
      console.error(`[entsoe] ${tradingDay}: parsed ${hourlyPrices?.length ?? 0} prices (need ≥20)`)
      return null
    }

    return convertToPeriods(tradingDay, hourlyPrices, "ENTSO-E")
  } catch (e) {
    console.error(`[entsoe] ${tradingDay}: exception —`, e)
    return null
  }
}

// Parse SEMO CSV — returns UTC timestamps and EUR/MWh prices for the ROI-DA section.
// CSV has "Market;ROI-DA" sections with "Index prices;30;EUR" (half-hourly) rows.
// SEMO trading day starts at UTC 22:00Z (= Dublin 23:00 IST or 22:00 GMT).
function parseSemoCsv(csvContent: string): { timestamps: string[]; prices: number[] } | null {
  try {
    const lines = csvContent.split('\n')
    let inRoiSection = false
    let foundEurPricesHeader = false
    let timestampLine: string | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Enter ROI-DA section (CSV uses "Market;ROI-DA", not "Market Area;ROI-DA")
      if (line === 'Market;ROI-DA') {
        inRoiSection = true
        foundEurPricesHeader = false
        timestampLine = null
        continue
      }

      // Exit when another Market section starts
      if (inRoiSection && line.startsWith('Market;') && !line.includes('ROI-DA')) {
        inRoiSection = false
        continue
      }

      if (inRoiSection && (line.startsWith('Index prices;30;EUR') || line.startsWith('Index prices;60;EUR'))) {
        foundEurPricesHeader = true
        timestampLine = null
        continue
      }

      // Capture the timestamp line (ISO dates with T and Z)
      if (foundEurPricesHeader && timestampLine === null && line.includes('T') && line.includes('Z')) {
        timestampLine = line
        continue
      }

      // Next line after timestamps is the prices
      if (foundEurPricesHeader && timestampLine !== null) {
        const timestamps = timestampLine.split(';').map(s => s.trim()).filter(Boolean)
        const prices: number[] = []
        for (const part of line.split(';')) {
          const v = parseFloat(part.trim().replace(/,/g, '.'))
          if (!isNaN(v)) prices.push(v)
        }
        if (prices.length >= 20 && timestamps.length === prices.length) {
          return { timestamps, prices }
        }
        // Reset and keep scanning
        foundEurPricesHeader = false
        timestampLine = null
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
    const searchUrl = `https://reports.semopx.com/api/v1/documents/static-reports?name=MarketResult_SEM-DA&group=Market+Data&page_size=10&sort_by=PublishTime&order_by=DESC`

    const searchResponse = await fetch(searchUrl, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 },
    })
    if (!searchResponse.ok) return null

    const searchData = await searchResponse.json()
    if (!searchData.items || searchData.items.length === 0) return null

    // Match by Date field (delivery/trading day, e.g. "2026-05-19T10:00:00")
    const selectedReport = searchData.items.find(
      (report: { Date?: string }) => report.Date?.startsWith(tradingDay)
    ) ?? null
    if (!selectedReport) return null

    const csvResponse = await fetch(`https://reports.semopx.com/documents/${selectedReport.ResourceName}`, {
      next: { revalidate: 300 },
    })
    if (!csvResponse.ok) return null

    const result = parseSemoCsv(await csvResponse.text())
    if (!result || result.prices.length < 20) return null

    const { prices } = result

    // SEMO day starts at UTC 22:00Z. Dublin midnight is later:
    //   Summer (IST = UTC+1): midnight = UTC 23:00Z = SEMO index 2
    //   Winter (GMT = UTC+0): midnight = UTC 00:00Z = SEMO index 4
    // Shift the array so index 0 = Dublin midnight, padding the tail with the last known price.
    const offsetHours = getDublinUtcOffsetHours(tradingDay)
    const shift = 2 * (2 - offsetHours) // 2 in summer, 4 in winter
    const aligned = [
      ...prices.slice(shift),
      ...Array(shift).fill(prices[prices.length - 1] ?? 0),
    ]

    return convertToPeriods(tradingDay, aligned, "SEMOPX", true)
  } catch {
    return null
  }
}

// Convert prices to 48 half-hourly periods aligned to Dublin midnight.
// halfHourly=true: each element in `prices` is one 30-min period (SEMO).
// halfHourly=false: each element covers 60 min, duplicated for two slots (ENTSO-E hourly).
function convertToPeriods(
  tradingDay: string,
  prices: number[],
  source: "SEMOPX" | "ENTSO-E" | "Interpolated",
  halfHourly = false,
): PricePeriod[] {
  const periods: PricePeriod[] = []
  const offsetHours = getDublinUtcOffsetHours(tradingDay)
  const offsetStr = offsetHours === 1 ? "+01:00" : "+00:00"

  for (let i = 0; i < 48; i++) {
    const priceIndex = halfHourly ? i : Math.floor(i / 2)
    const price = prices[priceIndex] ?? prices[Math.min(priceIndex, prices.length - 1)] ?? 0

    const hour = Math.floor(i / 2)
    const minute = (i % 2) * 30
    const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`

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
