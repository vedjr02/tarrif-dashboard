"use client";

const reportTemplates = [
  "Executive weekly tariff performance",
  "Optimization adoption and savings summary",
  "Provider benchmark and risk brief",
  "Device-level anomaly incident report"
];

export default function ReportsPage() {
  return (
    <section className="space-y-5">
      <header>
        <h2 className="font-brand text-xl font-semibold text-white">Reports & Exports</h2>
        <p className="text-sm text-slate-300">Generate stakeholder-ready reports and downloadable analysis extracts.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-5">
          <h3 className="font-brand text-base font-semibold text-white">Report Templates</h3>
          <div className="mt-3 space-y-2">
            {reportTemplates.map((template) => (
              <div key={template} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                {template}
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel p-5">
          <h3 className="font-brand text-base font-semibold text-white">Exports</h3>
          <div className="mt-3 grid gap-2">
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200">Export CSV dataset</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200">Download executive PDF</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200">Generate shareable snapshot</button>
          </div>
        </div>
      </div>
    </section>
  );
}
