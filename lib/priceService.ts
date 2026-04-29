/**
 * Price Service Module
 * 
 * This module provides an API-agnostic interface for fetching Day-Ahead Market prices.
 * It automatically switches between SEMO and ENTSO-E based on environment configuration.
 * 
 * Data flow:
 * 1. Try ENTSO-E if ENTSOE_API_TOKEN is set (preferred - has historical data)
 * 2. Fall back to SEMO (limited to recent data only)
 * 3. Generate realistic fallback prices if both fail
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HourlyPrice {
  /** Hour of the day (0-23) */
  hour: number
  /** ISO timestamp for the start of this hour */
  timestamp: string
  /** Price in EUR/MWh */
  priceEurMwh: number
  /** Data source: "SEMO" | "ENTSOE" | "FALLBACK" */
  source: "SEMO" | "ENTSOE" | "FALLBACK"
}

export interface DayAheadPriceResult {
  /** Trading day in YYYY-MM-DD format */
  tradingDay: string
  /** Array of 24 hourly prices */
  prices: HourlyPrice[]
  /** Primary data source used */
  source: "SEMO" | "ENTSOE" | "FALLBACK"
  /** ISO timestamp when data was fetched */
  fetchedAt: string
  /** Whether this is real market data or generated fallback */
  isRealData: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Ireland bidding zone code for ENTSO-E
// This identifies the Single Electricity Market (SEM) area
const IRELAND_BIDDING_ZONE = "10Y1001A1001A016"

// SEMO report resource name for Day-Ahead Market results
const SEMO_RESOURCE_NAME = "MarketResult_SEM-DA"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Format date for ENTSO-E API (YYYYMMDDHHMM format)
 * ENTSO-E requires this specific format for periodStart/periodEnd params
 */
function formatEntsoeDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}${month}${day}0000`
}

/**
 * Get Dublin date for a given offset from today
 * All trading days are based on Dublin timezone
 */
export function getDublinDate(daysOffset = 0): string {
  const now = new Date()
  const dublinTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Dublin" }))
  dublinTime.setDate(dublinTime.getDate() + daysOffset)
  return formatDate(dublinTime)
}

// ============================================================================
// ENTSO-E DATA SOURCE
// TODO: ENTSO-E provides the most reliable historical data
// To enable: Set ENTSOE_API_TOKEN environment variable
// Get free token at: https://transparency.entsoe.eu (register -> My Account -> Web API Security Token)
// ============================================================================

/**
 * Parse ENTSO-E XML response to extract hourly prices
 * 
 * ENTSO-E returns XML with TimeSeries containing Period elements.
 * Each Period has Point elements with position (hour) and price.amount (EUR/MWh)
 * 
 * TODO: When migrating to ENTSO-E:
 * - Response format: XML with <TimeSeries><Period><Point> structure
 * - price.amount is already in EUR/MWh (no conversion needed)
 * - position is 1-indexed (subtract 1 for hour)
 * - May need to handle DST transitions (23 or 25 hours)
 */
function parseEntsoeXml(xmlContent: string, tradingDay: string): number[] | null {
  try {
    const prices: { position: number; price: number }[] = []
    
    // Find all TimeSeries blocks
    const timeSeriesMatches = xmlContent.match(/<TimeSeries>[\s\S]*?<\/TimeSeries>/g)
    if (!timeSeriesMatches) return null
    
    for (const ts of timeSeriesMatches) {
      // Skip volume data - we only want price data
      if (!ts.includes("A62") && !ts.includes("price")) continue
      
      const periodMatch = ts.match(/<Period>[\s\S]*?<\/Period>/g)
      if (!periodMatch) continue
      
      for (const period of periodMatch) {
        // Verify this period is for the correct trading day
        const startMatch = period.match(/<start>([\d\-T:Z]+)<\/start>/)
        if (startMatch) {
          const startDate = startMatch[1].split("T")[0]
          if (startDate !== tradingDay) continue
        }
        
        // Extract all price points
        // Point structure: <Point><position>N</position><price.amount>X.XX</price.amount></Point>
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
    
    // Sort by position and return just the prices
    prices.sort((a, b) => a.position - b.position)
    return prices.map(p => p.price)
  } catch {
    return null
  }
}

/**
 * Fetch prices from ENTSO-E Transparency Platform
 * 
 * API endpoint: https://web-api.tp.entsoe.eu/api
 * Document type: A44 (Price document)
 * Required params: documentType, in_Domain, out_Domain, periodStart, periodEnd, securityToken
 */
async function fetchEntsoePrices(tradingDay: string): Promise<HourlyPrice[] | null> {
  // Check if ENTSO-E token is configured
  const token = process.env.ENTSOE_API_TOKEN
  if (!token) {
    // No token = skip ENTSO-E, fall through to SEMO
    return null
  }
  
  try {
    const startDate = new Date(tradingDay + "T00:00:00Z")
    const endDate = new Date(tradingDay + "T23:59:59Z")
    endDate.setDate(endDate.getDate() + 1)
    
    // Build ENTSO-E API URL
    // documentType=A44 is for Day-ahead prices
    // in_Domain and out_Domain should both be the Ireland bidding zone
    const url = `https://web-api.tp.entsoe.eu/api?documentType=A44&in_Domain=${IRELAND_BIDDING_ZONE}&out_Domain=${IRELAND_BIDDING_ZONE}&periodStart=${formatEntsoeDate(startDate)}&periodEnd=${formatEntsoeDate(endDate)}&securityToken=${token}`
    
    const response = await fetch(url, { next: { revalidate: 300 } })
    
    if (!response.ok) {
      console.error(`[priceService] ENTSO-E returned ${response.status}`)
      return null
    }
    
    const xmlContent = await response.text()
    const hourlyPrices = parseEntsoeXml(xmlContent, tradingDay)
    
    // Validate we got enough data (at least 20 hours)
    if (!hourlyPrices || hourlyPrices.length < 20) {
      return null
    }
    
    // Convert to HourlyPrice format
    return hourlyPrices.map((price, hour) => ({
      hour,
      timestamp: new Date(`${tradingDay}T${hour.toString().padStart(2, "0")}:00:00+01:00`).toISOString(),
      priceEurMwh: Math.round(price * 100) / 100,
      source: "ENTSOE" as const,
    }))
  } catch (error) {
    console.error("[priceService] ENTSO-E fetch error:", error)
    return null
  }
}

