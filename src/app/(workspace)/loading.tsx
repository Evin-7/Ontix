export default function WorkspaceLoading() {
  return <div className="grid gap-[18px] py-[14px]" role="status" aria-label="Loading workspace records" aria-busy="true">
    <div className="grid max-w-[480px] gap-[10px]"><i className="block h-[11px] w-36 animate-pulse rounded-md bg-primary/25" /><span className="block h-7 w-[min(300px,68vw)] animate-pulse rounded-md bg-surface-muted" /><span className="block h-3.5 w-[min(480px,82vw)] animate-pulse rounded-md bg-surface-muted" /></div>
    <div className="h-3 w-[180px] animate-pulse rounded-md bg-surface-muted" />
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex gap-[9px] border-b border-border p-3 max-[760px]:flex-wrap max-[760px]:p-2.5"><i className="h-[35px] w-[min(270px,42vw)] animate-pulse rounded-md bg-surface-muted" /><i className="h-[35px] w-[110px] animate-pulse rounded-md bg-surface-muted" /><i className="h-[35px] w-[110px] animate-pulse rounded-md bg-surface-muted" /></div>
      <div className="grid min-h-[38px] grid-cols-[1.4fr_.8fr_1fr_1fr_.45fr] items-center gap-4 border-b border-border bg-surface-muted px-[14px] py-2.5 max-[760px]:hidden">{Array.from({ length: 5 }, (_, index) => <i className="h-2.5 w-[65%] animate-pulse rounded-md bg-surface" key={index} />)}</div>
      {Array.from({ length: 7 }, (_, index) => <div className="grid min-h-12 grid-cols-[1.4fr_.8fr_1fr_1fr_.45fr] items-center gap-4 border-b border-border px-[14px] py-2.5 last:border-b-0 max-[760px]:grid-cols-2 max-[760px]:gap-3" key={index}><i className="h-3 w-[78%] animate-pulse rounded-md bg-surface-muted/70" /><i className="h-3 w-[78%] animate-pulse rounded-md bg-surface-muted/70" /><i className="h-3 w-[78%] animate-pulse rounded-md bg-surface-muted/70 max-[760px]:hidden" /><i className="h-3 w-[78%] animate-pulse rounded-md bg-surface-muted/70 max-[760px]:hidden" /><i className="h-3 w-[78%] animate-pulse rounded-md bg-surface-muted/70 max-[760px]:hidden" /></div>)}
    </div>
    <span className="sr-only">Workspace records are loading. The dashboard navigation remains available.</span>
  </div>;
}
