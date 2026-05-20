"use client"

import type { BackendStatus } from "@/lib/types"

interface FooterProps {
  status: BackendStatus
}

function sourceLabel(source: string): { text: string; className: string } {
  if (source === "SEMOPX") return { text: "SEMO", className: "text-primary" }
  if (source === "ENTSO-E") return { text: "ENTSO-E", className: "text-primary" }
  return { text: "Est.", className: "text-amber-500" }
}

export function Footer({ status }: FooterProps) {
  const lastScrapeTime = new Date(status.last_scrape).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  })

  const yday = sourceLabel(status.yesterday_source)
  const today = sourceLabel(status.today_source)
  const tmrw = sourceLabel(status.tomorrow_source)

  return (
    <footer className="border-t border-border bg-card/50 py-3">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-6 text-base text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-6">
          <span className="hidden sm:inline">Last update: {lastScrapeTime}</span>
          <span className="hidden lg:inline text-border">|</span>
          <span className="hidden lg:inline text-xs">
            Yesterday: <span className={yday.className}>{yday.text}</span>
            {" · "}Today: <span className={today.className}>{today.text}</span>
            {" · "}Tomorrow: <span className={tmrw.className}>{tmrw.text}</span>
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
        </div>
      </div>
    </footer>
  )
}
