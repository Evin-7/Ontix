"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Boxes, CircleHelp, Database, GitBranch, LoaderCircle, Network, Search } from "lucide-react";
import { queryOntologyDemo } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
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
  const error = queryResult && !queryResult.ok ? queryResult.error : "";

  useEffect(() => {
    if (!effectiveObjectId) return;
    let current = true;
    void queryOntologyDemo({ type: objectType, id: effectiveObjectId }).then((result) => {
      if (current) setResponse({ key: queryKey, result });
    }).catch(() => {
      if (current) setResponse({ key: queryKey, result: { ok: false, error: "The relationship query could not be completed. Refresh and try again." } });
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
        eyebrow="DATA MODEL · LOCAL SIMULATION"
        title="Connected operations model"
        description="Explore how customer, delivery, operations, and governance records connect. The object graph is a server-side projection of Neon records, not a Palantir Foundry Ontology."
      />

      <div className="ontology-simulation-note" role="note">
        <span className="ontology-simulation-icon"><Database size={17} aria-hidden="true" /></span>
        <div><strong>Simulated Ontology-style view</strong><span>Neon PostgreSQL is the active source. Relationship queries run on the server; workflow actions remain in the existing permission-checked workspace.</span></div>
        <span className="ontology-status-pill"><CircleHelp size={13} aria-hidden="true" /> Foundry not connected</span>
      </div>

      <div className="ontology-explorer-layout">
        <section className="panel ontology-types-panel" aria-labelledby="ontology-types-title">
          <div className="ontology-section-heading"><div><span className="eyebrow">MODEL CATALOG</span><h2 id="ontology-types-title">Object types</h2></div><Boxes size={18} aria-hidden="true" /></div>
          <p className="ontology-section-description">Local business entities and their current record counts.</p>
          <div className="ontology-type-list">
            {(Object.keys(objectTypeLabels) as OntologyObjectType[]).map((type) => (
              <button key={type} type="button" className={`ontology-type-option ${objectType === type ? "selected" : ""}`} aria-pressed={objectType === type} onClick={() => { setObjectType(type); setObjectId(getPickerObjects(data, type)[0]?.id ?? ""); }}>
                <span className="ontology-type-marker" aria-hidden="true"><Network size={15} /></span>
                <span className="ontology-type-copy"><strong>{objectTypeLabels[type]}</strong><small>{type}</small></span>
                <span className="ontology-type-count">{typeCounts[type]}</span>
              </button>
            ))}
          </div>
          <div className="ontology-type-footnote"><GitBranch size={14} aria-hidden="true" /> Relationships are resolved from the live Local Demo database.</div>
        </section>

        <section className="panel ontology-query-panel" aria-labelledby="ontology-query-title">
          <div className="ontology-section-heading"><div><span className="eyebrow">OBJECT EXPLORER</span><h2 id="ontology-query-title">Query relationships</h2></div><span className="ontology-query-label">Server query</span></div>
          <p className="ontology-section-description">Choose an object to inspect its connected records, then follow a relationship to continue exploring.</p>
          <div className="ontology-query-controls">
            <label><span>Object type</span><Select aria-label="Object type" value={objectType} onChange={(event) => { const next = event.target.value as OntologyObjectType; setObjectType(next); setObjectId(getPickerObjects(data, next)[0]?.id ?? ""); }}>
              {(Object.keys(objectTypeLabels) as OntologyObjectType[]).map((type) => <option key={type} value={type}>{objectTypeLabels[type]}</option>)}
            </Select></label>
            <label><span>Record</span><Select aria-label="Record" value={effectiveObjectId} onChange={(event) => setObjectId(event.target.value)} disabled={!options.length}>
              {options.length ? options.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.subtitle}</option>) : <option value="">No matching records</option>}
            </Select></label>
          </div>

          {loading && <div className="ontology-query-state" role="status"><LoaderCircle size={18} className="ontology-spinner" aria-hidden="true" /> Querying connected records…</div>}
          {!loading && error && <div className="ontology-query-error" role="alert">{error}</div>}
          {!loading && !error && !options.length && <EmptyState icon={Search} title={search ? "No matching objects" : "No objects available"} description={search ? "Try a different search or clear the current query." : "Create records in the workspace to populate this model."} action={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : undefined} />}
          {!loading && !error && graph && (
            <div className="ontology-graph-view">
              <article className="ontology-focus-node">
                <div className="ontology-node-overline"><span>{graph.object.type}</span>{graph.object.status && <span className="ontology-node-status">{graph.object.status.replaceAll("_", " ")}</span>}</div>
                <h3>{graph.object.title}</h3><p>{graph.object.subtitle}</p>
                <span className="ontology-node-id">Object ID · {graph.object.id}</span>
              </article>
              <div className="ontology-relationships">
                <div className="ontology-relationships-heading"><ArrowDownRight size={15} aria-hidden="true" /><strong>Connected objects</strong><span>{graph.relationships.reduce((sum, item) => sum + item.objects.length, 0)} links</span></div>
                {graph.relationships.filter((item) => item.objects.length).length ? graph.relationships.filter((item) => item.objects.length).map((item) => (
                  <section className="ontology-relationship-group" key={`${item.label}-${item.targetType}`}>
                    <div className="ontology-relationship-title"><span>{item.label}</span><small>{item.objects.length} · {item.targetType}</small></div>
                    <div className="ontology-related-objects">{item.objects.map((related) => (
                      <button type="button" className="ontology-related-object" key={`${related.type}-${related.id}`} onClick={() => selectObject(related)} title={`Query ${related.type}: ${related.title}`}>
                        <span className="ontology-related-icon"><ArrowUpRight size={14} aria-hidden="true" /></span><span><strong>{related.title}</strong><small>{related.subtitle}</small></span>{related.status && <em>{related.status.replaceAll("_", " ")}</em>}
                      </button>
                    ))}</div>
                  </section>
                )) : <div className="ontology-no-links">No linked records found for this object.</div>}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
