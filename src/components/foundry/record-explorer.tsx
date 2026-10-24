"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FoundryCaseDetailActions, FoundryProjectStatusDialog } from "@/components/foundry/foundry-workflow-forms";
import { RecordRelationships } from "@/components/foundry/record-relationships";

export type ExplorerFilter = { key: string; label: string; options: string[] };
export type ExplorerColumn = { key: string; label: string };
export type ExplorerAction =
  | { type: "project"; initialStatus: string }
  | { type: "case"; caseTitle: string; assignedEmployeeId: string | null; employees: Array<{ id: string; name: string }>; canResolve: boolean };
export type ExplorerRecord = {
  id: string;
  kind: "Project" | "Case" | "Customer" | "Employee" | "Team" | "Approval";
  title: string;
  subtitle: string;
  status: string;
  values: Record<string, string>;
  action?: ExplorerAction;
};

export function RecordExplorer({
  records, columns, filters = [], initialFilters, selectedId, isDemo = false, emptyTitle, emptyDescription,
}: {
  records: ExplorerRecord[];
  columns: ExplorerColumn[];
  filters?: ExplorerFilter[];
  initialFilters?: Record<string, string | undefined>;
  selectedId?: string;
  isDemo?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => Object.fromEntries(
    Object.entries(initialFilters ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ));
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "title", direction: "asc" });
  const [page, setPage] = useState(1);
  const [clickedId, setClickedId] = useState<string>();
  const [dismissedId, setDismissedId] = useState<string>();
  const selectedRecordId = selectedId && selectedId !== dismissedId ? selectedId : clickedId;
  const selected = records.find((record) => record.id === selectedRecordId) ?? null;
  const pageSize = 12;

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const text = [record.id, record.title, record.subtitle, record.status, ...Object.values(record.values)].join(" ").toLocaleLowerCase();
      return (!needle || text.includes(needle)) && filters.every((filter) => !filterValues[filter.key] || record.values[filter.key] === filterValues[filter.key]);
    }).sort((a, b) => {
      const aValue = (sort.key === "title" ? a.title : sort.key === "id" ? a.id : a.values[sort.key] ?? "").toLocaleLowerCase();
      const bValue = (sort.key === "title" ? b.title : sort.key === "id" ? b.id : b.values[sort.key] ?? "").toLocaleLowerCase();
      return aValue.localeCompare(bValue, undefined, { numeric: true }) * (sort.direction === "asc" ? 1 : -1);
    });
  }, [records, query, filterValues, filters, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key: string) {
    setPage(1);
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  }

  return <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)]" aria-label={isDemo ? "Sample workspace records" : "Foundry records"}>
    <div className="flex min-h-[62px] items-center gap-2.5 border-b border-border px-[15px] py-3 max-[760px]:flex-wrap max-[760px]:p-2.5">
      <label className="flex w-[min(100%,310px)] items-center gap-2 text-muted max-[760px]:w-full max-[760px]:basis-full"><Search size={17} aria-hidden="true" /><span className="sr-only">Search records</span><Input className="!min-h-9 !border-transparent !bg-surface-muted !text-[11px]" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Filter this list…" /></label>
      {filters.length > 0 && <div className="flex items-center gap-[7px] text-muted max-[760px]:min-w-0 max-[760px]:flex-1 max-[760px]:flex-wrap max-[390px]:max-w-[calc(100vw-90px)] max-[390px]:overflow-x-auto"><SlidersHorizontal className="max-[390px]:hidden" size={15} aria-hidden="true" />
        {filters.map((filter) => <label key={filter.key}><span className="sr-only">Filter by {filter.label}</span><Select className="!min-h-[35px] max-w-[164px] !rounded-[7px] !px-3 !pl-[9px] !text-[10px] capitalize max-[760px]:max-w-[min(45vw,155px)]" value={filterValues[filter.key] ?? ""} onChange={(event) => { setPage(1); setFilterValues((current) => ({ ...current, [filter.key]: event.target.value })); }}>
          <option value="">All {filter.label}</option>{filter.options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
        </Select></label>)}
      </div>}
      <span className="ml-auto whitespace-nowrap text-[10px] text-muted">{filtered.length.toLocaleString()} {filtered.length === 1 ? "record" : "records"}</span>
    </div>

    {filtered.length === 0 ? <EmptyState title={query || Object.values(filterValues).some(Boolean) ? "No matching records" : emptyTitle} description={query || Object.values(filterValues).some(Boolean) ? "Adjust your search or filters and try again." : emptyDescription} /> : <>
      <div className="overflow-x-auto max-[760px]:hidden">
        <table className="w-full border-collapse text-left [&_tbody_tr:last-child_td]:border-b-0">
          <caption className="sr-only">Workspace records. Select a row to view its details.</caption>
          <thead><tr>
            <th className="h-10 border-b border-border bg-surface-muted px-[14px] first:pl-[18px] last:pr-[18px]" aria-sort={sort.key === "title" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button className="inline-flex items-center gap-[5px] whitespace-nowrap border-0 bg-transparent text-[9px] font-semibold tracking-[.05em] text-muted uppercase" onClick={() => toggleSort("title")}>Name <SortIcon active={sort.key === "title"} direction={sort.direction} /></button></th>
            <th className="h-10 border-b border-border bg-surface-muted px-[14px] first:pl-[18px] last:pr-[18px]" aria-sort={sort.key === "id" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button className="inline-flex items-center gap-[5px] whitespace-nowrap border-0 bg-transparent text-[9px] font-semibold tracking-[.05em] text-muted uppercase" onClick={() => toggleSort("id")}>ID <SortIcon active={sort.key === "id"} direction={sort.direction} /></button></th>
            {columns.map((column) => <th className="h-10 border-b border-border bg-surface-muted px-[14px] first:pl-[18px] last:pr-[18px]" key={column.key} aria-sort={sort.key === column.key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button className="inline-flex items-center gap-[5px] whitespace-nowrap border-0 bg-transparent text-[9px] font-semibold tracking-[.05em] text-muted uppercase" onClick={() => toggleSort(column.key)}>{column.label}<SortIcon active={sort.key === column.key} direction={sort.direction} /></button></th>)}
            <th className="h-10 border-b border-border bg-surface-muted px-[14px] first:pl-[18px] last:pr-[18px]"><span className="sr-only">Open record</span></th>
          </tr></thead>
          <tbody>{visible.map((record) => <tr className="hover:bg-[color-mix(in_srgb,var(--primary)_3%,var(--surface))]" key={record.id}>
            <td className="h-[61px] border-b border-border px-[14px] py-[9px] text-[10px] text-foreground align-middle whitespace-nowrap first:pl-[18px] last:pr-[18px]"><button className="grid max-w-[290px] gap-1 border-0 bg-transparent px-0 py-0.5 text-left text-foreground" onClick={() => setClickedId(record.id)}><strong className="overflow-hidden text-ellipsis text-[11px] font-semibold">{record.title}</strong><small className="overflow-hidden text-ellipsis text-[9px] text-muted">{record.subtitle}</small></button></td>
            <td className="h-[61px] border-b border-border px-[14px] py-[9px] text-[10px] text-foreground align-middle whitespace-nowrap first:pl-[18px] last:pr-[18px]"><code className="font-mono text-[9px] text-muted">{record.id}</code></td>
            {columns.map((column) => <td className="h-[61px] border-b border-border px-[14px] py-[9px] text-[10px] text-foreground align-middle whitespace-nowrap first:pl-[18px] last:pr-[18px]" key={column.key}>{column.key === "status" || column.key === "priority" ? <StatusBadge className="!px-[7px] !py-1 !text-[9px] capitalize" status={record.values[column.key] || record.status} /> : <span>{record.values[column.key] || "—"}</span>}</td>)}
            <td className="h-[61px] border-b border-border px-[14px] py-[9px] text-[10px] text-foreground align-middle whitespace-nowrap first:pl-[18px] last:pr-[18px]"><button className="rounded-[5px] border-0 bg-transparent px-[7px] py-[5px] text-[10px] font-semibold text-primary hover:bg-primary-subtle" onClick={() => setClickedId(record.id)}>View</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="hidden max-[760px]:grid">{visible.map((record) => <button className="grid gap-2.5 border-0 border-b border-border bg-surface p-3.5 text-left text-foreground last:border-b-0" key={record.id} onClick={() => setClickedId(record.id)}>
        <span className="flex min-w-0 items-center justify-between gap-2"><span className="grid min-w-0 gap-1"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">{record.title}</strong><small className="text-[9px] text-muted">{record.id}</small></span><StatusBadge className="!text-[9px]" status={record.status} /></span>
        <span className="text-[9px] text-muted">{record.subtitle}</span>
        {columns.slice(0, 2).map((column) => <span className="flex items-baseline justify-between gap-3" key={column.key}><small className="text-[9px] text-muted">{column.label}</small><strong className="max-w-[70%] overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-medium">{record.values[column.key] || "—"}</strong></span>)}
      </button>)}</div>
      <div className="flex min-h-12 items-center justify-between gap-3 border-t border-border px-4 py-[7px] text-[9px] text-muted max-[760px]:px-2.5"><span className="max-[760px]:max-w-[100px]">Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}–{Math.min(filtered.length, page * pageSize)} of {filtered.length.toLocaleString()}</span><div className="flex items-center gap-2.5">
        <button className="grid size-7 place-items-center rounded-md border border-border bg-surface text-foreground disabled:cursor-not-allowed disabled:opacity-45" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={17} /></button><span>Page {page} of {pageCount}</span><button className="grid size-7 place-items-center rounded-md border border-border bg-surface text-foreground disabled:cursor-not-allowed disabled:opacity-45" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} aria-label="Next page"><ChevronRight size={17} /></button>
      </div></div>
    </>}

    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { if (selectedId) setDismissedId(selectedId); setClickedId(undefined); } }}>
      {selected && <DialogContent size="md" centered={false} className="!top-0 !right-0 !left-auto !h-dvh !max-h-dvh !w-[min(540px,100vw)] !translate-x-0 !translate-y-0 !rounded-l-2xl !rounded-r-none !p-7 !animate-foundry-drawer-in max-[760px]:!top-auto max-[760px]:!right-0 max-[760px]:!bottom-0 max-[760px]:!left-0 max-[760px]:!h-[min(88dvh,760px)] max-[760px]:!max-h-[88dvh] max-[760px]:!w-screen max-[760px]:!rounded-t-2xl max-[760px]:!rounded-b-none max-[760px]:!px-[19px] max-[760px]:!py-[23px] max-[760px]:!animate-foundry-sheet-in">
        <DialogHeader className="!gap-[7px]"><span className="text-[9px] font-bold tracking-[.12em] text-primary">{selected.kind.toUpperCase()} RECORD</span><DialogTitle className="!text-[25px] !tracking-[-.04em] max-[760px]:!text-[21px]">{selected.title}</DialogTitle><DialogDescription>{selected.subtitle} · {selected.id}</DialogDescription></DialogHeader>
        <div className="flex items-center justify-between border-y border-border py-[14px]"><span className="text-[10px] text-muted">Current status</span><StatusBadge className="!px-[7px] !py-1 !text-[9px] capitalize" status={selected.status} /></div>
        <div className="grid grid-cols-2 gap-x-[18px] max-[760px]:gap-x-3">{Object.entries(selected.values).filter(([key, value]) => key !== "status" && value).map(([key, value]) => <div className="min-w-0 border-b border-border py-[13px]" key={key}><dt className="mb-[5px] text-[10px] text-muted capitalize max-[760px]:text-[9px]">{key.replaceAll("_", " ")}</dt><dd className="m-0 text-[11px] leading-[1.5] text-foreground [overflow-wrap:anywhere] max-[760px]:text-[9px]">{value}</dd></div>)}</div>
        {!isDemo && <RecordRelationships key={`${selected.kind}:${selected.id}`} record={selected} />}
        {isDemo && (selected.kind === "Project" || selected.kind === "Case") && <div className="mt-5 rounded-lg border border-border bg-surface-muted px-3 py-[11px] text-[10px] text-muted">This read-only workspace does not allow edits.</div>}
        {!isDemo && selected.action?.type === "project" && <div className="mt-[22px] rounded-[10px] border border-border bg-surface-muted p-4"><h3 className="m-0 text-xs font-semibold">Workflow</h3><FoundryProjectStatusDialog projectId={selected.id} projectName={selected.title} initialStatus={selected.action.initialStatus} /></div>}
        {!isDemo && selected.action?.type === "case" && <div className="mt-[22px] rounded-[10px] border border-border bg-surface-muted p-4"><h3 className="m-0 text-xs font-semibold">Case actions</h3><FoundryCaseDetailActions caseId={selected.id} caseTitle={selected.action.caseTitle} assignedEmployeeId={selected.action.assignedEmployeeId} employees={selected.action.employees} canResolve={selected.action.canResolve} /></div>}
        {selected.kind === "Approval" && <div className="mt-5 rounded-lg border border-border bg-surface-muted px-3 py-[11px] text-[10px] text-muted">Read only · Approval decisions are not configured as Ontology actions.</div>}
      </DialogContent>}
    </Dialog>
  </section>;
}

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  return active ? direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" /> : null;
}
