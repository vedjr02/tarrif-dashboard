import type { TariffScore } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface ProviderScoreBreakdownTableProps {
  scoredTariffs: TariffScore[];
}

export function ProviderScoreBreakdownTable({ scoredTariffs }: ProviderScoreBreakdownTableProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="font-brand text-base font-semibold text-white">Provider Score Breakdown</h3>
        <p className="text-sm text-slate-300">Transparent scoring dimensions for tariff recommendation decisions.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Eff. Rate</th>
              <th className="px-4 py-3 font-medium">Peak Exposure</th>
              <th className="px-4 py-3 font-medium">Risk Index</th>
              <th className="px-4 py-3 font-medium">Volatility Spread</th>
            </tr>
          </thead>
          <tbody>
            {scoredTariffs.map((item) => (
              <tr key={item.tariff.id} className="border-t border-white/5 text-slate-100">
                <td className="px-4 py-3 font-medium">{item.tariff.providerName}</td>
                <td className="px-4 py-3 text-indigo-200">{item.score}</td>
                <td className="px-4 py-3">{formatCurrency(item.estimatedUnitCost)}</td>
                <td className="px-4 py-3">{(item.peakShare * 100).toFixed(0)}%</td>
                <td className="px-4 py-3">{(item.riskIndex * 100).toFixed(0)}%</td>
                <td className="px-4 py-3">{item.volatilitySpread.toFixed(2)}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
