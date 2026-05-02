import type { TouPeriod } from "@/types";

interface TouHeatmapProps {
  periods: TouPeriod[];
}

const hours = ["00", "04", "08", "12", "16", "20"];
const days: TouPeriod["dayOfWeek"][] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const cellTone = (value: number) => {
  if (value >= 1.3) return "bg-rose-500/40";
  if (value >= 1.0) return "bg-amber-500/35";
  return "bg-emerald-500/30";
};

export function TouHeatmap({ periods }: TouHeatmapProps) {
  const map = new Map<string, number>();
  periods.forEach((p) => {
    const key = `${p.dayOfWeek}-${p.startTime.slice(0, 2)}`;
    map.set(key, p.multiplier);
  });

  return (
    <div className="glass-panel p-5">
      <h3 className="font-brand text-base font-semibold text-white">TOU Heatmap</h3>
      <p className="mb-4 text-sm text-slate-300">Peak intensity by day/hour segment.</p>
      <div className="space-y-2">
        {days.map((day) => (
          <div key={day} className="grid grid-cols-7 items-center gap-2">
            <span className="text-xs text-slate-400">{day}</span>
            {hours.map((hour) => {
              const value = map.get(`${day}-${hour}`) ?? 0.7;
              return (
                <div key={`${day}-${hour}`} className={`rounded-md px-2 py-2 text-center text-xs text-white ${cellTone(value)}`}>
                  {value.toFixed(2)}x
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
