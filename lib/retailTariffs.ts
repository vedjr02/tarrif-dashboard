// Irish Retail Electricity Tariffs - May 2026
// Source: Selectra.ie, verified May 2026
// All rates in c/kWh, excl. VAT, incl. discounts

export interface RetailTariff {
  id: string
  supplier: string
  planName: string
  type: "flat" | "daynight" | "tou" | "ev"  // flat=24hr, daynight=day/night, tou=day/night/peak, ev=EV special
  // Rates in c/kWh
  rate24h?: number       // For flat plans
  dayRate?: number       // Day rate (08:00-23:00 for daynight, 08:00-17:00 & 19:00-23:00 for tou)
  nightRate?: number     // Night rate (23:00-08:00)
  peakRate?: number      // Peak rate (17:00-19:00) - only for tou
  evRate?: number        // EV charging rate (02:00-05:00) - only for ev plans
  standingCharge: number // €/year
}

// Time bands (Dublin time):
// Night: 23:00 - 08:00
// Day: 08:00 - 17:00 and 19:00 - 23:00
// Peak: 17:00 - 19:00
// EV Boost: 02:00 - 05:00 (for EV plans)

export const RETAIL_TARIFFS: RetailTariff[] = [
  // ==================== SSE AIRTRICITY ====================
  {
    id: "sse-standard-24hr",
    supplier: "SSE Airtricity",
    planName: "Standard 24hr",
    type: "flat",
    rate24h: 28.30,
    standingCharge: 242.07,
  },
  {
    id: "sse-smart-electricity",
    supplier: "SSE Airtricity",
    planName: "Smart Electricity",
    type: "tou",
    dayRate: 29.95,
    nightRate: 19.25,
    peakRate: 33.54,
    standingCharge: 242.07,
  },
  {
    id: "sse-smart-everyday",
    supplier: "SSE Airtricity",
    planName: "Smart Everyday",
    type: "flat",
    rate24h: 30.85,
    standingCharge: 243.86,
  },

  // ==================== ELECTRIC IRELAND ====================
  {
    id: "ei-standard-24hr",
    supplier: "Electric Ireland",
    planName: "Standard 24hr",
    type: "flat",
    rate24h: 31.27,
    standingCharge: 250.77,
  },
  {
    id: "ei-nightsaver",
    supplier: "Electric Ireland",
    planName: "NightSaver",
    type: "daynight",
    dayRate: 35.06,
    nightRate: 17.29,
    standingCharge: 328.58,
  },
  {
    id: "ei-smart-electricity",
    supplier: "Electric Ireland",
    planName: "Smart Electricity",
    type: "tou",
    dayRate: 34.99,
    nightRate: 18.39,
    peakRate: 37.33,
    standingCharge: 250.77,
  },
  {
    id: "ei-smart-24",
    supplier: "Electric Ireland",
    planName: "Smart 24",
    type: "flat",
    rate24h: 29.27,
    standingCharge: 250.77,
  },

  // ==================== ENERGIA ====================
  {
    id: "energia-standard-24hr",
    supplier: "Energia",
    planName: "Standard 24hr",
    type: "flat",
    rate24h: 30.28,
    standingCharge: 265.01,
  },
  {
    id: "energia-nightsaver",
    supplier: "Energia",
    planName: "NightSaver",
    type: "daynight",
    dayRate: 33.20,
    nightRate: 15.92,
    standingCharge: 265.01,
  },
  {
    id: "energia-smart-24hr",
    supplier: "Energia",
    planName: "Smart 24 Hour",
    type: "flat",
    rate24h: 32.11,
    standingCharge: 265.01,
  },
  {
    id: "energia-smart-daynight",
    supplier: "Energia",
    planName: "Smart Day Night",
    type: "daynight",
    dayRate: 35.19,
    nightRate: 17.34,
    standingCharge: 331.97,
  },
  {
    id: "energia-smart-data",
    supplier: "Energia",
    planName: "Smart Data",
    type: "tou",
    dayRate: 33.70,
    nightRate: 18.53,
    peakRate: 37.85,
    standingCharge: 265.01,
  },
  {
    id: "energia-sst",
    supplier: "Energia",
    planName: "SST",
    type: "tou",
    dayRate: 35.81,
    nightRate: 21.00,
    peakRate: 40.21,
    standingCharge: 265.01,
  },
  {
    id: "energia-ev-smart-drive",
    supplier: "Energia",
    planName: "EV Smart Drive",
    type: "ev",
    dayRate: 40.16,
    nightRate: 9.42,  // Night Boost rate
    standingCharge: 265.01,
  },
  {
    id: "energia-ev-smart-drive-plus",
    supplier: "Energia",
    planName: "EV Smart Drive Plus",
    type: "ev",
    dayRate: 38.93,
    nightRate: 23.99,
    peakRate: 51.08,
    evRate: 11.03,  // Electric Car Charge Time
    standingCharge: 265.01,
  },

  // ==================== BORD GÁIS ENERGY ====================
  {
    id: "bg-standard-24hr",
    supplier: "Bord Gáis Energy",
    planName: "Standard 24hr",
    type: "flat",
    rate24h: 25.94,
    standingCharge: 224.56,
  },
  {
    id: "bg-nightsaver",
    supplier: "Bord Gáis Energy",
    planName: "NightSaver",
    type: "daynight",
    dayRate: 27.90,
    nightRate: 13.81,
    standingCharge: 295.27,
  },
  {
    id: "bg-smart-electricity",
    supplier: "Bord Gáis Energy",
    planName: "Smart Electricity",
    type: "tou",
    dayRate: 27.73,
    nightRate: 20.46,
    peakRate: 33.75,
    standingCharge: 224.56,
  },
  {
    id: "bg-smart-allday",
    supplier: "Bord Gáis Energy",
    planName: "Smart All Day",
    type: "flat",
    rate24h: 25.94,
    standingCharge: 224.56,
  },
]

