export function OverviewChartSkeleton({ compact = false }: { compact?: boolean }) {
  return <div data-compact={compact || undefined} className="foundry-chart-card-skeleton min-w-0 min-h-[260px] rounded-xl border border-border bg-surface px-[19px] py-[18px] shadow-[var(--shadow-sm)]" aria-hidden="true">
    <span className="block h-[9px] w-[135px] animate-pulse rounded-md bg-surface-muted" />
    <span className="mt-[9px] block h-[17px] w-[42%] animate-pulse rounded-md bg-surface-muted" />
    <div className="relative my-[17px] h-[133px] rounded-lg bg-surface-muted/40">
      <i className="absolute bottom-[15px] left-[12%] h-[34%] w-[11%] rounded-t bg-primary/30" />
      <i className="absolute bottom-[15px] left-[32%] h-[60%] w-[11%] rounded-t bg-primary/30" />
      <i className="absolute bottom-[15px] left-[52%] h-[46%] w-[11%] rounded-t bg-primary/30" />
      <i className="absolute bottom-[15px] left-[72%] h-[78%] w-[11%] rounded-t bg-primary/30" />
    </div>
    <div className="flex gap-3"><i className="h-[9px] w-[21%] animate-pulse rounded-md bg-surface-muted" /><i className="h-[9px] w-[21%] animate-pulse rounded-md bg-surface-muted" /><i className="h-[9px] w-[21%] animate-pulse rounded-md bg-surface-muted" /><i className="h-[9px] w-[21%] animate-pulse rounded-md bg-surface-muted" /></div>
  </div>;
}

export function OverviewSkeleton() {
  return <div className="grid gap-[18px] py-[14px]" role="status" aria-label="Loading overview" aria-busy="true">
    <div className="grid w-full max-w-[570px] gap-[10px] mb-px"><span className="block h-[11px] w-[142px] animate-pulse rounded-md bg-primary/25" /><i className="block h-[34px] w-[220px] animate-pulse rounded-md bg-surface-muted" /><i className="block h-[14px] w-full max-w-[430px] animate-pulse rounded-md bg-surface-muted" /></div>
    <div className="overview-loading-kpis grid grid-cols-3 gap-3 max-[760px]:grid-cols-2 max-[760px]:gap-2">{Array.from({ length: 6 }, (_, index) => <div className="grid min-h-[139px] grid-cols-[34px_1fr] grid-rows-[28px_38px_21px] content-start gap-x-[11px] gap-y-2 rounded-xl border border-border bg-surface p-[18px] max-[760px]:min-h-[126px] max-[760px]:p-[13px]" key={index}><i className="row-span-2 size-[31px] animate-pulse rounded-lg bg-surface-muted" /><span className="h-3 w-[68%] self-center animate-pulse rounded-md bg-surface-muted" /><strong className="col-start-2 h-[26px] w-[55%] animate-pulse rounded-md bg-surface-muted" /><small className="col-span-full h-2.5 w-[80%] self-end animate-pulse rounded-md bg-surface-muted" /></div>)}</div>
    <div className="overview-loading-charts grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1 max-[760px]:gap-2.5">{Array.from({ length: 4 }, (_, index) => <OverviewChartSkeleton key={index} />)}</div>
    <div className="overview-loading-bottom grid grid-cols-[1.2fr_.8fr] gap-3.5 max-[760px]:grid-cols-1 max-[760px]:gap-2.5"><div className="min-h-[150px] rounded-xl border border-border bg-surface animate-pulse" /><div className="min-h-[150px] rounded-xl border border-border bg-surface animate-pulse" /></div>
  </div>;
}
