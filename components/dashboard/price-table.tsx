"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, Download, ArrowUpDown } from "lucide-react"
import type { DayPrices, PricePeriod, Quintile } from "@/lib/types"
import { getQuintileColor, getSignalText } from "@/lib/types"

interface PriceTableProps {
  dayPrices: DayPrices
  currentPeriodIndex: number
}

type SortField = "period" | "price" | "quintile"
type SortDirection = "asc" | "desc"

export function PriceTable({ dayPrices, currentPeriodIndex }: PriceTableProps) {
  const [sortField, setSortField] = useState<SortField>("period")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const sortedPeriods = useMemo(() => {
    const periods = [...dayPrices.periods]
    return periods.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "period":
          comparison = a.period - b.period
          break
        case "price":
          comparison = a.price_eur_mwh - b.price_eur_mwh
          break
        case "quintile":
          comparison = a.quintile - b.quintile
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [dayPrices.periods, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const formatTime = (isoString: string, timezone: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    })
  }

  const exportCSV = () => {
    const headers = ["Period", "Dublin Time", "UTC", "EUR/MWh", "Quintile", "Signal", "Source"]
    const rows = dayPrices.periods.map((p) => [
      p.period,
      formatTime(p.start_time_dublin, "Europe/Dublin"),
      formatTime(p.start_time_utc, "UTC"),
      p.price_eur_mwh.toFixed(2),
      `Q${p.quintile}`,
      getSignalText(p.quintile as Quintile),
      p.source,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prices-${dayPrices.trading_day}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 font-medium hover:text-foreground"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Table className="h-4 w-4 text-primary" />
          Price Table — {dayPrices.trading_day}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          className="h-8 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">
                  <SortButton field="period">Period</SortButton>
                </th>
                <th className="px-3 py-2">Dublin Time</th>
                <th className="hidden px-3 py-2 sm:table-cell">UTC</th>
                <th className="px-3 py-2">
                  <SortButton field="price">EUR/MWh</SortButton>
                </th>
                <th className="px-3 py-2">
                  <SortButton field="quintile">Quintile</SortButton>
                </th>
                <th className="hidden px-3 py-2 md:table-cell">Signal</th>
                <th className="hidden px-3 py-2 lg:table-cell">Source</th>
              </tr>
            </thead>
            <tbody>
              {sortedPeriods.map((period) => {
                const isCurrent = period.period === currentPeriodIndex + 1
                return (
                  <tr
                    key={period.period}
                    className={`border-t border-border transition-colors hover:bg-muted/50 ${
                      isCurrent ? "bg-primary/10" : ""
                    }`}
                    style={{
                      borderLeft: isCurrent ? "3px solid var(--primary)" : "3px solid transparent",
                    }}
                  >
                    <td className="px-3 py-2 font-mono text-foreground">{period.period}</td>
                    <td className="px-3 py-2 font-mono text-foreground">
                      {formatTime(period.start_time_dublin, "Europe/Dublin")}
                    </td>
                    <td className="hidden px-3 py-2 font-mono text-muted-foreground sm:table-cell">
                      {formatTime(period.start_time_utc, "UTC")}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-foreground">
                      €{period.price_eur_mwh.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs"
                        style={{
                          backgroundColor: getQuintileColor(period.quintile as Quintile),
                          color: period.quintile <= 2 ? "var(--background)" : "var(--foreground)",
                        }}
                      >
                        Q{period.quintile}
                      </Badge>
                    </td>
                    <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                      {getSignalText(period.quintile as Quintile)}
                    </td>
                    <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                      {period.source}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
