import { BadgeCheck, ShieldAlert, Sparkles } from "lucide-react";
import type { TariffScore } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface TariffRecommendationPanelProps {
  scoredTariffs: TariffScore[];
}

export function TariffRecommendationPanel({ scoredTariffs }: TariffRecommendationPanelProps) {
  const best = scoredTariffs[0];

  if (!best) {
    return (
      <div className="glass-panel p-5">
        <h3 className="font-brand text-base font-semibold text-white">Best Tariff Recommendation</h3>
        <p className="mt-2 text-sm text-slate-300">No tariff data available for recommendation.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center gap-2 text-white">
        <Sparkles size={16} />
        <h3 className="font-brand text-base font-semibold">Best Tariff Recommendation</h3>
      </div>

      <article className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-brand text-lg text-emerald-200">{best.tariff.providerName}</p>
          <span className="rounded-full border border-emerald-300/40 px-2 py-1 text-xs text-emerald-200">
            Score {best.score}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-200">
          Estimated unit cost: <span className="font-semibold">{formatCurrency(best.estimatedUnitCost)}</span>
        </p>
        <ul className="mt-3 space-y-1 text-xs text-slate-300">
          {best.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2">
              <BadgeCheck size={12} className="mt-0.5 text-emerald-300" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </article>

      <div className="mt-4 space-y-2">
        {scoredTariffs.slice(1).map((item) => (
          <div key={item.tariff.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-200">{item.tariff.providerName}</span>
              <span className="text-slate-300">Score {item.score}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <ShieldAlert size={12} />
              <span>Risk {(item.riskIndex * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
