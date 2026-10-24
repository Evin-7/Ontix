"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Boxes, CircleHelp, Database, GitBranch, LoaderCircle, Network, Search } from "lucide-react";
import { queryOntologyDemo } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { notify } from "@/lib/notifications";
import type { OntologyDemoNode, OntologyDemoObjectGraph, OntologyObjectType } from "@/types/ontology-demo";
import type { WorkspaceData } from "@/types/workspace";

const objectTypeLabels: Record<OntologyObjectType, string> = {
  Customer: "Customers",
  Project: "Projects",
  Team: "Teams",
  Employee: "Employees",
  OperationalCase: "Operational cases",
  ApprovalRequest: "Approvals",
  ActivityEvent: "Audit events",
};

function getPickerObjects(data: WorkspaceData, type: OntologyObjectType): OntologyDemoNode[] {
  switch (type) {
    case "Customer":
      return data.customers.map((item) => ({ type, id: item.id, title: item.name, subtitle: `${item.customerKey} · ${item.industry}`, status: item.status }));
    case "Project":
      return data.projects.map((item) => ({ type, id: item.id, title: item.name, subtitle: item.projectKey, status: item.status }));
    case "Team": {
      const teams = new Map<string, { name: string; department: string }>();
      data.employees.forEach((item) => { if (item.team) teams.set(item.team.id, { name: item.team.name, department: item.team.department }); });
      data.projects.forEach((item) => { if (item.team && !teams.has(item.team.id)) teams.set(item.team.id, { name: item.team.name, department: "Delivery team" }); });
      return [...teams].map(([id, item]) => ({ type, id, title: item.name, subtitle: item.department }));
    }
    case "Employee":
      return data.employees.map((item) => ({ type, id: item.id, title: item.name, subtitle: `${item.title} · ${item.role}` }));
    case "OperationalCase":
      return data.cases.map((item) => ({ type, id: item.id, title: item.title, subtitle: item.caseKey, status: item.status }));
    case "ApprovalRequest":
      return data.approvals.map((item) => ({ type, id: item.id, title: item.title, subtitle: item.approvalKey, status: item.status }));
    case "ActivityEvent":
      return data.activity.map((item) => ({ type, id: item.id, title: item.summary, subtitle: `${item.action} · ${item.objectType}` }));
  }
}

