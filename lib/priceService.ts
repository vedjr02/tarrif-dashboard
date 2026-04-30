/**
 * Price Service Module
 * 
 * Fetches real data from APIs (SEMOpx DAM, ENTSO-E, CRU retail tariffs) with no hardcoded prices.
 * Returns consolidated 30-min and hourly prices from primary source or fallback.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HourlyPrice {
  hour: number
  timestamp: string
  priceEurMwh: number
  source: "SEMOPX" | "ENTSOE_SYNTH" | "MISSING"
}

export interface DayAheadPriceResult {
  tradingDay: string
  prices: HourlyPrice[]
  source: "SEMOPX" | "ENTSOE_SYNTH" | "FALLBACK"
  fetchedAt: string
  isRealData: boolean
}

export interface RetailTariff {
  supplier: string
  unitRate: number // c/kWh
  standingCharge?: number // c/day
  source: "SEMOPX" | "CRU" | "FALLBACK"
}

// ============================================================================
// CONSTANTS
// ============================================================================

const IRELAND_BIDDING_ZONE = "10Y1001A1001A016"
const SEMOPX_RESOURCE_NAME = "MarketResult_SEM-DA"
const SEMOPX_API_BASE = "https://reports.semopx.com/api/v1"
const SEMOPX_DOCS_BASE = "https://reports.semopx.com/documents"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function getDublinDate(daysOffset = 0): string {
  const now = new Date()
  const dublinTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Dublin" }))
  dublinTime.setDate(dublinTime.getDate() + daysOffset)
  return formatDate(dublinTime)
}

// ============================================================================
// SEMOPX 30-MIN DAM DATA FETCHING
// ============================================================================

/**
 * Parse SEMOpx CSV with 30-min data
 * 
 * Structure:
 * - "Market Area;ROI-DA" section
 * - "Index prices;30;EUR" indicates 30-min resolution (48 values)
 * - "Index prices;60;EUR" indicates 60-min resolution (24 values, duplicate each)
 * - Timestamps and prices follow
 */
