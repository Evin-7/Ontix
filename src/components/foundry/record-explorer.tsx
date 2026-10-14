"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FoundryCaseDetailActions, FoundryProjectStatusDialog } from "@/components/foundry/foundry-workflow-forms";

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
  records, columns, filters = [], initialFilters, selectedId, emptyTitle, emptyDescription,
}: {
  records: ExplorerRecord[];
  columns: ExplorerColumn[];
  filters?: ExplorerFilter[];
  initialFilters?: Record<string, string | undefined>;
  selectedId?: string;
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

  return <section className="foundry-record-section" aria-label="Foundry records">
    <div className="foundry-record-toolbar">
      <label className="foundry-record-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search records</span><Input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Filter this list…" /></label>
      {filters.length > 0 && <div className="foundry-record-filters"><SlidersHorizontal size={15} aria-hidden="true" />
        {filters.map((filter) => <label key={filter.key}><span className="sr-only">Filter by {filter.label}</span><select value={filterValues[filter.key] ?? ""} onChange={(event) => { setPage(1); setFilterValues((current) => ({ ...current, [filter.key]: event.target.value })); }}>
          <option value="">All {filter.label}</option>{filter.options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
        </select></label>)}
      </div>}
      <span className="foundry-record-count">{filtered.length.toLocaleString()} {filtered.length === 1 ? "record" : "records"}</span>
    </div>

    {filtered.length === 0 ? <EmptyState title={query || Object.values(filterValues).some(Boolean) ? "No matching records" : emptyTitle} description={query || Object.values(filterValues).some(Boolean) ? "Adjust your search or filters and try again." : emptyDescription} /> : <>
      <div className="foundry-table-viewport">
        <table className="foundry-record-table">
          <caption className="sr-only">Foundry workspace records. Select a row to view its details.</caption>
          <thead><tr>
            <th aria-sort={sort.key === "title" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button onClick={() => toggleSort("title")}>Name <SortIcon active={sort.key === "title"} direction={sort.direction} /></button></th>
            <th aria-sort={sort.key === "id" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button onClick={() => toggleSort("id")}>ID <SortIcon active={sort.key === "id"} direction={sort.direction} /></button></th>
            {columns.map((column) => <th key={column.key} aria-sort={sort.key === column.key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button onClick={() => toggleSort(column.key)}>{column.label}<SortIcon active={sort.key === column.key} direction={sort.direction} /></button></th>)}
            <th><span className="sr-only">Open record</span></th>
          </tr></thead>
          <tbody>{visible.map((record) => <tr key={record.id}>
            <td><button className="foundry-record-title" onClick={() => setClickedId(record.id)}><strong>{record.title}</strong><small>{record.subtitle}</small></button></td>
            <td><code className="foundry-record-id">{record.id}</code></td>
            {columns.map((column) => <td key={column.key}>{column.key === "status" || column.key === "priority" ? <StatusBadge status={record.values[column.key] || record.status} /> : <span>{record.values[column.key] || "—"}</span>}</td>)}
            <td><button className="foundry-view-record" onClick={() => setClickedId(record.id)}>View</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="foundry-record-mobile-list">{visible.map((record) => <button className="foundry-mobile-record" key={record.id} onClick={() => setClickedId(record.id)}>
        <span className="foundry-mobile-record-heading"><span><strong>{record.title}</strong><small>{record.id}</small></span><StatusBadge status={record.status} /></span>
        <span className="foundry-mobile-record-subtitle">{record.subtitle}</span>
        {columns.slice(0, 2).map((column) => <span className="foundry-mobile-record-value" key={column.key}><small>{column.label}</small><strong>{record.values[column.key] || "—"}</strong></span>)}
      </button>)}</div>
      <div className="foundry-record-pagination"><span>Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}–{Math.min(filtered.length, page * pageSize)} of {filtered.length.toLocaleString()}</span><div>
        <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={17} /></button><span>Page {page} of {pageCount}</span><button onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} aria-label="Next page"><ChevronRight size={17} /></button>
      </div></div>
    </>}

    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { if (selectedId) setDismissedId(selectedId); setClickedId(undefined); } }}>
      {selected && <DialogContent size="md" centered={false} className="foundry-record-drawer">
        <DialogHeader><span className="eyebrow">{selected.kind.toUpperCase()} RECORD</span><DialogTitle>{selected.title}</DialogTitle><DialogDescription>{selected.subtitle} · {selected.id}</DialogDescription></DialogHeader>
        <div className="foundry-detail-status"><span>Current status</span><StatusBadge status={selected.status} /></div>
        <div className="foundry-detail-fields">{Object.entries(selected.values).filter(([key, value]) => key !== "status" && value).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value}</dd></div>)}</div>
        {selected.action?.type === "project" && <div className="foundry-detail-action-block"><h3>Workflow</h3><p>Update this project through its published Foundry action.</p><FoundryProjectStatusDialog projectId={selected.id} projectName={selected.title} initialStatus={selected.action.initialStatus} /></div>}
        {selected.action?.type === "case" && <div className="foundry-detail-action-block"><h3>Case actions</h3><p>Changes are saved to the Foundry Ontology and remain subject to Foundry permissions.</p><FoundryCaseDetailActions caseId={selected.id} caseTitle={selected.action.caseTitle} assignedEmployeeId={selected.action.assignedEmployeeId} employees={selected.action.employees} canResolve={selected.action.canResolve} /></div>}
        {selected.kind === "Approval" && <div className="foundry-read-only-note">Read only · Approval decisions are not configured as Ontology actions.</div>}
      </DialogContent>}
    </Dialog>
  </section>;
}

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  return active ? direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" /> : null;
}