export function OntologyModelExplorer({
  data,
  search,
  onClearSearch,
}: {
  data: WorkspaceData;
  search: string;
  onClearSearch: () => void;
}) {
  const [objectType, setObjectType] = useState<OntologyObjectType>("Customer");
  const [objectId, setObjectId] = useState(data.customers[0]?.id ?? "");
  const [response, setResponse] = useState<{ key: string; result: { ok: true; graph: OntologyDemoObjectGraph } | { ok: false; error: string } } | null>(null);
  const options = useMemo(() => {
    const query = search.trim().toLowerCase();
    return getPickerObjects(data, objectType).filter((item) => !query || `${item.title} ${item.subtitle} ${item.status ?? ""}`.toLowerCase().includes(query));
  }, [data, objectType, search]);
  const teamCount = getPickerObjects(data, "Team").length;
  const typeCounts: Record<OntologyObjectType, number> = {
    Customer: data.customers.length,
    Project: data.projects.length,
    Team: teamCount,
    Employee: data.employees.length,
    OperationalCase: data.cases.length,
    ApprovalRequest: data.approvals.length,
    ActivityEvent: data.activity.length,
  };
  const effectiveObjectId = options.some((item) => item.id === objectId) ? objectId : options[0]?.id ?? "";
  const queryKey = `${objectType}:${effectiveObjectId}`;
  const queryResult = response?.key === queryKey ? response.result : undefined;
  const loading = Boolean(effectiveObjectId && !queryResult);
  const graph = queryResult?.ok ? queryResult.graph : null;
  useEffect(() => {
    if (!effectiveObjectId) return;
    let current = true;
    void queryOntologyDemo({ type: objectType, id: effectiveObjectId }).then((result) => {
      if (current) {
        if (!result.ok) notify.error({ title: result.error });
        setResponse({ key: queryKey, result });
      }
    }).catch(() => {
      if (current) {
        const message = "The relationship query could not be completed. Refresh and try again.";
        notify.error({ title: message });
        setResponse({ key: queryKey, result: { ok: false, error: message } });
      }
    });
    return () => { current = false; };
  }, [effectiveObjectId, objectType, queryKey]);

  const selectObject = (object: OntologyDemoNode) => {
    onClearSearch();
    setObjectType(object.type);
    setObjectId(object.id);
  };

  return (
    <>
      <PageHeader
        eyebrow="DATA MODEL"
        title="Connected operations model"
      />

      <div className="mb-[18px] flex items-center gap-3 rounded-[11px] border border-[color-mix(in_srgb,var(--info)_25%,var(--border))] bg-[color-mix(in_srgb,var(--info)_5%,var(--surface))] px-[15px] py-[13px]" role="note">
        <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[color-mix(in_srgb,var(--info)_12%,var(--surface))] text-info"><Database size={17} aria-hidden="true" /></span>
        <div className="grid min-w-0 flex-1 gap-[3px]"><strong className="text-xs font-semibold">Connected operations model</strong><span className="text-[11px] leading-[1.5] text-muted">Neon PostgreSQL is the active source. Relationship queries run on the server; workflow actions remain in the existing permission-checked workspace.</span></div>
        <span className="inline-flex shrink-0 items-center gap-[6px] rounded-full border border-border bg-surface px-2 py-[5px] text-[10px] font-semibold text-muted"><CircleHelp size={13} aria-hidden="true" /> Foundry not connected</span>
      </div>

      <div className="grid grid-cols-[minmax(245px,.72fr)_minmax(0,1.7fr)] items-start gap-[15px] max-[1180px]:grid-cols-1">
        <section className="min-w-0 rounded-xl border border-border bg-surface p-[19px] shadow-[var(--shadow-sm)] max-[820px]:px-[13px] max-[820px]:py-[15px]" aria-labelledby="ontology-types-title">
          <div className="flex items-center justify-between gap-3 text-muted"><div><span className="block text-[11px] font-bold tracking-[.11em] text-muted">MODEL CATALOG</span><h2 className="mt-[5px] text-base font-[650] tracking-[-.02em] text-foreground" id="ontology-types-title">Object types</h2></div><Boxes size={18} aria-hidden="true" /></div>
          <div className="grid gap-1">
            {(Object.keys(objectTypeLabels) as OntologyObjectType[]).map((type) => (
              <button key={type} type="button" className={`flex min-w-0 items-center gap-[9px] rounded-lg border border-transparent bg-transparent px-2 py-[9px] text-left text-muted transition-colors hover:bg-surface-muted hover:text-foreground ${objectType === type ? "border-[color-mix(in_srgb,var(--primary)_17%,var(--border))] bg-primary-subtle text-primary" : ""}`} aria-pressed={objectType === type} onClick={() => { setObjectType(type); setObjectId(getPickerObjects(data, type)[0]?.id ?? ""); }}>
                <span className={`grid size-[29px] shrink-0 place-items-center rounded-[7px] ${objectType === type ? "bg-surface" : "bg-surface-muted"}`} aria-hidden="true"><Network size={15} /></span>
                <span className="grid min-w-0 flex-1 gap-0.5"><strong className="text-xs font-semibold text-foreground">{objectTypeLabels[type]}</strong><small className="overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-muted">{type}</small></span>
                <span className="min-w-[25px] rounded-full bg-surface px-[6px] py-[3px] text-center text-[10px] font-semibold text-muted">{typeCounts[type]}</span>
              </button>
            ))}
          </div>
          <div className="mt-[15px] flex items-start gap-[7px] border-t border-border pt-[13px] text-[10px] leading-[1.5] text-muted"><GitBranch size={14} aria-hidden="true" /> Relationships are resolved from the active Neon database.</div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface p-[19px] shadow-[var(--shadow-sm)] max-[820px]:px-[13px] max-[820px]:py-[15px]" aria-labelledby="ontology-query-title">
          <div className="flex items-center justify-between gap-3 text-muted"><div><span className="block text-[11px] font-bold tracking-[.11em] text-muted">OBJECT EXPLORER</span><h2 className="mt-[5px] text-base font-[650] tracking-[-.02em] text-foreground" id="ontology-query-title">Query relationships</h2></div><span className="inline-flex shrink-0 items-center gap-[6px] rounded-full border border-border bg-primary-subtle px-2 py-[5px] text-[10px] font-semibold text-primary">Server query</span></div>
          <div className="mb-4 grid grid-cols-[minmax(150px,.7fr)_minmax(0,1.3fr)] gap-2.5 max-[820px]:grid-cols-1">
            <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-muted"><span>Object type</span><Select className="min-w-0 overflow-hidden text-ellipsis" aria-label="Object type" value={objectType} onChange={(event) => { const next = event.target.value as OntologyObjectType; setObjectType(next); setObjectId(getPickerObjects(data, next)[0]?.id ?? ""); }}>
              {(Object.keys(objectTypeLabels) as OntologyObjectType[]).map((type) => <option key={type} value={type}>{objectTypeLabels[type]}</option>)}
            </Select></label>
            <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-muted"><span>Record</span><Select className="min-w-0 overflow-hidden text-ellipsis" aria-label="Record" value={effectiveObjectId} onChange={(event) => setObjectId(event.target.value)} disabled={!options.length}>
              {options.length ? options.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.subtitle}</option>) : <option value="">No matching records</option>}
            </Select></label>
          </div>

          {loading && <div className="flex min-h-[120px] items-center justify-center gap-[9px] text-xs text-muted" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Querying connected records…</div>}
          {!loading && !queryResult && !options.length && <EmptyState icon={Search} title={search ? "No matching objects" : "No objects available"} description={search ? "Try a different search or clear the current query." : "Create records in the workspace to populate this model."} action={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : undefined} />}
          {!loading && graph && (
            <div className="grid grid-cols-[minmax(0,.75fr)_minmax(0,1.5fr)] gap-4 pt-[3px] max-[820px]:grid-cols-1">
              <article className="relative self-start rounded-[11px] border border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] bg-[linear-gradient(145deg,var(--primary-subtle),var(--surface)_72%)] p-4 shadow-[var(--shadow-sm)] after:absolute after:top-1/2 after:-right-[17px] after:h-px after:w-[17px] after:bg-border after:content-[''] max-[820px]:after:top-auto max-[820px]:after:right-1/2 max-[820px]:after:-bottom-4 max-[820px]:after:h-4 max-[820px]:after:w-px">
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[9px] font-extrabold tracking-[.08em] text-primary uppercase"><span>{graph.object.type}</span>{graph.object.status && <span className="rounded-full bg-surface px-1.5 py-[3px] text-[9px] tracking-[.02em] text-muted">{graph.object.status.replaceAll("_", " ")}</span>}</div>
                <h3 className="mt-3.5 mb-1 [overflow-wrap:anywhere] text-base leading-[1.35] font-semibold text-foreground">{graph.object.title}</h3><p className="m-0 [overflow-wrap:anywhere] text-[11px] leading-[1.5] text-muted">{graph.object.subtitle}</p>
                <span className="mt-[15px] block [overflow-wrap:anywhere] border-t border-border pt-[11px] font-mono text-[9px] text-muted">Object ID · {graph.object.id}</span>
              </article>
              <div className="grid min-w-0 content-start gap-[9px]">
                <div className="flex min-h-[26px] items-center gap-[7px] text-primary"><ArrowDownRight size={15} aria-hidden="true" /><strong className="text-xs font-semibold text-foreground">Connected objects</strong><span className="ml-auto text-[10px] text-muted">{graph.relationships.reduce((sum, item) => sum + item.objects.length, 0)} links</span></div>
                {graph.relationships.filter((item) => item.objects.length).length ? graph.relationships.filter((item) => item.objects.length).map((item) => (
                  <section className="min-w-0 overflow-hidden rounded-[9px] border border-border bg-surface" key={`${item.label}-${item.targetType}`}>
                    <div className="flex items-center justify-between gap-2 bg-surface-muted px-2.5 py-2"><span className="text-[11px] font-semibold text-foreground">{item.label}</span><small className="text-right text-[9px] text-muted">{item.objects.length} · {item.targetType}</small></div>
                    <div className="grid">{item.objects.map((related) => (
                      <button type="button" className="flex min-w-0 items-center gap-2 border-0 border-t border-border bg-surface px-2.5 py-[9px] text-left text-foreground first:border-t-0 hover:bg-primary-subtle" key={`${related.type}-${related.id}`} onClick={() => selectObject(related)} title={`Query ${related.type}: ${related.title}`}>
                        <span className="grid size-[26px] shrink-0 place-items-center rounded-[7px] bg-primary-subtle text-primary"><ArrowUpRight size={14} aria-hidden="true" /></span><span className="grid min-w-0 flex-1 gap-0.5"><strong className="overflow-hidden text-[11px] font-semibold text-ellipsis whitespace-nowrap">{related.title}</strong><small className="overflow-hidden text-[9px] text-ellipsis whitespace-nowrap text-muted">{related.subtitle}</small></span>{related.status && <em className="shrink-0 text-[9px] not-italic text-muted capitalize">{related.status.replaceAll("_", " ")}</em>}
                      </button>
                    ))}</div>
                  </section>
                )) : <div className="grid min-h-28 place-items-center rounded-[9px] border border-dashed border-border text-[11px] text-muted">No linked records found for this object.</div>}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
