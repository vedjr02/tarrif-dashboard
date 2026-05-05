import { NextResponse } from "next/server"

// EirGrid Smart Grid Dashboard API
const EIRGRID_API_BASE = "https://www.smartgriddashboard.com/DashboardService.svc/data"

interface EirGridDataPoint {
  EffectiveTime: string
  Value: number
  FieldName: string
  Region: string
}

interface WindData {
  timestamp: string
  actual: number | null
  forecast: number | null
}

interface GridStatus {
  frequency: number | null
  co2Intensity: number | null
  renewablePercent: number | null
  windGeneration: number | null
  totalGeneration: number | null
  demand: number | null
}

export async function GET() {
  try {
    // Get today's date range for Dublin timezone
    const now = new Date()
    const dublinFormatter = new Intl.DateTimeFormat("en-IE", {
      timeZone: "Europe/Dublin",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    
    const today = dublinFormatter.format(now).replace(/ /g, "-")
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStr = dublinFormatter.format(tomorrow).replace(/ /g, "-")
    
    // Format for API: DD-Mon-YYYY (e.g., 05-May-2026)
    const formatApiDate = (date: Date) => {
      const d = date.getDate().toString().padStart(2, "0")
      const m = date.toLocaleString("en-IE", { month: "short", timeZone: "Europe/Dublin" })
      const y = date.getFullYear()
      return `${d}-${m}-${y}`
    }
    
    const todayApi = formatApiDate(now)
    const tomorrowApi = formatApiDate(tomorrow)
    
    // Fetch multiple data types in parallel
    const [windActualRes, windForecastRes, frequencyRes, co2Res, generationRes, demandRes] = await Promise.all([
      fetch(`${EIRGRID_API_BASE}?area=windactual&region=ROI&datefrom=${todayApi}+00:00&dateto=${tomorrowApi}+00:00`, {
        next: { revalidate: 300 } // Cache for 5 minutes
      }),
      fetch(`${EIRGRID_API_BASE}?area=windforecast&region=ROI&datefrom=${todayApi}+00:00&dateto=${tomorrowApi}+23:59`, {
        next: { revalidate: 300 }
      }),
      fetch(`${EIRGRID_API_BASE}?area=frequency&region=ROI&datefrom=${todayApi}+00:00&dateto=${todayApi}+23:59`, {
        next: { revalidate: 60 }
      }),
      fetch(`${EIRGRID_API_BASE}?area=co2intensity&region=ROI&datefrom=${todayApi}+00:00&dateto=${todayApi}+23:59`, {
        next: { revalidate: 300 }
      }),
      fetch(`${EIRGRID_API_BASE}?area=generationactual&region=ROI&datefrom=${todayApi}+00:00&dateto=${todayApi}+23:59`, {
        next: { revalidate: 300 }
      }),
      fetch(`${EIRGRID_API_BASE}?area=demandactual&region=ROI&datefrom=${todayApi}+00:00&dateto=${todayApi}+23:59`, {
        next: { revalidate: 300 }
      }),
    ])
    
    // Parse responses
    const parseResponse = async (res: Response): Promise<EirGridDataPoint[]> => {
      if (!res.ok) return []
      try {
        const data = await res.json()
        return Array.isArray(data?.Rows) ? data.Rows : []
      } catch {
        return []
      }
    }
    
    const [windActual, windForecast, frequency, co2, generation, demand] = await Promise.all([
      parseResponse(windActualRes),
      parseResponse(windForecastRes),
      parseResponse(frequencyRes),
      parseResponse(co2Res),
      parseResponse(generationRes),
      parseResponse(demandRes),
    ])
    
    // Process wind data - combine actual and forecast
    const windMap = new Map<string, WindData>()
    
    for (const point of windActual) {
      const time = point.EffectiveTime
      if (!windMap.has(time)) {
        windMap.set(time, { timestamp: time, actual: null, forecast: null })
      }
      windMap.get(time)!.actual = point.Value
    }
    
    for (const point of windForecast) {
      const time = point.EffectiveTime
      if (!windMap.has(time)) {
        windMap.set(time, { timestamp: time, actual: null, forecast: null })
      }
      windMap.get(time)!.forecast = point.Value
    }
    
    // Sort by timestamp
    const windData = Array.from(windMap.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    // Get latest values for grid status
    const getLatestValue = (data: EirGridDataPoint[]): number | null => {
      if (data.length === 0) return null
      // Sort by time descending and get latest
      const sorted = [...data].sort((a, b) => 
        new Date(b.EffectiveTime).getTime() - new Date(a.EffectiveTime).getTime()
      )
      return sorted[0]?.Value ?? null
    }
    
    const latestWind = getLatestValue(windActual)
    const latestGeneration = getLatestValue(generation)
    const renewablePercent = latestWind && latestGeneration && latestGeneration > 0
      ? (latestWind / latestGeneration) * 100
      : null
    
    const gridStatus: GridStatus = {
      frequency: getLatestValue(frequency),
      co2Intensity: getLatestValue(co2),
      renewablePercent,
      windGeneration: latestWind,
      totalGeneration: latestGeneration,
      demand: getLatestValue(demand),
    }
    
    return NextResponse.json({
      windData,
      gridStatus,
      fetchedAt: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error("[EirGrid API] Error:", error)
    return NextResponse.json(
      { 
        windData: [], 
        gridStatus: {
          frequency: null,
          co2Intensity: null,
          renewablePercent: null,
          windGeneration: null,
          totalGeneration: null,
          demand: null,
        },
        error: "Failed to fetch EirGrid data",
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 } // Return 200 with empty data to avoid breaking UI
    )
  }
}
