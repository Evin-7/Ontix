import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Building2, CheckCheck, CircleDot, ContactRound, UsersRound, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { RecordExplorer, type ExplorerColumn, type ExplorerFilter, type ExplorerRecord } from "@/components/foundry/record-explorer";
import { RefreshDataButton } from "@/components/foundry/refresh-data-button";
import { getFoundryModuleContext } from "@/server/providers/foundry/dashboard-context";
import type { FoundryWorkspaceModule } from "@/server/providers/foundry/workspace";

const copy: Record<Exclude<FoundryWorkspaceModule, "overview">, { title: string; description: string; kind: ExplorerRecord["kind"]; columns: ExplorerColumn[]; filters: Array<{ key: string; label: string }> }> = {
  projects: { title: "Projects", description: "Explore project delivery and update workflow status through Foundry.", kind: "Project", columns: [{ key: "customer", label: "Customer" }, { key: "status", label: "Status" }, { key: "budget", label: "Budget · source value" }, { key: "startDate", label: "Start date" }], filters: [{ key: "status", label: "status" }, { key: "customer", label: "customer" }] },
  cases: { title: "Cases", description: "Review operational work, ownership, and priority across your workspace.", kind: "Case", columns: [{ key: "project", label: "Project" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }, { key: "assignee", label: "Assigned to" }], filters: [{ key: "status", label: "status" }, { key: "priority", label: "priority" }, { key: "assignee", label: "assignee" }, { key: "project", label: "project" }] },
  customers: { title: "Customers", description: "A live directory of customer records and their linked projects.", kind: "Customer", columns: [{ key: "industry", label: "Industry" }, { key: "status", label: "Status" }, { key: "projects", label: "Projects" }], filters: [{ key: "status", label: "status" }, { key: "industry", label: "industry" }] },
  employees: { title: "Employees", description: "Find people and understand their role and team assignments.", kind: "Employee", columns: [{ key: "role", label: "Role" }, { key: "team", label: "Team" }, { key: "email", label: "Email" }], filters: [{ key: "role", label: "role" }, { key: "team", label: "team" }] },
  teams: { title: "Teams", description: "Team structure and membership derived from linked Foundry employee records.", kind: "Team", columns: [{ key: "department", label: "Department" }, { key: "members", label: "Members" }], filters: [{ key: "department", label: "department" }] },
  approvals: { title: "Approvals", description: "Track approval requests and their related operational cases.", kind: "Approval", columns: [{ key: "case", label: "Related case" }, { key: "requestedBy", label: "Requested by" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Created" }], filters: [{ key: "status", label: "status" }] },
};

function displayDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function uniqueOptions(records: ExplorerRecord[], key: string) {
  return [...new Set(records.map((record) => record.values[key]).filter((value) => Boolean(value) && value !== "—"))].sort((a, b) => a.localeCompare(b));
}

function recordsFor(module: Exclude<FoundryWorkspaceModule, "overview">, workspace: NonNullable<Awaited<ReturnType<typeof getFoundryModuleContext>>>["workspace"], role: string) {
  const customerNames = new Map(workspace.customers.map((customer) => [customer.id, customer.name]));
  const projectNames = new Map(workspace.projects.map((project) => [project.id, project.name]));
  const employeeNames = new Map(workspace.employees.map((employee) => [employee.id, employee.name]));
  const teamNames = new Map(workspace.teams.map((team) => [team.id, team.name]));
  const caseNames = new Map(workspace.cases.map((entry) => [entry.id, entry.title]));
  const projectsByCustomer = new Map<string, string[]>();
  for (const project of workspace.projects) if (project.customerId) projectsByCustomer.set(project.customerId, [...(projectsByCustomer.get(project.customerId) ?? []), project.name]);
  const employeesByTeam = new Map<string, string[]>();
  for (const employee of workspace.employees) if (employee.teamId) employeesByTeam.set(employee.teamId, [...(employeesByTeam.get(employee.teamId) ?? []), employee.name]);

  const rows: ExplorerRecord[] = module === "projects" ? workspace.projects.map((project) => {
    const customer = project.customerId ? customerNames.get(project.customerId) : undefined;
    const budget = project.budget === null ? "—" : Number(project.budget).toLocaleString(undefined, { maximumFractionDigits: 2 });
    return { id: project.id, kind: "Project", title: project.name, subtitle: `Project${customer ? ` · ${customer}` : ""}`, status: project.status, values: { customer: customer ?? "—", status: project.status, budget, startDate: displayDate(project.startDate) }, ...( ["ADMINISTRATOR", "MANAGER"].includes(role) ? { action: { type: "project" as const, initialStatus: project.status } } : {}) };
  }) : module === "cases" ? workspace.cases.map((entry) => {
    const project = entry.projectId ? projectNames.get(entry.projectId) : undefined;
    const assignee = entry.assignedEmployeeId ? employeeNames.get(entry.assignedEmployeeId) : undefined;
    const canWrite = ["ADMINISTRATOR", "MANAGER", "DEVELOPER"].includes(role);
    const caseCanAssign = ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"].includes(entry.status) && workspace.employees.length > 0;
    const canResolve = ["OPEN", "IN_PROGRESS"].includes(entry.status);
    return { id: entry.id, kind: "Case", title: entry.title, subtitle: `Operational case${project ? ` · ${project}` : ""}`, status: entry.status, values: { project: project ?? "—", priority: entry.priority, status: entry.status, assignee: assignee ?? "Unassigned" }, ...(canWrite && (caseCanAssign || canResolve) ? { action: { type: "case" as const, caseTitle: entry.title, assignedEmployeeId: entry.assignedEmployeeId, employees: workspace.employees.map(({ id, name }) => ({ id, name })), canResolve } } : {}) };
  }) : module === "customers" ? workspace.customers.map((customer) => {
    const projects = projectsByCustomer.get(customer.id) ?? [];
    return { id: customer.id, kind: "Customer", title: customer.name, subtitle: customer.industry, status: customer.status, values: { industry: customer.industry, status: customer.status, projects: projects.length ? `${projects.length} · ${projects.slice(0, 3).join(", ")}` : "0" } };
  }) : module === "employees" ? workspace.employees.map((employee) => {
    const team = employee.teamId ? teamNames.get(employee.teamId) : undefined;
    return { id: employee.id, kind: "Employee", title: employee.name, subtitle: employee.role, status: employee.role, values: { role: employee.role, team: team ?? "—", email: employee.email ?? "—" } };
  }) : module === "teams" ? workspace.teams.map((team) => {
    const members = employeesByTeam.get(team.id) ?? [];
    return { id: team.id, kind: "Team", title: team.name, subtitle: team.department, status: team.department, values: { department: team.department, members: members.length ? `${members.length} · ${members.join(", ")}` : "0" } };
  }) : workspace.approvals.map((approval) => {
    const caseTitle = approval.caseId ? caseNames.get(approval.caseId) : undefined;
    return { id: approval.id, kind: "Approval", title: approval.id, subtitle: "Approval request · read only", status: approval.status, values: { case: caseTitle ? `${approval.caseId} · ${caseTitle}` : approval.caseId ?? "—", requestedBy: approval.requestedBy ?? "—", status: approval.status, createdAt: displayDate(approval.createdAt) } };
  });

  return { rows, customerNames, projectNames, employeeNames, teamNames };
}

function ChartDistribution({ title, values, tone = "primary" }: { title: string; values: Array<{ label: string; count: number }>; tone?: "primary" | "warning" }) {
  const total = values.reduce((sum, item) => sum + item.count, 0);
  return <section className="foundry-chart-card">
    <div className="foundry-chart-heading"><div><span className="eyebrow">RECORD BREAKDOWN</span><h2>{title}</h2></div><span>{total.toLocaleString()} visible</span></div>
    <div className="foundry-chart-bar" aria-label={`${title} distribution`} role="img">{values.map((item) => <span key={item.label} title={`${item.label}: ${item.count}`} className={`tone-${tone}`} style={{ width: `${total ? Math.max(item.count / total * 100, item.count > 0 ? 1.5 : 0) : 0}%` }} />)}</div>
    <div className="foundry-chart-legend">{values.map((item) => <div key={item.label}><span><i className={`tone-${tone}`} />{item.label.replaceAll("_", " ")}</span><strong>{item.count}</strong></div>)}</div>
    {values.length === 0 && <p className="foundry-muted">No records in the visible sample.</p>}
  </section>;
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) { const value = key(row) || "UNKNOWN"; counts.set(value, (counts.get(value) ?? 0) + 1); }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function Overview({ workspace }: { workspace: NonNullable<Awaited<ReturnType<typeof getFoundryModuleContext>>>["workspace"] }) {
  const openCases = workspace.cases.filter((entry) => ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL", "ESCALATED"].includes(entry.status));
  const pendingApprovals = workspace.approvals.filter((entry) => entry.status === "PENDING");
  const metrics: Array<{ label: string; value: number; detail: string; href: string; Icon: LucideIcon; tone: string }> = [
    { label: "Customers", value: workspace.totals.customers, detail: "Visible customer records", href: "/customers", Icon: Building2, tone: "indigo" },
    { label: "Total projects", value: workspace.totals.projects, detail: "Across linked customers", href: "/projects", Icon: BriefcaseBusiness, tone: "blue" },
    { label: "Employees", value: workspace.totals.employees, detail: "Visible people records", href: "/employees", Icon: ContactRound, tone: "violet" },
    { label: "Teams", value: workspace.totals.teams, detail: "Organization groups", href: "/teams", Icon: UsersRound, tone: "teal" },
    { label: "Open cases", value: openCases.length, detail: "Open, in progress, or awaiting", href: "/cases", Icon: CircleDot, tone: "amber" },
    { label: "Pending approvals", value: pendingApprovals.length, detail: "Requests with PENDING status", href: "/approvals", Icon: CheckCheck, tone: "rose" },
  ];
  const highPriority = [...workspace.cases].filter((entry) => ["HIGH", "CRITICAL"].includes(entry.priority) && !["RESOLVED", "CLOSED"].includes(entry.status)).sort((a, b) => a.priority === b.priority ? a.title.localeCompare(b.title) : a.priority === "CRITICAL" ? -1 : 1).slice(0, 5);
  const approvals = [...workspace.approvals].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 5);
  const projectStatuses = countBy(workspace.projects, (entry) => entry.status);
  const priorities = countBy(workspace.cases, (entry) => entry.priority);
  const checkedAt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(workspace.checkedAt));

  return <div className="foundry-module-page">
    <PageHeader eyebrow="OPERATIONS INTELLIGENCE" title="Overview" description="A live view of delivery, customer, and operational work across your Foundry workspace." actions={<><span className="foundry-last-sync"><i /> Read from Foundry · {checkedAt}</span><RefreshDataButton /></>} />
    <section className="foundry-metric-grid" aria-label="Workspace metrics">
      {metrics.map(({ label, value, detail, href, Icon, tone }) => <Link href={href as Route} className="foundry-metric-tile" key={label}>
        <span className={`foundry-metric-icon tone-${tone}`}><Icon size={17} strokeWidth={1.9} aria-hidden="true" /></span>
        <span className="foundry-metric-label">{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small>
      </Link>)}
    </section>
    {Object.values(workspace.hasMore).some(Boolean) && <p className="foundry-data-limit-note">Breakdowns use the first 500 records per Ontology type; totals are reported by Foundry.</p>}
    <div className="foundry-overview-grid">
      <ChartDistribution title="Project workflow" values={projectStatuses} />
      <ChartDistribution title="Case priority" values={priorities} tone="warning" />
    </div>
    <div className="foundry-overview-lists">
      <section className="foundry-list-card">
        <div className="foundry-list-card-heading"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Priority cases</h2></div><Link href="/cases">All cases <ArrowRight size={14} /></Link></div>
        {highPriority.length ? <div className="foundry-attention-list">{highPriority.map((entry) => <Link key={entry.id} href={`/cases?record=${encodeURIComponent(entry.id)}` as Route}>
          <span className={`foundry-priority-marker priority-${entry.priority.toLowerCase()}`} /><span><strong>{entry.title}</strong><small>{entry.id} · {entry.status.replaceAll("_", " ")}</small></span><StatusBadge status={entry.priority} />
        </Link>)}</div> : <p className="foundry-muted foundry-list-empty">No high-priority cases in the visible records.</p>}
      </section>
      <section className="foundry-list-card">
        <div className="foundry-list-card-heading"><div><span className="eyebrow">LATEST REQUESTS</span><h2>Approvals</h2></div><Link href="/approvals">All approvals <ArrowRight size={14} /></Link></div>
        {approvals.length ? <div className="foundry-approval-list">{approvals.map((entry) => <Link key={entry.id} href={`/approvals?record=${encodeURIComponent(entry.id)}` as Route}>
          <span className="foundry-approval-mark"><CheckCheck size={15} aria-hidden="true" /></span><span><strong>{entry.id}</strong><small>{entry.caseId ? `Case ${entry.caseId}` : "No linked case"}{entry.requestedBy ? ` · ${entry.requestedBy}` : ""}</small></span><span className="foundry-approval-trailing"><StatusBadge status={entry.status} /><small>{entry.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(entry.createdAt)) : "Date unavailable"}</small></span>
        </Link>)}</div> : <p className="foundry-muted foundry-list-empty">No approval requests are visible to this account.</p>}
      </section>
    </div>
    <p className="foundry-read-source"><span className="connection-dot online" /> Metrics reflect records visible to this Foundry account. Foundry permissions remain authoritative.</p>
  </div>;
}

export async function FoundryRecordsPage({ module, selectedId }: { module: FoundryWorkspaceModule; selectedId?: string }) {
  const context = await getFoundryModuleContext(module);
  if (!context) redirect("/");
  if (module === "overview") return <Overview workspace={context.workspace} />;

  const config = copy[module];
  const { rows } = recordsFor(module, context.workspace, context.session.role);
  const filters: ExplorerFilter[] = config.filters.map((filter) => ({ ...filter, options: uniqueOptions(rows, filter.key) }));
  return <div className="foundry-module-page">
    <PageHeader eyebrow="LIVE FOUNDRY ONTOLOGY" title={config.title} description={config.description} actions={<><span className="foundry-page-record-total">{context.workspace.totals[module].toLocaleString()} records</span><RefreshDataButton /></>} />
    <div className="foundry-module-context"><span className="connection-dot online" /> Live Foundry data <span>·</span> {context.session.role.replaceAll("_", " ").toLowerCase()} access</div>
    <RecordExplorer records={rows} columns={config.columns} filters={filters} selectedId={selectedId} emptyTitle={`No ${config.title.toLowerCase()} found`} emptyDescription={`No ${config.title.toLowerCase()} are currently visible to this Foundry account.`} />
  </div>;
}