// ============================================================================
// SEMO DATA SOURCE
// Primary source when ENTSO-E token is not available
// SEMO publishes Day-Ahead Market results as CSV files
// ============================================================================

/**
 * Parse SEMO CSV and extract ROI-DA (Republic of Ireland Day-Ahead) prices
 * 
 * CSV structure:
 * - Header rows with metadata
 * - "Market Area;ROI-DA" section for Ireland prices
 * - "Index prices;60;EUR" row indicates hourly EUR prices follow
 * - Next data row contains 24 semicolon-separated price values
 * 
 * TODO: When modifying SEMO parsing:
 * - ROI-DA = Republic of Ireland, NI-DA = Northern Ireland
 * - Prices are already in EUR/MWh
 * - Values use comma as decimal separator in some locales
 */
function parseSemoCsv(csvContent: string): number[] | null {
  try {
    const lines = csvContent.split('\n')
    let inRoiSection = false
    let foundEurPrices = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Start of ROI-DA section
      if (line.startsWith('Market Area;ROI-DA')) {
        inRoiSection = true
        foundEurPrices = false
        continue
      }
      
      // End of ROI-DA section (new market area started)
      if (inRoiSection && line.startsWith('Market Area;') && !line.includes('ROI-DA')) {
        inRoiSection = false
        continue
      }
      
      // Found EUR price indicator row
      if (inRoiSection && line.startsWith('Index prices;60;EUR')) {
        foundEurPrices = true
        continue
      }
      
      // Skip timestamp metadata line
      if (foundEurPrices && line.includes('T') && line.includes('Z')) {
        continue
      }
      
      // Parse the actual prices line
      // Format: price1;price2;price3;...price24
      if (inRoiSection && foundEurPrices && line.includes(';') && !line.includes('T')) {
        const priceStrings = line.split(';').filter(s => s.trim() && !isNaN(parseFloat(s.replace(',', '.'))))
        
        if (priceStrings.length >= 20) {
          // Convert comma decimals to dot and parse
          const prices = priceStrings.map(p => parseFloat(p.replace(',', '.')))
          if (prices.every(p => !isNaN(p) && p >= 0)) {
            return prices
          }
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Fetch real DAM prices from SEMO for a specific date
 * 
 * SEMO API: https://reports.sem-o.com/api/v1/documents/static-reports
 * Filter by ResourceName=MarketResult_SEM-DA for Day-Ahead Market results
 * DateRetention field indicates the delivery date
 */
async function fetchSemoPrices(tradingDay: string): Promise<HourlyPrice[] | null> {
  try {
    // Search for recent Day-Ahead Market reports
    const searchUrl = `https://reports.sem-o.com/api/v1/documents/static-reports?ResourceName=${SEMO_RESOURCE_NAME}&page_size=30&sort_by=PublishTime%20desc`
    
    const searchResponse = await fetch(searchUrl, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })
    
    if (!searchResponse.ok) {
      console.error(`[priceService] SEMO search returned ${searchResponse.status}`)
      return null
    }
    
    const searchData = await searchResponse.json()
    
    if (!searchData.items || searchData.items.length === 0) {
      return null
    }
    
    // Find report matching the requested trading day
    // DateRetention format: YYYY-MM-DD
    const targetDate = tradingDay.replace(/-/g, '')
    
    let selectedReport = null
    for (const report of searchData.items) {
      // Check DateRetention field for delivery date match
      const retentionDate = report.DateRetention?.replace(/-/g, '') || ''
      if (retentionDate.startsWith(targetDate)) {
        selectedReport = report
        break
      }
      
      // Also check filename for date
      const resourceName = report.ResourceName || ''
      if (resourceName.includes(targetDate.substring(0, 8))) {
        selectedReport = report
        break
      }
    }
    
    // If no exact match, use most recent (for tomorrow's data which may not be published yet)
    if (!selectedReport) {
      selectedReport = searchData.items[0]
    }
    
    // Download the CSV file
    const csvUrl = `https://reports.sem-o.com/documents/${selectedReport.ResourceName}`
    
    const csvResponse = await fetch(csvUrl, { next: { revalidate: 300 } })
    if (!csvResponse.ok) {
      console.error(`[priceService] SEMO CSV download returned ${csvResponse.status}`)
      return null
    }
    
    const csvContent = await csvResponse.text()
    const hourlyPrices = parseSemoCsv(csvContent)
    
    if (!hourlyPrices || hourlyPrices.length < 20) {
      return null
    }
    
    // Convert to HourlyPrice format
    return hourlyPrices.map((price, hour) => ({
      hour,
      timestamp: new Date(`${tradingDay}T${hour.toString().padStart(2, "0")}:00:00+01:00`).toISOString(),
      priceEurMwh: Math.round(price * 100) / 100,
      source: "SEMO" as const,
    }))
  } catch (error) {
    console.error("[priceService] SEMO fetch error:", error)
    return null
  }
}

// ============================================================================
// FALLBACK DATA GENERATION
// Used when both ENTSO-E and SEMO are unavailable
// Generates realistic prices based on typical Irish DAM patterns
// ============================================================================

/**
 * Generate realistic fallback prices based on typical Irish DAM patterns
 * 
 * Profile characteristics:
 * - Night (00:00-06:00): Low demand, prices ~35-55 EUR/MWh
 * - Morning ramp (06:00-10:00): Rising prices as demand increases
 * - Midday (10:00-16:00): Moderate prices, some solar impact
 * - Evening peak (16:00-21:00): Highest prices, peak demand
 * - Late evening (21:00-24:00): Declining prices
 * 
 * Adjustments:
 * - Seasonal: Winter 30% higher, Summer 20% lower
 * - Weekend: 25% lower than weekday
 * - Uses date as seed for consistent results per day
 */
function generateFallbackPrices(tradingDay: string): HourlyPrice[] {
  const date = new Date(tradingDay)
  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const month = date.getMonth()
  
  // Seasonal adjustment factor
  const seasonalFactor = month >= 10 || month <= 2 ? 1.3 : month >= 5 && month <= 8 ? 0.8 : 1.0
  
  // Weekend adjustment factor
  const weekdayFactor = isWeekend ? 0.75 : 1.0
  
  // Use date as seed for consistent prices
  const seed = date.getTime()
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index * 1000) * 10000
    return x - Math.floor(x)
  }

  // Typical hourly price profile (EUR/MWh)
  const baseProfile = [
    // 00:00-05:00 - Night low
    52, 48, 45, 42, 40, 38,
    // 06:00-09:00 - Morning ramp
    45, 65, 85, 105,
    // 10:00-15:00 - Midday
    115, 110, 100, 95, 90, 85,
    // 16:00-20:00 - Evening peak
    95, 125, 155, 170, 165,
    // 21:00-23:00 - Evening decline
    140, 110, 80
  ]

  return baseProfile.map((basePrice, hour) => {
    // Add random variation (-15 to +15 EUR/MWh)
    const randomVariation = (seededRandom(hour) - 0.5) * 30
    const price = Math.max(15, Math.min(300, basePrice * seasonalFactor * weekdayFactor + randomVariation))
    
    return {
      hour,
      timestamp: new Date(`${tradingDay}T${hour.toString().padStart(2, "0")}:00:00+01:00`).toISOString(),
      priceEurMwh: Math.round(price * 100) / 100,
      source: "FALLBACK" as const,
    }
  })
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Fetch Day-Ahead prices for a specific trading day
 * 
 * Priority:
 * 1. ENTSO-E (if ENTSOE_API_TOKEN is set) - best for historical data
 * 2. SEMO (default) - official Irish market data
 * 3. Fallback (generated) - when both APIs fail
 * 
 * @param tradingDay - Date in YYYY-MM-DD format, defaults to today (Dublin time)
 * @returns Promise<DayAheadPriceResult> with 24 hourly prices
 */
export async function fetchDayAheadPrices(tradingDay?: string): Promise<DayAheadPriceResult> {
  const day = tradingDay || getDublinDate(0)
  
  // Try ENTSO-E first (requires API token)
  const entsoePrices = await fetchEntsoePrices(day)
  if (entsoePrices && entsoePrices.length >= 20) {
    return {
      tradingDay: day,
      prices: entsoePrices,
      source: "ENTSOE",
      fetchedAt: new Date().toISOString(),
      isRealData: true,
    }
  }
  
  // Try SEMO
  const semoPrices = await fetchSemoPrices(day)
  if (semoPrices && semoPrices.length >= 20) {
    return {
      tradingDay: day,
      prices: semoPrices,
      source: "SEMO",
      fetchedAt: new Date().toISOString(),
      isRealData: true,
    }
  }
  
  // Fallback to generated prices
  const fallbackPrices = generateFallbackPrices(day)
  return {
    tradingDay: day,
    prices: fallbackPrices,
    source: "FALLBACK",
    fetchedAt: new Date().toISOString(),
    isRealData: false,
  }
}

/**
 * Fetch prices for multiple days at once
 * Useful for getting yesterday, today, and tomorrow in one call
 */
export async function fetchMultipleDayPrices(days: string[]): Promise<Map<string, DayAheadPriceResult>> {
  const results = await Promise.all(days.map(day => fetchDayAheadPrices(day)))
  
  const map = new Map<string, DayAheadPriceResult>()
  days.forEach((day, index) => {
    map.set(day, results[index])
  })
  
  return map
}
