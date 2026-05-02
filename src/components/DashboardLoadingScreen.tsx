interface DashboardLoadingScreenProps {
  title: string;
  description: string;
}

export function DashboardLoadingScreen({ title, description }: DashboardLoadingScreenProps) {
  return (
    <section className="space-y-4">
      <div className="glass-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-brand text-lg text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-300">{description}</p>
          </div>
          <div className="h-3 w-20 rounded-full bg-indigo-400/40 animate-pulse" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel p-5">
          <div className="h-4 w-32 rounded bg-white/10 shimmer-block" />
          <div className="mt-4 h-8 w-24 rounded bg-white/10 shimmer-block" />
          <div className="mt-3 h-3 w-40 rounded bg-white/10 shimmer-block" />
        </div>
        <div className="glass-panel p-5">
          <div className="h-4 w-36 rounded bg-white/10 shimmer-block" />
          <div className="mt-4 h-8 w-28 rounded bg-white/10 shimmer-block" />
          <div className="mt-3 h-3 w-44 rounded bg-white/10 shimmer-block" />
        </div>
        <div className="glass-panel p-5">
          <div className="h-4 w-40 rounded bg-white/10 shimmer-block" />
          <div className="mt-4 h-24 w-full rounded bg-white/10 shimmer-block" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-5">
          <div className="h-4 w-36 rounded bg-white/10 shimmer-block" />
          <div className="mt-4 h-40 w-full rounded bg-white/10 shimmer-block" />
        </div>
        <div className="glass-panel p-5">
          <div className="h-4 w-36 rounded bg-white/10 shimmer-block" />
          <div className="mt-4 h-40 w-full rounded bg-white/10 shimmer-block" />
        </div>
      </div>
    </section>
  );
}
