"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Mail, TrendingDown, TrendingUp, Clock } from "lucide-react"
import type { DayPrices, PricePeriod } from "@/lib/types"

function findCheapestWindow(periods: PricePeriod[], windowSize: number): { start: number; avgPrice: number } {
  if (periods.length < windowSize) return { start: 0, avgPrice: 0 }
  let bestStart = 0
  let bestAvg = Infinity
  for (let i = 0; i <= periods.length - windowSize; i++) {
    const avg = periods.slice(i, i + windowSize).reduce((s, p) => s + p.price_eur_mwh, 0) / windowSize
    if (avg < bestAvg) { bestAvg = avg; bestStart = i }
  }
  return { start: bestStart, avgPrice: bestAvg }
}

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayPrices: DayPrices | null
}

export function SettingsModal({ open, onOpenChange, dayPrices }: SettingsModalProps) {
  const [lowThreshold, setLowThreshold] = useState("50")
  const [highThreshold, setHighThreshold] = useState("120")
  const [pushEnabled, setPushEnabled] = useState(false)
  const [email, setEmail] = useState("")

  // Find cheapest 4-hour window
  const cheapestWindow = dayPrices ? findCheapestWindow(dayPrices.periods, 8) : null
  const startPeriod = dayPrices && cheapestWindow ? dayPrices.periods[cheapestWindow.start] : null
  const endPeriod = dayPrices && cheapestWindow ? dayPrices.periods[cheapestWindow.start + 7] : null

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Dublin",
    })
  }

  const handleSave = () => {
    // In a real app, this would save to backend/localStorage
    console.log("[v0] Saving alert settings:", {
      lowThreshold,
      highThreshold,
      pushEnabled,
      email,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Price Alert Settings
          </DialogTitle>
          <DialogDescription>
            Configure alerts to be notified when prices hit your thresholds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Low Price Alert */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <TrendingDown className="h-4 w-4 text-primary" />
              Low Price Alert
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Alert when price drops below</span>
              <Input
                type="number"
                value={lowThreshold}
                onChange={(e) => setLowThreshold(e.target.value)}
                className="w-24 border-primary/50 focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">€/MWh</span>
            </div>
          </div>

          {/* High Price Alert */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-destructive" />
              High Price Alert
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Alert when price exceeds</span>
              <Input
                type="number"
                value={highThreshold}
                onChange={(e) => setHighThreshold(e.target.value)}
                className="w-24 border-destructive/50 focus:border-destructive"
              />
              <span className="text-sm text-muted-foreground">€/MWh</span>
            </div>
          </div>

          {/* Notification Methods */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Notification Methods</Label>
            
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Browser Push Notifications</span>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Email Notifications</span>
              </div>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Best Hours Summary */}
          <Card className="border-accent/50 bg-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-accent" />
                Best Hours Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cheapestWindow && startPeriod && endPeriod ? (
                <>
                  <p className="text-sm text-foreground">
                    Cheapest 4-hour window:{" "}
                    <span className="font-semibold text-primary">
                      {formatTime(startPeriod.start_time_dublin)} – {formatTime(endPeriod.start_time_dublin)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Average price: €{cheapestWindow.avgPrice.toFixed(2)}/MWh
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No price data available yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
