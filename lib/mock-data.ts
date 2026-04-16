import type { DayPrices, CurrentPrice, HistoryDay, BackendStatus, PricePeriod } from "./types"

// Generate realistic Irish DAM prices with typical daily pattern
function generateDayPrices(dateStr: string, isHoliday = false): DayPrices {
  const date = new Date(dateStr)
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  
  // Base prices with typical daily pattern (higher morning/evening, lower night/midday)
  const basePattern = [
    45, 42, 38, 35, 33, 32, 35, 48, 72, 85, 92, 88, // 00:00 - 05:30
    82, 78, 75, 72, 68, 65, 62, 58, 55, 52, 68, 85, // 06:00 - 11:30
    95, 102, 98, 92, 88, 82, 78, 85, 92, 105, 118, 125, // 12:00 - 17:30
    135, 142, 138, 128, 115, 98, 85, 72, 62, 55, 50, 48, // 18:00 - 23:30
  ]
  
  // Add some randomness
  const periods: PricePeriod[] = basePattern.map((basePrice, index) => {
    const variance = (Math.random() - 0.5) * 30
    const price = Math.max(15, basePrice + variance + (isWeekend ? -15 : 0) + (isHoliday ? -20 : 0))
    
    const startHour = Math.floor(index / 2)
    const startMinute = (index % 2) * 30
    
    const utcDate = new Date(date)
    utcDate.setUTCHours(startHour - 1, startMinute, 0, 0) // Dublin is UTC+1 in winter
    
    const dublinDate = new Date(date)
    dublinDate.setHours(startHour, startMinute, 0, 0)
    
    return {
      period: index + 1,
      start_time_utc: utcDate.toISOString(),
      start_time_dublin: dublinDate.toISOString().replace("Z", "+01:00"),
      price_eur_mwh: Math.round(price * 100) / 100,
      quintile: 3 as 1 | 2 | 3 | 4 | 5, // Will be calculated below
      source: Math.random() > 0.1 ? "SEMOPX" : Math.random() > 0.5 ? "ENTSO-E" : "Interpolated",
    }
  })
  
  // Calculate quintiles based on sorted prices
  const sortedPrices = [...periods].sort((a, b) => a.price_eur_mwh - b.price_eur_mwh)
  const quintileSize = Math.ceil(periods.length / 5)
  
  sortedPrices.forEach((period, index) => {
    const quintile = Math.min(5, Math.floor(index / quintileSize) + 1) as 1 | 2 | 3 | 4 | 5
    const originalPeriod = periods.find(p => p.period === period.period)
    if (originalPeriod) {
      originalPeriod.quintile = quintile
    }
  })
  
  const publishedAt = new Date(date)
  publishedAt.setDate(publishedAt.getDate() - 1)
  publishedAt.setHours(13, 42, 0, 0)
  
  return {
    trading_day: dateStr,
    day_type: isWeekend ? "weekend" : "weekday",
    holiday: isHoliday,
    published_at: publishedAt.toISOString(),
    periods,
  }
}

// Get today's date in YYYY-MM-DD format
function getDateString(daysOffset = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split("T")[0]
}

// Generate mock data for today
export function getTodayPrices(): DayPrices {
  return generateDayPrices(getDateString(0))
}

// Generate mock data for tomorrow (if available after 13:00)
export function getTomorrowPrices(): DayPrices | null {
  const now = new Date()
  if (now.getHours() >= 13) {
    return generateDayPrices(getDateString(1))
  }
  return null
}

// Generate mock data for yesterday
export function getYesterdayPrices(): DayPrices {
  return generateDayPrices(getDateString(-1))
}

// Get current period based on Dublin time
export function getCurrentPeriod(dayPrices: DayPrices): CurrentPrice {
  const now = new Date()
  const dublinHour = now.getHours()
  const dublinMinute = now.getMinutes()
  const currentPeriodIndex = dublinHour * 2 + (dublinMinute >= 30 ? 1 : 0)
  
  const period = dayPrices.periods[Math.min(currentPeriodIndex, 47)]
  const prices = dayPrices.periods.map(p => p.price_eur_mwh)
  
  return {
    ...period,
    daily_avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
    daily_min: Math.min(...prices),
    daily_max: Math.max(...prices),
  }
}

// Generate historical data
export function getHistoricalData(days = 30): HistoryDay[] {
  const history: HistoryDay[] = []
  
  for (let i = days; i > 0; i--) {
    const dateStr = getDateString(-i)
    const dayData = generateDayPrices(dateStr)
    const prices = dayData.periods.map(p => p.price_eur_mwh)
    
    history.push({
      date: dateStr,
      avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
      min: Math.min(...prices),
      max: Math.max(...prices),
      day_type: dayData.day_type,
      holiday: dayData.holiday,
    })
  }
  
  return history
}

// Get backend status
export function getBackendStatus(): BackendStatus {
  const now = new Date()
  now.setMinutes(now.getMinutes() - 2)
  
  return {
    last_scrape: now.toISOString(),
    backend: "ok",
    missing_days: 0,
    semopx_periods: 45,
    entsoe_periods: 2,
    interpolated_periods: 1,
  }
}

// Find cheapest window in upcoming periods
export function findCheapestWindow(periods: PricePeriod[], windowSize = 4): { start: number; avgPrice: number } {
  let minAvg = Infinity
  let bestStart = 0
  
  for (let i = 0; i <= periods.length - windowSize; i++) {
    const windowPrices = periods.slice(i, i + windowSize).map(p => p.price_eur_mwh)
    const avg = windowPrices.reduce((a, b) => a + b, 0) / windowSize
    
    if (avg < minAvg) {
      minAvg = avg
      bestStart = i
    }
  }
  
  return { start: bestStart, avgPrice: Math.round(minAvg * 100) / 100 }
}
