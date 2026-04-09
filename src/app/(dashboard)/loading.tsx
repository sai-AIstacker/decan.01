// Global loading skeleton for all dashboard routes
export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-[var(--surface-2)]" />
        <div className="h-7 w-56 rounded-xl bg-[var(--surface-2)]" />
        <div className="h-3 w-40 rounded-full bg-[var(--surface-2)]" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="apple-card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="h-2.5 w-16 rounded-full bg-[var(--surface-2)]" />
              <div className="w-8 h-8 rounded-[10px] bg-[var(--surface-2)]" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-[var(--surface-2)]" />
            <div className="h-2 w-24 rounded-full bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 apple-card p-5 space-y-4">
          <div className="space-y-1">
            <div className="h-4 w-32 rounded-lg bg-[var(--surface-2)]" />
            <div className="h-2.5 w-20 rounded-full bg-[var(--surface-2)]" />
          </div>
          <div className="h-48 rounded-xl bg-[var(--surface-2)]" />
        </div>
        <div className="lg:col-span-2 apple-card p-5 space-y-4">
          <div className="space-y-1">
            <div className="h-4 w-24 rounded-lg bg-[var(--surface-2)]" />
            <div className="h-2.5 w-16 rounded-full bg-[var(--surface-2)]" />
          </div>
          <div className="h-48 rounded-xl bg-[var(--surface-2)]" />
        </div>
      </div>

      {/* List cards skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map(i => (
          <div key={i} className="apple-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <div className="h-4 w-32 rounded-lg bg-[var(--surface-2)]" />
              <div className="h-3 w-16 rounded-full bg-[var(--surface-2)]" />
            </div>
            <div className="divide-y divide-[var(--border)]">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded-full bg-[var(--surface-2)]" />
                    <div className="h-2.5 w-20 rounded-full bg-[var(--surface-2)]" />
                  </div>
                  <div className="h-2.5 w-12 rounded-full bg-[var(--surface-2)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
