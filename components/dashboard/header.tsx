"use client"

import Image from "next/image"
import { Moon, Sun, Settings, Maximize2, Minimize2, Play, Pause } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

interface HeaderProps {
  backendStatus: "ok" | "error" | "stale"
  lastUpdate?: string
  onSettingsClick: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  isAutoRotating?: boolean
  onToggleAutoRotate?: () => void
}

export function Header({ 
  backendStatus, 
  lastUpdate, 
  onSettingsClick,
  isFullscreen = false,
  onToggleFullscreen,
  isAutoRotating = true,
  onToggleAutoRotate,
}: HeaderProps) {
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
        weekday: "long",
        day: "numeric",
        month: "long",
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
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        {/* Left: Partner Logos */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r border-border pr-4">
            <Image
              src="/logos/hd-flex-logo.jpg"
              alt="HD Flex"
              width={48}
              height={48}
              className="rounded-lg object-contain"
            />
            <Image
              src="/logos/hai-resi-logo.jpg"
              alt="Hai Resi"
              width={48}
              height={48}
              className="rounded-lg object-contain"
            />
            <Image
              src="/logos/s-logo.jpg"
              alt="S"
              width={48}
              height={48}
              className="rounded-lg object-contain"
            />
          </div>
          
          {/* Dashboard Title */}
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground tracking-tight">ADFLEX Dynamic Price Dashboard</span>
            <span className="text-sm text-muted-foreground">Powered by Semo PX Data</span>
          </div>
        </div>

        {/* Center: Dublin Clock - Large for big screens */}
        <div className="hidden flex-col items-center lg:flex">
          <span className="font-mono text-4xl font-bold text-foreground tracking-wider">{dublinTime}</span>
          <span className="text-lg text-muted-foreground font-medium">{dublinDate}</span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {/* Live Status Indicator */}
          <div className="hidden items-center gap-2 sm:flex bg-muted/50 rounded-lg px-4 py-2">
            <div className="relative flex items-center gap-1.5">
              <span
                className={`h-3 w-3 rounded-full ${backendStatus === "ok"
                    ? "bg-primary animate-pulse"
                    : backendStatus === "stale"
                      ? "bg-accent"
                      : "bg-destructive"
                  }`}
              />
              <span className="text-sm font-semibold text-foreground">
                {backendStatus === "ok" ? "LIVE" : backendStatus === "stale" ? `STALE` : "ERROR"}
              </span>
            </div>
            {lastUpdate && backendStatus !== "ok" && (
              <span className="text-xs text-muted-foreground">({lastUpdate})</span>
            )}
          </div>

          {/* Auto Rotate Toggle */}
          {onToggleAutoRotate && (
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleAutoRotate}
              className="h-10 w-10"
              title={isAutoRotating ? "Pause auto-rotation" : "Resume auto-rotation"}
            >
              {isAutoRotating ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              <span className="sr-only">{isAutoRotating ? "Pause" : "Play"} auto-rotation</span>
            </Button>
          )}

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleFullscreen}
              className="h-10 w-10"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
              <span className="sr-only">{isFullscreen ? "Exit" : "Enter"} fullscreen</span>
            </Button>
          )}

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-10 w-10"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}

          {/* Settings */}
          <Button variant="outline" size="icon" onClick={onSettingsClick} className="h-10 w-10">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