/**
 * Get the rate in c/kWh for a tariff at a given hour (Dublin time)
 * Night: 23:00 - 08:00 (hours 23, 0-7)
 * Peak: 17:00 - 19:00 (hours 17, 18)
 * Day: 08:00 - 17:00 and 19:00 - 23:00 (hours 8-16, 19-22)
 * EV Boost: 02:00 - 05:00 (hours 2, 3, 4)
 */
export function getTariffRateForHour(tariff: RetailTariff, hour: number): number {
  // Flat tariffs - same rate all day
  if (tariff.type === "flat") {
    return tariff.rate24h ?? 0
  }

  // EV plans with special charging window
  if (tariff.type === "ev") {
    // EV charging time (02:00-05:00)
    if (tariff.evRate !== undefined && hour >= 2 && hour < 5) {
      return tariff.evRate
    }
    // Night rate
    if (hour >= 23 || hour < 8) {
      return tariff.nightRate ?? 0
    }
    // Peak rate (if exists)
    if (tariff.peakRate !== undefined && hour >= 17 && hour < 19) {
      return tariff.peakRate
    }
    // Day rate
    return tariff.dayRate ?? 0
  }

  // Day/Night plans (no peak)
  if (tariff.type === "daynight") {
    // Night: 23:00 - 08:00
    if (hour >= 23 || hour < 8) {
      return tariff.nightRate ?? 0
    }
    // Day: 08:00 - 23:00
    return tariff.dayRate ?? 0
  }

  // ToU plans (day/night/peak)
  if (tariff.type === "tou") {
    // Night: 23:00 - 08:00
    if (hour >= 23 || hour < 8) {
      return tariff.nightRate ?? 0
    }
    // Peak: 17:00 - 19:00
    if (hour >= 17 && hour < 19) {
      return tariff.peakRate ?? 0
    }
    // Day: 08:00 - 17:00 and 19:00 - 23:00
    return tariff.dayRate ?? 0
  }

  return 0
}

// Colors for suppliers
export const SUPPLIER_COLORS: Record<string, string> = {
  "SSE Airtricity": "#00A651",    // Green
  "Electric Ireland": "#E31837",  // Red
  "Energia": "#F7931E",           // Orange
  "Bord Gáis Energy": "#0072CE",  // Blue
}

// Get a unique color for each tariff
export function getTariffColor(tariff: RetailTariff, index: number): string {
  const baseColor = SUPPLIER_COLORS[tariff.supplier] || "#888888"
  // For same supplier, adjust lightness
  const supplierTariffs = RETAIL_TARIFFS.filter(t => t.supplier === tariff.supplier)
  const supplierIndex = supplierTariffs.findIndex(t => t.id === tariff.id)
  
  // Adjust hue slightly for different plans from same supplier
  const hueShift = supplierIndex * 15
  
  // Parse hex to HSL and adjust
  const r = parseInt(baseColor.slice(1, 3), 16) / 255
  const g = parseInt(baseColor.slice(3, 5), 16) / 255
  const b = parseInt(baseColor.slice(5, 7), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  // Adjust hue and lightness for variety
  h = (h + hueShift / 360) % 1
  l = Math.min(0.6, Math.max(0.35, l + (supplierIndex - 1) * 0.08))
  
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}
