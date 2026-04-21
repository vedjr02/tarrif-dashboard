"use client";

import Image from "next/image";
import {
  Moon,
  Sun,
  Settings,
  Maximize2,
  Minimize2,
  Play,
  Pause,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface HeaderProps {
  backendStatus: "ok" | "error" | "stale";
  lastUpdate?: string;
  onSettingsClick: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isAutoRotating?: boolean;
  onToggleAutoRotate?: () => void;
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
  const { theme, setTheme } = useTheme();
  const [dublinTime, setDublinTime] = useState("");
  const [dublinDate, setDublinDate] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dublinFormatter = new Intl.DateTimeFormat("en-IE", {
        timeZone: "Europe/Dublin",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const dateFormatter = new Intl.DateTimeFormat("en-IE", {
        timeZone: "Europe/Dublin",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      setDublinTime(dublinFormatter.format(now));
      setDublinDate(dateFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-6 sm:h-20 sm:py-0">

        {/* Top row on mobile: logos + controls */}
        <div className="flex items-center justify-between gap-3 sm:contents">

          {/* Left: Partner Logos + Title */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            {/* Logos — shrink but never overflow */}
            <div className="flex shrink-0 items-center gap-2 border-r border-border pr-3 sm:gap-3 sm:pr-4">
              <Image
                src="/logos/adflex.jpeg"
                alt="HD Flex"
                width={36}
                height={36}
                className="rounded-md object-contain sm:h-11 sm:w-11"
              />
              <Image
                src="/logos/iresi.png"
                alt="Hai Resi"
                width={80}
                height={32}
                className="h-7 w-auto rounded-md object-contain sm:h-10 sm:w-auto"
                style={{ maxWidth: "120px" }}
              />
              <Image
                src="/logos/logo.svg"
                alt="S"
                width={56}
                height={32}
                className="h-7 w-auto rounded-md object-contain sm:h-10 sm:w-auto"
                style={{ maxWidth: "80px" }}
              />
            </div>

            {/* Title — truncates gracefully on small screens */}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-foreground tracking-tight sm:text-xl md:text-2xl">
                ADFLEX Dynamic Price Dashboard
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block sm:text-sm">
                Powered by Semo PX Data
              </span>
            </div>
          </div>

          {/* Right: Controls — always visible */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Live Status */}
            <div className="hidden items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 sm:flex">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  backendStatus === "ok"
                    ? "animate-pulse bg-primary"
                    : backendStatus === "stale"
                      ? "bg-accent"
                      : "bg-destructive"
                }`}
              />
              <span className="text-sm font-semibold text-foreground">
                {backendStatus === "ok" ? "LIVE" : backendStatus === "stale" ? "STALE" : "ERROR"}
              </span>
              {lastUpdate && backendStatus !== "ok" && (
                <span className="text-xs text-muted-foreground">({lastUpdate})</span>
              )}
            </div>

            {onToggleAutoRotate && (
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleAutoRotate}
                className="h-8 w-8 sm:h-10 sm:w-10"
                title={isAutoRotating ? "Pause auto-rotation" : "Resume auto-rotation"}
              >
                {isAutoRotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span className="sr-only">{isAutoRotating ? "Pause" : "Play"} auto-rotation</span>
              </Button>
            )}

            {onToggleFullscreen && (
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleFullscreen}
                className="hidden h-8 w-8 sm:flex sm:h-10 sm:w-10"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span className="sr-only">{isFullscreen ? "Exit" : "Enter"} fullscreen</span>
              </Button>
            )}

            {mounted && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={onSettingsClick}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>

        {/* Center: Dublin Clock — second row on mobile, centered column on desktop */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-2 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:flex-col sm:items-center sm:gap-0 sm:border-0 sm:pt-0">
          <span className="font-mono text-xl font-bold text-foreground tracking-wider sm:text-3xl lg:text-4xl">
            {dublinTime}
          </span>
          <span className="text-xs text-muted-foreground sm:text-sm lg:text-base">
            {dublinDate}
          </span>
        </div>

      </div>
    </header>
  );
}
