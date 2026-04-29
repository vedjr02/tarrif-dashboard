import { fetchDayAheadPrices, getDublinDate, fetchMultipleDayPrices } from "@/lib/priceService"
import { NextResponse } from "next/server"

/**
 * GET /api/day-ahead-prices
 * 
 * Fetch Day-Ahead Market prices for multiple days
 * Returns data for yesterday, today, and tomorrow (in Dublin timezone)
 * 
 * Query params:
 * - daysOffset: Comma-separated list of day offsets (default: "-1,0,1" for yesterday/today/tomorrow)
 */
export async function GET(request: Request) {
  try {
    // Get optional query parameter for custom day offsets
    const url = new URL(request.url)
    const offsetsParam = url.searchParams.get("daysOffset")
    const offsets = offsetsParam 
      ? offsetsParam.split(",").map(s => parseInt(s.trim())) 
      : [-1, 0, 1] // Default: yesterday, today, tomorrow

    // Build array of dates to fetch
    const dates = offsets.map(offset => getDublinDate(offset))

    // Fetch all dates in parallel
    const priceMap = await fetchMultipleDayPrices(dates)

    // Return structured response
    const response = {
      yesterday: priceMap.get(getDublinDate(-1)) || null,
      today: priceMap.get(getDublinDate(0)) || null,
      tomorrow: priceMap.get(getDublinDate(1)) || null,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    })
  } catch (error) {
    console.error("[day-ahead-prices API] Error:", error)
    
    return NextResponse.json(
      {
        error: "Failed to fetch day-ahead prices",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
