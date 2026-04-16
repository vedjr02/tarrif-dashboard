"use client"

import type { BackendStatus } from "@/lib/types"

interface FooterProps {
  status: BackendStatus
}

export function Footer({ status }: FooterProps) {
  const lastScrapeTime = new Date(status.last_scrape).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  })

  return (
    <footer className="border-t border-border bg-card/50 py-4">
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-4">
          <span>Last scrape: {lastScrapeTime}</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            Sources: {status.semopx_periods} SEMOpx, {status.entsoe_periods} ENTSO-E, {status.interpolated_periods} interpolated
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              status.backend === "ok" ? "bg-primary" : "bg-destructive"
            }`}
          />
          <span>Backend: {status.backend === "ok" ? "Healthy" : "Error"}</span>
          {status.missing_days > 0 && (
            <span className="text-accent">({status.missing_days} missing days)</span>
          )}
        </div>
      </div>
    </footer>
  )
}
