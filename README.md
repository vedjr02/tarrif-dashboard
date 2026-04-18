<a name="readme-top"></a>

[![LinkedIn][linkedin-shield]][linkedin-url]

<br />
<div align="center">

<h3 align="center">ADFlex — Dynamic Prices Dashboard</h3>

<p align="center">
A Next.js dashboard for monitoring and acting on dynamic energy pricing signals in real time.
<br />
<a href="#"><strong>Explore the docs »</strong></a>
<br />
<br />
<a href="https://v0.app/chat/projects/prj_1r4017nhXsD2nls9V9s1w8c3WwY0">Continue on v0</a>
·
<a href="http://localhost:3000">View Local</a>
</p>
</div>

<details>
<summary>Table of Contents</summary>
<ol>
<li><a href="#about-the-project">About The Project</a></li>
<li><a href="#built-with">Built With</a></li>
<li><a href="#getting-started">Getting Started</a></li>
<li><a href="#project-structure">Project Structure</a></li>
<li><a href="#dashboard-features">Dashboard Features</a></li>
<li><a href="#running-the-system">Running The System</a></li>
<li><a href="#roadmap">Roadmap</a></li>
<li><a href="#contact">Contact</a></li>
</ol>
</details>

---

## About The Project

This project is a frontend prototype for ADFlex's dynamic pricing layer. It provides operators and end-users with a real-time view of energy price signals, forecasted price curves, and actionable recommendations — enabling smarter consumption decisions in a flexible energy market.

Key features:

- **Live Price Signals** — Real-time display of current energy prices and their trend relative to historical baselines.
- **Price Curve Visualisation** — Interactive Recharts-powered charts showing intraday and multi-period price forecasts.
- **Next-Period Strip** — At-a-glance price preview for upcoming time slots to support demand-shifting decisions.
- **Action Recommendations** — Surfaced recommendations that guide users on when to consume, store, or curtail energy.
- **Daily Summary** — Aggregated daily pricing overview with configurable settings.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Built With

[![Next.js][Nextjs-shield]][Nextjs-url] [![TypeScript][TypeScript]][TypeScript-url] [![React][React-shield]][React-url] [![TailwindCSS][Tailwind-shield]][Tailwind-url] [![Recharts][Recharts-shield]][Recharts-url] [![Radix UI][Radix-shield]][Radix-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm / yarn / pnpm**: any standard package manager

### Installation

1. Clone the repository
   ```sh
   git clone <your-repo-url>
   cd v0-adflex-dynamic-prices
   ```

2. Install dependencies
   ```sh
   npm install
   ```

3. Start the development server
   ```sh
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Project Structure

```
.
├── app/
│   ├── page.tsx           # Entry point — renders the dashboard
│   ├── layout.tsx         # Root layout with global styles
│   └── globals.css
├── components/
│   ├── dashboard/         # Feature components (pricing cards, charts, tables, modals)
│   └── ui/                # Reusable Radix-based UI primitives (50+ components)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
└── public/                # Static assets
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Dashboard Features

| Component | Description |
|-----------|-------------|
| Price Signal | Current price level with trend indicator |
| Price Curve Chart | Intraday forecast rendered with Recharts |
| Next Period Strip | Compact price preview for upcoming time slots |
| Dynamic Pricing Card | Summary card for the active pricing period |
| Action Recommendations | Suggested actions based on current price conditions |
| Daily Summary Bar | Aggregated daily price overview |
| Settings Modal | User-configurable dashboard preferences |
| Data Table | Tabular view of historical price readings |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Running The System

### Available scripts

```json
"scripts": {
  "dev":   "next dev",
  "build": "next build",
  "start": "next start",
  "lint":  "next lint"
}
```

### Development

```sh
npm run dev
```

The app runs on `http://localhost:3000` with hot reload enabled.

### Production build

```sh
npm run build
npm run start
```

### Deploying via v0

This repository is linked to a [v0](https://v0.app) project. Every merge to `main` triggers an automatic deployment. To continue iterating in v0, use the link below:

[Continue working on v0 →](https://v0.app/chat/projects/prj_1r4017nhXsD2nls9V9s1w8c3WwY0)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Roadmap

- [x] Phase 1: Foundation — Next.js app scaffold with Tailwind and Radix UI
- [x] Phase 2: Core Dashboard — Price signal, price curve chart, next-period strip, and dynamic pricing card
- [ ] Phase 3: Backend Integration — Connect price signal components to a live API or WebSocket feed
- [ ] Phase 4: User Personalisation — Per-user thresholds, alert preferences, and saved configurations
- [ ] Phase 5: Multi-site Support — Dashboard views scoped to individual sites or portfolios

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contact

Project Link: [https://github.com/paoloCammardella/v0-adflex-dynamic-prices](https://github.com/paoloCammardella/v0-adflex-dynamic-prices)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

[Nextjs-shield]: https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Nextjs-url]: https://nextjs.org/
[React-shield]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Tailwind-shield]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Recharts-shield]: https://img.shields.io/badge/Recharts-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white
[Recharts-url]: https://recharts.org/
[Radix-shield]: https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radixui&logoColor=white
[Radix-url]: https://www.radix-ui.com/
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: #
