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
    <footer className="border-t border-border bg-card/50 py-3">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-6 text-base text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Data Source:</span>
            <span className="text-primary font-medium">Semo PX</span>
          </div>
          <span className="hidden sm:inline text-border">|</span>
          <span className="hidden sm:inline">Last update: {lastScrapeTime}</span>
          <span className="hidden lg:inline text-border">|</span>
          <span className="hidden lg:inline">
            {status.semopx_periods} SEMOpx, {status.entsoe_periods} ENTSO-E, {status.interpolated_periods} interpolated
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                status.backend === "ok" ? "bg-primary animate-pulse" : "bg-destructive"
              }`}
            />
            <span className="font-medium">
              {status.backend === "ok" ? "System Healthy" : "System Error"}
            </span>
          </div>
          {status.missing_days > 0 && (
            <span className="text-accent">({status.missing_days} missing days)</span>
          )}
        </div>
      </div>
    </footer>
  )
}
