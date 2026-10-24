"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, ChevronDown, GitBranch, LoaderCircle, RotateCw } from "lucide-react";
import type { ExplorerRecord } from "@/components/foundry/record-explorer";
import type { FoundryRelationshipGroup } from "@/server/providers/foundry/relationships";

type RelationshipType = "Customer" | "Project" | "OperationalCase" | "Employee" | "Team" | "ApprovalRequest";
type RelationshipState = { status: "idle" } | { status: "ready"; groups: FoundryRelationshipGroup[] } | { status: "error"; message: string };

const typeByKind: Record<ExplorerRecord["kind"], RelationshipType> = {
  Customer: "Customer",
  Project: "Project",
  Case: "OperationalCase",
  Employee: "Employee",
  Team: "Team",
  Approval: "ApprovalRequest",
};

export function RecordRelationships({ record }: { record: Pick<ExplorerRecord, "id" | "kind"> }) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<RelationshipState>({ status: "idle" });

  useEffect(() => {
    if (!expanded || state.status !== "idle") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ type: typeByKind[record.kind], id: record.id });

    void fetch(`/api/foundry/relationships?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { relationships?: FoundryRelationshipGroup[]; error?: string };
        if (!response.ok || !Array.isArray(payload.relationships)) throw new Error(payload.error || "Links could not be loaded.");
        setState({ status: "ready", groups: payload.relationships });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Links could not be loaded." });
      });

    return () => controller.abort();
  }, [expanded, record.id, record.kind, state.status]);

  function retry() {
    setState({ status: "idle" });
  }

  return <section className="mt-[22px] overflow-hidden rounded-[10px] border border-border bg-surface">
    <button className="flex min-h-[57px] w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left hover:bg-surface-muted" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary"><GitBranch size={16} aria-hidden="true" /></span>
      <span className="grid min-w-0 flex-1 gap-1"><strong className="text-[11px] font-semibold">Ontology relationships</strong><small className="text-[9px] text-muted">Traverse generated Foundry links</small></span>
      <ChevronDown size={16} className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {expanded && <div className="grid gap-3 border-t border-border p-4">
      {state.status === "idle" && <p className="m-0 inline-flex items-center gap-2 py-2 text-[10px] text-muted"><LoaderCircle size={14} className="animate-spin" aria-hidden="true" />Loading linked objects…</p>}
      {state.status === "error" && <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted p-3"><p className="m-0 text-[10px] text-muted">{state.message}</p><button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[9px] font-medium hover:bg-surface-muted" onClick={retry}><RotateCw size={12} aria-hidden="true" />Retry</button></div>}
      {state.status === "ready" && state.groups.map((group) => <div className="grid gap-1.5" key={`${group.label}:${group.targetType}`}>
        <h3 className="m-0 text-[9px] font-bold tracking-[.08em] text-muted uppercase">{group.label}<span className="ml-1.5 font-normal tracking-normal">{group.records.length}{group.hasMore ? "+" : ""}</span></h3>
        {group.records.length ? <ul className="m-0 grid list-none gap-1 p-0">{group.records.map((related) => <li key={related.id}><Link className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-[10px] text-foreground hover:bg-surface-muted hover:text-primary" href={related.href as Route}>
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{related.title}</span><code className="max-w-[42%] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[8px] text-muted">{related.id}</code><ArrowUpRight size={13} className="shrink-0 text-muted" aria-hidden="true" />
        </Link></li>)}</ul> : <p className="m-0 rounded-md bg-surface-muted px-2 py-2 text-[9px] text-muted">No linked objects</p>}
        {group.hasMore && <p className="m-0 text-[9px] text-muted">Showing the first 8 links.</p>}
      </div>)}
    </div>}
  </section>;
}
