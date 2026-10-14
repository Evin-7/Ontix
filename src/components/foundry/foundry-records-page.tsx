import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Building2, CheckCheck, CircleDot, ContactRound, UsersRound, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { RecordExplorer, type ExplorerColumn, type ExplorerFilter, type ExplorerRecord } from "@/components/foundry/record-explorer";
import { OverviewCharts } from "@/components/foundry/overview-charts";
import { buildOverviewCharts } from "@/components/foundry/overview-metrics";
import { RefreshDataButton } from "@/components/foundry/refresh-data-button";
import { getOntixModuleContext } from "@/server/providers/ontix/dashboard-context";
import type { FoundryWorkspaceModule } from "@/server/providers/foundry/workspace";

const copy: Record<Exclude<FoundryWorkspaceModule, "overview">, { title: string; kind: ExplorerRecord["kind"]; columns: ExplorerColumn[]; filters: Array<{ key: string; label: string }> }> = {
  projects: { title: "Projects", kind: "Project", columns: [{ key: "customer", label: "Customer" }, { key: "status", label: "Status" }, { key: "budget", label: "Budget · source value" }, { key: "startDate", label: "Start date" }], filters: [{ key: "status", label: "status" }, { key: "customer", label: "customer" }] },
  cases: { title: "Cases", kind: "Case", columns: [{ key: "project", label: "Project" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }, { key: "assignee", label: "Assigned to" }], filters: [{ key: "status", label: "status" }, { key: "priority", label: "priority" }, { key: "assignee", label: "assignee" }, { key: "project", label: "project" }] },
  customers: { title: "Customers", kind: "Customer", columns: [{ key: "industry", label: "Industry" }, { key: "status", label: "Status" }, { key: "projects", label: "Projects" }], filters: [{ key: "status", label: "status" }, { key: "industry", label: "industry" }] },
  employees: { title: "Employees", kind: "Employee", columns: [{ key: "role", label: "Role" }, { key: "team", label: "Team" }, { key: "email", label: "Email" }], filters: [{ key: "role", label: "role" }, { key: "team", label: "team" }] },
  teams: { title: "Teams", kind: "Team", columns: [{ key: "department", label: "Department" }, { key: "members", label: "Members" }], filters: [{ key: "department", label: "department" }] },
  approvals: { title: "Approvals", kind: "Approval", columns: [{ key: "case", label: "Related case" }, { key: "requestedBy", label: "Requested by" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Created" }], filters: [{ key: "status", label: "status" }] },
};

function displayDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function uniqueOptions(records: ExplorerRecord[], key: string) {
  return [...new Set(records.map((record) => record.values[key]).filter((value) => Boolean(value) && value !== "—"))].sort((a, b) => a.localeCompare(b));
}

function recordsFor(module: Exclude<FoundryWorkspaceModule, "overview">, workspace: NonNullable<Awaited<ReturnType<typeof getOntixModuleContext>>>["workspace"], role: string) {
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

function Overview({ workspace, isDemo }: { workspace: NonNullable<Awaited<ReturnType<typeof getOntixModuleContext>>>["workspace"]; isDemo: boolean }) {
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
  const attentionProjects = workspace.projects.filter((project) => project.status === "AT_RISK");
  const customerNames = new Map(workspace.customers.map((customer) => [customer.id, customer.name]));
  const charts = buildOverviewCharts(workspace);
  const checkedAt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(workspace.checkedAt));

  return <div className="foundry-module-page">
    <PageHeader eyebrow="OPERATIONS INTELLIGENCE" title="Overview" actions={isDemo ? <span className="foundry-demo-data-label">Sample data · fictional records</span> : <><span className="foundry-last-sync"><i /> Last successful data refresh · {checkedAt}</span><RefreshDataButton /></>} />
    <section className="foundry-metric-grid" aria-label="Workspace metrics">
      {metrics.map(({ label, value, detail, href, Icon, tone }) => <Link href={href as Route} className="foundry-metric-tile" key={label}>
        <span className={`foundry-metric-icon tone-${tone}`}><Icon size={17} strokeWidth={1.9} aria-hidden="true" /></span>
        <span className="foundry-metric-label">{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small>
      </Link>)}
    </section>
    {Object.values(workspace.hasMore).some(Boolean) && <p className="foundry-data-limit-note">Charts show up to 500 records per category; totals reflect the full dataset.</p>}
    <OverviewCharts charts={charts} isDemo={isDemo} />
    <div className="foundry-overview-bottom">
      <section className="foundry-list-card foundry-attention-projects">
        <div className="foundry-list-card-heading"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Projects requiring attention</h2></div><Link href="/projects?status=AT_RISK">All at-risk projects <ArrowRight size={14} /></Link></div>
        {attentionProjects.length ? <div className="foundry-attention-table-wrap"><table className="foundry-attention-table"><thead><tr><th>Project</th><th>Customer</th><th>Status</th></tr></thead><tbody>{attentionProjects.map((project) => <tr key={project.id}>
          <td><Link href={`/projects?record=${encodeURIComponent(project.id)}` as Route}><strong>{project.name}</strong><small>{project.id}</small></Link></td>
          <td>{project.customerId ? customerNames.get(project.customerId) ?? "—" : "—"}</td><td><StatusBadge status={project.status} /></td>
        </tr>)}</tbody></table></div> : <p className="foundry-muted foundry-list-empty">No projects are currently marked at risk.</p>}
      </section>
      <section className="foundry-list-card">
        <div className="foundry-list-card-heading"><div><span className="eyebrow">OPERATIONS QUEUE</span><h2>High-priority cases</h2></div><Link href="/cases">All cases <ArrowRight size={14} /></Link></div>
        {highPriority.length ? <div className="foundry-attention-list">{highPriority.map((entry) => <Link key={entry.id} href={`/cases?record=${encodeURIComponent(entry.id)}` as Route}>
          <span className={`foundry-priority-marker priority-${entry.priority.toLowerCase()}`} /><span><strong>{entry.title}</strong><small>{entry.id} · {entry.status.replaceAll("_", " ")}</small></span><StatusBadge status={entry.priority} />
        </Link>)}</div> : <p className="foundry-muted foundry-list-empty">No high-priority cases in the visible records.</p>}
      </section>
    </div>
  </div>;
}

export async function FoundryRecordsPage({ module, selectedId, initialFilters }: { module: FoundryWorkspaceModule; selectedId?: string; initialFilters?: Record<string, string | undefined> }) {
  const context = await getOntixModuleContext(module);
  if (!context) redirect("/");
  if (module === "overview") return <Overview workspace={context.workspace} isDemo={context.mode === "demo"} />;

  const config = copy[module];
  const { rows } = recordsFor(module, context.workspace, context.session.role);
  const filters: ExplorerFilter[] = config.filters.map((filter) => ({ ...filter, options: uniqueOptions(rows, filter.key) }));
  return <div className="foundry-module-page">
    <PageHeader eyebrow="WORKSPACE DATA" title={config.title} actions={<><span className="foundry-page-record-total">{context.workspace.totals[module].toLocaleString()} records</span><RefreshDataButton /></>} />
    <div className="foundry-module-context"><span className="connection-dot online" /> {context.mode === "demo" ? "Sample data · read only" : `Live data · ${context.session.role.replaceAll("_", " ").toLowerCase()} access`}</div>
    <RecordExplorer key={`${selectedId ?? ""}:${JSON.stringify(initialFilters ?? {})}`} records={rows} columns={config.columns} filters={filters} initialFilters={initialFilters} selectedId={selectedId} isDemo={context.mode === "demo"} emptyTitle={`No ${config.title.toLowerCase()} found`} emptyDescription={`No ${config.title.toLowerCase()} are currently visible to your account.`} />
  </div>;
}
