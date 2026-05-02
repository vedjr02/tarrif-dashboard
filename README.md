# Tariff Analysis Dashboard

A production-ready frontend dashboard for tariff analysis in the VCG ecosystem.  
This Next.js application transforms complex energy and utility pricing telemetry into actionable financial insights.

## Tech Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Recharts (visual analytics)
- TanStack Table (tariff matrix)
- Lucide React (iconography)
- Zustand (local state with simulated API latency)

## Features

- Dashboard overview with live metrics, provider rate summary, and savings progress gauge
- Analytics matrix for provider comparison and TOU multipliers
- Actionable suggestion panel with priority-based visual states
- Strict TypeScript data interfaces and mock datasets
- Simulated async fetch behavior to mirror real API interactions

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```text
src/
  app/
    layout.tsx
    page.tsx
    analytics/page.tsx
    suggestions/page.tsx
  components/
    DashboardNavbar.tsx
    TariffTable.tsx
    AnalyticsChart.tsx
    SuggestionCard.tsx
  data/mockData.ts
  types/index.ts
  lib/utils.ts
```
