export default function SettingsLoading() {
  return <div className="grid gap-[18px] py-[14px]" role="status" aria-label="Loading workspace settings" aria-busy="true">
    <div className="grid max-w-[480px] gap-[10px]"><i className="block h-[11px] w-36 animate-pulse rounded-md bg-primary/25" /><span className="block h-7 w-[min(300px,68vw)] animate-pulse rounded-md bg-surface-muted" /><span className="block h-3.5 w-[min(480px,82vw)] animate-pulse rounded-md bg-surface-muted" /></div>
    <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1 max-[760px]:gap-2.5">{Array.from({ length: 5 }, (_, index) => <section className="grid min-h-[170px] content-start gap-[11px] rounded-xl border border-border bg-surface p-[18px]" key={index}><i className="h-4 w-11 animate-pulse rounded-md bg-surface-muted" /><span className="h-4 w-[58%] animate-pulse rounded-md bg-surface-muted" /><span className="h-3 w-[88%] animate-pulse rounded-md bg-surface-muted" /><div className="mt-2 grid gap-[9px]"><b className="h-[11px] w-full animate-pulse rounded-md bg-surface-muted" /><b className="h-[11px] w-full animate-pulse rounded-md bg-surface-muted" /><b className="h-[11px] w-full animate-pulse rounded-md bg-surface-muted" /></div></section>)}</div>
    <span className="sr-only">Workspace settings are loading. The dashboard navigation remains available.</span>
  </div>;
}
