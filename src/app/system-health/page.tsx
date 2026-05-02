"use client";

const healthRows = [
  { service: "Smart Meter Stream", status: "Healthy", latency: "210 ms", freshness: "1 min ago" },
  { service: "Tariff Feed Ingestion", status: "Warning", latency: "780 ms", freshness: "7 min ago" },
  { service: "Recommendation Engine", status: "Healthy", latency: "320 ms", freshness: "2 min ago" },
  { service: "Forecast Model", status: "Healthy", latency: "430 ms", freshness: "3 min ago" }
];

export default function SystemHealthPage() {
  return (
    <section className="space-y-5">
      <header>
        <h2 className="font-brand text-xl font-semibold text-white">Data & System Health</h2>
        <p className="text-sm text-slate-300">Monitor ingestion reliability, freshness, and backend analytic readiness.</p>
      </header>
      <div className="glass-panel overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Latency</th>
              <th className="px-4 py-3">Last Refresh</th>
            </tr>
          </thead>
          <tbody>
            {healthRows.map((row) => (
              <tr key={row.service} className="border-t border-white/10 text-slate-100">
                <td className="px-4 py-3">{row.service}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{row.latency}</td>
                <td className="px-4 py-3">{row.freshness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
