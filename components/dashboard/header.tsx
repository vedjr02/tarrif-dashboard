"use client"

import Image from "next/image"
import { Moon, Sun, Settings } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

interface HeaderProps {
  backendStatus: "ok" | "error" | "stale"
  lastUpdate?: string
  onSettingsClick: () => void
}

export function Header({ backendStatus, lastUpdate, onSettingsClick }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [dublinTime, setDublinTime] = useState("")
  const [dublinDate, setDublinDate] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const dublinFormatter = new Intl.DateTimeFormat("en-IE", {
        timeZone: "Europe/Dublin",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      const dateFormatter = new Intl.DateTimeFormat("en-IE", {
        timeZone: "Europe/Dublin",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      setDublinTime(dublinFormatter.format(now))
      setDublinDate(dateFormatter.format(now))
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="EnergyPrice Ireland Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-foreground">EnergyPrice</span>
            <span className="text-xs text-muted-foreground">Irish DAM Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live Status Indicator */}
          <div className="hidden items-center gap-2 sm:flex">
            <div className="relative flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendStatus === "ok"
                    ? "bg-primary animate-pulse"
                    : backendStatus === "stale"
                    ? "bg-accent"
                    : "bg-destructive"
                }`}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {backendStatus === "ok" ? "Live" : backendStatus === "stale" ? `Stale — ${lastUpdate}` : "Error"}
              </span>
            </div>
          </div>

          {/* Dublin Clock */}
          <div className="hidden flex-col items-end md:flex">
            <span className="font-mono text-sm font-medium text-foreground">{dublinTime}</span>
            <span className="text-xs text-muted-foreground">{dublinDate}</span>
          </div>

          {/* Theme Toggle */}
          {mounted && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="h-9 w-9"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}

          {/* Settings */}
          <Button variant="ghost" size="icon" onClick={onSettingsClick} className="h-9 w-9">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
