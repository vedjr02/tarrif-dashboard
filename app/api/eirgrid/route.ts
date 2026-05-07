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

interface WeatherData {
  temperature: number // °C
  humidity: number // %
  precipitation: number // mm
  cloudCover: number // %
  weatherCode: number // WMO weather code
}

interface GridStatus {
  frequency: number | null
  co2Intensity: number | null
  demand: number | null
}

export async function GET() {
  try {
    // Fetch wind forecast and weather from Open-Meteo (always works)
    const windForecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${DUBLIN_LAT}&longitude=${DUBLIN_LON}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,relative_humidity_2m,precipitation,cloud_cover,weather_code&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,weather_code&timezone=Europe%2FDublin&forecast_days=2&past_days=1`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    )
    
    let windData: WindDataPoint[] = []
    let currentWeather: WeatherData | null = null
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
        
        // Parse current weather
        if (windJson.current) {
          currentWeather = {
            temperature: windJson.current.temperature_2m ?? 0,
            humidity: windJson.current.relative_humidity_2m ?? 0,
            precipitation: windJson.current.precipitation ?? 0,
            cloudCover: windJson.current.cloud_cover ?? 0,
            weatherCode: windJson.current.weather_code ?? 0,
          }
        }
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
      
      // Parse and get the LAST non-null value from the response (most recent with actual data)
      const getLatestFromResponse = async (res: Response, fieldName: string): Promise<number | null> => {
        if (!res.ok) return null
        try {
          const data = await res.json()
          const rows = Array.isArray(data?.Rows) ? data.Rows : []
          if (rows.length === 0) return null
          // Find the last row with a non-null Value (future times have null values)
          for (let i = rows.length - 1; i >= 0; i--) {
            if (typeof rows[i]?.Value === 'number') {
              return rows[i].Value
            }
          }
          return null
        } catch {
          return null
        }
      }
      
      const [frequencyVal, co2Val, demandVal] = await Promise.all([
        getLatestFromResponse(frequencyRes, 'frequency'),
        getLatestFromResponse(co2Res, 'co2'),
        getLatestFromResponse(demandRes, 'demand'),
      ])
      
      gridStatus = {
        frequency: frequencyVal,
        co2Intensity: co2Val,
        demand: demandVal,
      }
      
      gridError = !Object.values(gridStatus).some(v => v !== null)
    } catch {
      gridError = true
    }
    
    return NextResponse.json({
      windData,
      gridStatus,
      currentWeather,
      fetchedAt: new Date().toISOString(),
      hasWindData: windData.length > 0,
      hasGridData: !gridError,
      hasWeatherData: currentWeather !== null,
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
