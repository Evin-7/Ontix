export function OverviewChartSkeleton({ compact = false }: { compact?: boolean }) {
  return <div className={`foundry-chart-card-skeleton${compact ? " is-compact" : ""}`} aria-hidden="true">
    <span className="skeleton-line skeleton-kicker" />
    <span className="skeleton-line skeleton-title" />
    <div className="skeleton-chart-visual"><i /><i /><i /><i /></div>
    <div className="skeleton-chart-legend"><i /><i /><i /><i /></div>
  </div>;
}

export function OverviewSkeleton() {
  return <div className="overview-loading" role="status" aria-label="Loading overview" aria-busy="true">
    <div className="overview-loading-heading"><span /><i /><i /></div>
    <div className="overview-loading-kpis">{Array.from({ length: 6 }, (_, index) => <div key={index}><i /><span /><strong /><small /></div>)}</div>
    <div className="overview-loading-charts">{Array.from({ length: 4 }, (_, index) => <OverviewChartSkeleton key={index} />)}</div>
    <div className="overview-loading-bottom"><div /><div /></div>
  </div>;
}