function parseSemopxCsv(csvContent: string): { periods: number[]; resolution: number } | null {
  try {
    const lines = csvContent.split("\n")
    let inRoiSection = false
    let resolution = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (line.startsWith("Market Area;ROI-DA")) {
        inRoiSection = true
        continue
      }

      if (inRoiSection && line.startsWith("Market Area;")) {
        inRoiSection = false
        continue
      }

      // Detect resolution: 30 or 60 minutes
      if (inRoiSection && line.startsWith("Index prices;")) {
        const parts = line.split(";")
        resolution = parseInt(parts[1]) || 0
        continue
      }

      // Parse price line (semicolon-separated, using comma as decimal separator)
      if (inRoiSection && resolution > 0 && line.includes(";") && !line.includes("T")) {
        const priceStrings = line.split(";").filter((s) => s.trim())
        const prices = priceStrings
          .map((p) => parseFloat(p.replace(",", ".")))
          .filter((p) => !isNaN(p) && p >= 0)

        if (prices.length >= 20) {
          return { periods: prices, resolution }
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Fetch SEMOpx 30-min (or 60-min) DAM prices for trading day
 * 
 * Step A: Query documents API for reports on the date
 * Step B: Download latest report's CSV, parse it
 * 
 * Period to UTC timestamp:
 * start_utc(period) = trading_day T00:00Z + (period - 3) × 30min
 */
async function fetchSemopxPrices(tradingDay: string): Promise<{ periods: number[]; resolution: number; source: "SEMOPX" } | null> {
  try {
    const listUrl = `${SEMOPX_API_BASE}/documents/static-reports?name=${SEMOPX_RESOURCE_NAME}&group=Market+Data&date_from=${tradingDay}&date_to=${tradingDay}&page_size=500&sort_by=PublishTime&order_by=DESC`

    const listRes = await fetch(listUrl, { next: { revalidate: 300 } })
    if (!listRes.ok) return null

    const listData = await listRes.json()
    if (!listData.items || listData.items.length === 0) return null

    const report = listData.items[0]
    if (!report.ResourceName) return null

    const csvUrl = `${SEMOPX_DOCS_BASE}/${report.ResourceName}`
    const csvRes = await fetch(csvUrl, { next: { revalidate: 300 } })
    if (!csvRes.ok) return null

    const csvContent = await csvRes.text()
    const parsed = parseSemopxCsv(csvContent)
    if (!parsed) return null

    return { ...parsed, source: "SEMOPX" as const }
  } catch {
    return null
  }
}

// ============================================================================
// RETAIL TARIFF FETCHING
// ============================================================================

/**
 * Fetch retail supplier tariffs from SEMOpx static reports
 * Falls back to CRU open data if unavailable
 */
async function fetchRetailTariffs(): Promise<RetailTariff[]> {
  try {
    // Try SEMOpx supplier tariff report
    const listUrl = `${SEMOPX_API_BASE}/documents/static-reports?name=SupplierTariff&group=Market+Data&page_size=50`
    const listRes = await fetch(listUrl, { next: { revalidate: 3600 } })

    if (listRes.ok) {
      const listData = await listRes.json()
      if (listData.items && listData.items.length > 0) {
        const report = listData.items[0]
        if (report.ResourceName) {
          const csvUrl = `${SEMOPX_DOCS_BASE}/${report.ResourceName}`
          const csvRes = await fetch(csvUrl, { next: { revalidate: 3600 } })
          if (csvRes.ok) {
            const csvContent = await csvRes.text()
            const tariffs = parseSemopxTariffsCsv(csvContent)
            if (tariffs.length > 0) {
              return tariffs.map((t) => ({ ...t, source: "SEMOPX" as const }))
            }
          }
        }
      }
    }

    // Fallback to CRU open data
    const cruUrl = "https://www.cru.ie/api/tariffs"
    const cruRes = await fetch(cruUrl, { next: { revalidate: 3600 } })
    if (cruRes.ok) {
      const cruData = await cruRes.json()
      if (Array.isArray(cruData)) {
        return cruData.map((t: any) => ({
          supplier: t.supplier || "Unknown",
          unitRate: (t.unitRate || 0) * 100, // Convert EUR to cents
          source: "CRU" as const,
        }))
      }
    }

    return []
  } catch {
    return []
  }
}

/**
 * Parse SEMOpx supplier tariff CSV
 * Expected format: supplier;unit_rate_eur_kwh;standing_charge_eur_day
 */
function parseSemopxTariffsCsv(csvContent: string): Omit<RetailTariff, "source">[] {
  try {
    const lines = csvContent.split("\n").filter((l) => l.trim())
    const tariffs: Omit<RetailTariff, "source">[] = []

    for (const line of lines) {
      const parts = line.split(";")
      if (parts.length >= 2) {
        const supplier = parts[0]?.trim()
        const unitRate = parseFloat(parts[1]?.replace(",", ".") || "0") * 100 // to cents
        const standingCharge = parts[2] ? parseFloat(parts[2].replace(",", ".")) * 100 : undefined

        if (supplier && unitRate > 0) {
          tariffs.push({ supplier, unitRate, standingCharge })
        }
      }
    }

    return tariffs
  } catch {
    return []
  }
}

// ============================================================================
// ENTSO-E HOURLY DATA (FALLBACK)
// ============================================================================

/**
 * Parse ENTSO-E XML response
 * Extract hourly prices from TimeSeries > Period > Point elements
 */
function parseEntsoeXml(xmlContent: string, tradingDay: string): number[] | null {
  try {
    const prices: { position: number; price: number }[] = []
    const tsMatches = xmlContent.match(/<TimeSeries>[\s\S]*?<\/TimeSeries>/g) || []

    for (const ts of tsMatches) {
      if (!ts.includes("A62") && !ts.includes("price")) continue

      const periodMatches = ts.match(/<Period>[\s\S]*?<\/Period>/g) || []
      for (const period of periodMatches) {
        const startMatch = period.match(/<start>([\d\-T:Z]+)<\/start>/)
        if (startMatch && !startMatch[1].startsWith(tradingDay)) continue

        const pointMatches = period.match(/<Point>[\s\S]*?<\/Point>/g) || []
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
    prices.sort((a, b) => a.position - b.position)
    return prices.map((p) => p.price)
  } catch {
    return null
  }
}

async function fetchEntsoeHourlyPrices(tradingDay: string): Promise<number[] | null> {
  const token = process.env.ENTSOE_API_TOKEN
  if (!token) return null

  try {
    const startDate = new Date(tradingDay + "T00:00:00Z")
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 1)

    const formatEntsoeDate = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0")
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}0000`
    }

    const url = `https://web-api.tp.entsoe.eu/api?documentType=A44&in_Domain=${IRELAND_BIDDING_ZONE}&out_Domain=${IRELAND_BIDDING_ZONE}&periodStart=${formatEntsoeDate(startDate)}&periodEnd=${formatEntsoeDate(endDate)}&securityToken=${token}`

    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return null

    const xmlContent = await res.text()

    // Check for error message
    if (xmlContent.includes("<Reason>")) {
      const reasonMatch = xmlContent.match(/<text>([^<]+)<\/text>/)
      console.error("[priceService] ENTSO-E error:", reasonMatch?.[1])
      return null
    }

    const prices = parseEntsoeXml(xmlContent, tradingDay)
    return prices && prices.length >= 20 ? prices : null
  } catch {
    return null
  }
}

// ============================================================================
// CONSOLIDATION & CONVERSION
// ============================================================================

/**
 * Convert 30-min or 60-min prices to 24 hourly prices
 * 
 * If resolution=30: 48 periods, average pairs into hours
 * If resolution=60: 24 periods, use directly
 */
function consolidatePeriodPrices(periods: number[], resolution: number): number[] {
  if (resolution === 60) {
    // Already hourly
    return periods.slice(0, 24)
  } else if (resolution === 30) {
    // Average pairs: (p[0]+p[1])/2, (p[2]+p[3])/2, ...
    const hourly: number[] = []
    for (let i = 0; i < 24; i++) {
      const idx = i * 2
      const avg = (periods[idx] + (periods[idx + 1] || periods[idx])) / 2
      hourly.push(avg)
    }
    return hourly
  }
  return []
}

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Fetch consolidated Day-Ahead prices for a trading day
 * Priority: SEMOpx (30-min) -> ENTSO-E (hourly) -> Interpolate missing
 */
export async function fetchDayAheadPrices(tradingDay?: string): Promise<DayAheadPriceResult> {
  const day = tradingDay || getDublinDate(0)

  // Try SEMOpx
  const semopxData = await fetchSemopxPrices(day)
  if (semopxData) {
    const hourlyPrices = consolidatePeriodPrices(semopxData.periods, semopxData.resolution)
    return {
      tradingDay: day,
      prices: hourlyPrices.map((price, hour) => ({
        hour,
        timestamp: new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+01:00`).toISOString(),
        priceEurMwh: Math.round(price * 100) / 100,
        source: "SEMOPX",
      })),
      source: "SEMOPX",
      fetchedAt: new Date().toISOString(),
      isRealData: true,
    }
  }

  // Try ENTSO-E
  const entsoeHourly = await fetchEntsoeHourlyPrices(day)
  if (entsoeHourly && entsoeHourly.length >= 20) {
    return {
      tradingDay: day,
      prices: entsoeHourly.slice(0, 24).map((price, hour) => ({
        hour,
        timestamp: new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+01:00`).toISOString(),
        priceEurMwh: Math.round(price * 100) / 100,
        source: "ENTSOE_SYNTH",
      })),
      source: "ENTSOE_SYNTH",
      fetchedAt: new Date().toISOString(),
      isRealData: true,
    }
  }

  // No data available
  return {
    tradingDay: day,
    prices: Array(24).fill(null).map((_, hour) => ({
      hour,
      timestamp: new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+01:00`).toISOString(),
      priceEurMwh: 0,
      source: "MISSING",
    })),
    source: "FALLBACK",
    fetchedAt: new Date().toISOString(),
    isRealData: false,
  }
}

/**
 * Fetch retail tariffs from live APIs
 * No fallback to hardcoded values - shows warning banner if unavailable
 */
export async function getRetailTariffs(): Promise<{ tariffs: RetailTariff[]; dataAvailable: boolean; warning?: string }> {
  const tariffs = await fetchRetailTariffs()

  if (tariffs.length === 0) {
    return {
      tariffs: [],
      dataAvailable: false,
      warning: "Retail tariff data unavailable — live API returned no results",
    }
  }

  return { tariffs, dataAvailable: true }
}
