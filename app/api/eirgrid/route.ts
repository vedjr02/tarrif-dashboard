import { NextResponse } from "next/server"

// Open-Meteo API for wind forecast (free, no API key needed)
// Using Dublin coordinates as reference for Ireland
const DUBLIN_LAT = 53.3498
const DUBLIN_LON = -6.2603

// EirGrid Smart Grid Dashboard API for grid status
const EIRGRID_API_BASE = "https://www.smartgriddashboard.com/DashboardService.svc/data"

interface EirGridDataPoint {
  EffectiveTime: string
  Value: number
  FieldName: string
  Region: string
}

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

export async function GET() {
  try {
    // Fetch wind forecast from Open-Meteo (always works)
    const windForecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${DUBLIN_LAT}&longitude=${DUBLIN_LON}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Europe%2FDublin&forecast_days=2&past_days=1`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    )
    
    let windData: WindDataPoint[] = []
    let windError = false
    
    if (windForecastRes.ok) {
      try {
        const windJson = await windForecastRes.json()
        const times = windJson.hourly?.time || []
        const speeds = windJson.hourly?.wind_speed_10m || []
        const directions = windJson.hourly?.wind_direction_10m || []
        const gusts = windJson.hourly?.wind_gusts_10m || []
        
        windData = times.map((time: string, i: number) => ({
          timestamp: time,
          windSpeed: speeds[i] ?? 0,
          windDirection: directions[i] ?? 0,
          windGusts: gusts[i] ?? 0,
        }))
      } catch {
        windError = true
      }
    } else {
      windError = true
    }
    
    // Fetch grid status from EirGrid (may fail)
    let gridStatus: GridStatus = {
      frequency: null,
      co2Intensity: null,
      demand: null,
    }
    let gridError = false
    
    try {
      const now = new Date()
      const formatApiDate = (date: Date) => {
        const d = date.getDate().toString().padStart(2, "0")
        const m = date.toLocaleString("en-IE", { month: "short", timeZone: "Europe/Dublin" })
        const y = date.getFullYear()
        return `${d}-${m}-${y}`
      }
      const todayApi = formatApiDate(now)
      
      const [frequencyRes, co2Res, demandRes] = await Promise.all([
        fetch(`${EIRGRID_API_BASE}?area=frequency&region=ROI&datefrom=${todayApi}+00:00&dateto=${todayApi}+23:59`, {
          next: { revalidate: 60 }
        }),
        fetch(`${EIRGRID_API_BASE}?area=co2intensity&region=ROI&datefrom=${todayApi}+00:00&dateto=${todayApi}+23:59`, {
          next: { revalidate: 300 }
        }),
        fetch(`${EIRGRID_API_BASE}?area=demandactual&region=ROI&datefrom=${todayApi}+00:00&dateto=${todayApi}+23:59`, {
          next: { revalidate: 300 }
        }),
      ])
      
      const parseResponse = async (res: Response): Promise<EirGridDataPoint[]> => {
        if (!res.ok) return []
        try {
          const data = await res.json()
          return Array.isArray(data?.Rows) ? data.Rows : []
        } catch {
          return []
        }
      }
      
      const [frequency, co2, demand] = await Promise.all([
        parseResponse(frequencyRes),
        parseResponse(co2Res),
        parseResponse(demandRes),
      ])
      
      const getLatestValue = (data: EirGridDataPoint[]): number | null => {
        if (data.length === 0) return null
        const sorted = [...data].sort((a, b) => 
          new Date(b.EffectiveTime).getTime() - new Date(a.EffectiveTime).getTime()
        )
        return sorted[0]?.Value ?? null
      }
      
      gridStatus = {
        frequency: getLatestValue(frequency),
        co2Intensity: getLatestValue(co2),
        demand: getLatestValue(demand),
      }
      
      gridError = !Object.values(gridStatus).some(v => v !== null)
    } catch {
      gridError = true
    }
    
    return NextResponse.json({
      windData,
      gridStatus,
      fetchedAt: new Date().toISOString(),
      hasWindData: windData.length > 0,
      hasGridData: !gridError,
      windError,
      gridError,
    })
    
  } catch (error) {
    console.error("[Grid API] Error:", error)
    return NextResponse.json({
      windData: [],
      gridStatus: {
        frequency: null,
        co2Intensity: null,
        demand: null,
      },
      fetchedAt: new Date().toISOString(),
      hasWindData: false,
      hasGridData: false,
      windError: true,
      gridError: true,
    }, { status: 200 })
  }
}
