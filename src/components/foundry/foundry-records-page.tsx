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

const moduleHeaderClassName = "!mb-0 max-[760px]:!items-start [&>div>p]:text-[9px] [&>div>p]:tracking-[.14em] [&>div>p]:text-primary [&>div>h1]:text-[clamp(27px,2.6vw,35px)] [&>div>h1]:font-semibold [&>div>h1]:tracking-[-.045em] max-[760px]:[&>div:last-child]:w-full max-[760px]:[&>div:last-child]:items-center";

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
  const metrics: Array<{ label: string; value: number; detail: string; href: string; Icon: LucideIcon; iconClass: string }> = [
    { label: "Customers", value: workspace.totals.customers, detail: "Visible customer records", href: "/customers", Icon: Building2, iconClass: "text-[#5b55db] bg-[#eeedff] [.dark_&]:text-[#aaa7ff] [.dark_&]:bg-[#29274f]" },
    { label: "Total projects", value: workspace.totals.projects, detail: "Across linked customers", href: "/projects", Icon: BriefcaseBusiness, iconClass: "text-[#3276c7] bg-[#e9f3ff] [.dark_&]:text-[#81b5f2] [.dark_&]:bg-[#1d3450]" },
    { label: "Employees", value: workspace.totals.employees, detail: "Visible people records", href: "/employees", Icon: ContactRound, iconClass: "text-[#8758cf] bg-[#f3ecff] [.dark_&]:text-[#c6a5ff] [.dark_&]:bg-[#38274d]" },
    { label: "Teams", value: workspace.totals.teams, detail: "Organization groups", href: "/teams", Icon: UsersRound, iconClass: "text-[#15867b] bg-[#e3f7f3] [.dark_&]:text-[#60c9b8] [.dark_&]:bg-[#173d3a]" },
    { label: "Open cases", value: openCases.length, detail: "Open, in progress, or awaiting", href: "/cases", Icon: CircleDot, iconClass: "text-[#a7680b] bg-[#fff4dd] [.dark_&]:text-[#ffc66b] [.dark_&]:bg-[#49391d]" },
    { label: "Pending approvals", value: pendingApprovals.length, detail: "Requests with PENDING status", href: "/approvals", Icon: CheckCheck, iconClass: "text-[#bc506e] bg-[#ffedf2] [.dark_&]:text-[#f28ca7] [.dark_&]:bg-[#492734]" },
  ];
  const highPriority = [...workspace.cases].filter((entry) => ["HIGH", "CRITICAL"].includes(entry.priority) && !["RESOLVED", "CLOSED"].includes(entry.status)).sort((a, b) => a.priority === b.priority ? a.title.localeCompare(b.title) : a.priority === "CRITICAL" ? -1 : 1).slice(0, 5);
  const attentionProjects = workspace.projects.filter((project) => project.status === "AT_RISK");
  const customerNames = new Map(workspace.customers.map((customer) => [customer.id, customer.name]));
  const charts = buildOverviewCharts(workspace);
  const checkedAt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(workspace.checkedAt));

  return <div className="grid gap-5 max-[760px]:gap-4">
    <PageHeader className={moduleHeaderClassName} eyebrow="OPERATIONS INTELLIGENCE" title="Overview" actions={isDemo ? <span className="text-[10px] text-muted">Fictional sample records</span> : <><span className="inline-flex items-center gap-2 text-[10px] text-muted max-[760px]:flex-1 max-[760px]:text-[9px]"><i className="size-1.5 rounded-full bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_13%,transparent)]" /> Last successful data refresh · {checkedAt}</span><RefreshDataButton /></>} />
    <section className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-2 max-[760px]:gap-2" aria-label="Workspace metrics">
      {metrics.map(({ label, value, detail, href, Icon, iconClass }) => <Link href={href as Route} className="group relative grid min-h-[139px] grid-cols-[35px_1fr] grid-rows-[28px_38px_21px] content-start gap-x-[11px] rounded-xl border border-border bg-surface p-[18px] shadow-[var(--shadow-sm)] transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-px hover:border-primary/30 hover:shadow-[var(--shadow-md)] max-[760px]:min-h-[126px] max-[760px]:grid-cols-[30px_1fr] max-[760px]:gap-x-2 max-[760px]:p-[13px]" key={label}>
        <span className={`row-span-2 grid size-[31px] place-items-center rounded-lg max-[760px]:size-7 ${iconClass}`}><Icon size={17} strokeWidth={1.9} aria-hidden="true" /></span>
        <span className="self-center text-[11px] font-medium text-muted max-[760px]:text-[9px]">{label}</span><strong className="col-start-2 text-[28px] font-semibold tracking-[-.055em] leading-[1.15] text-foreground max-[760px]:text-[25px]">{value.toLocaleString()}</strong><small className="col-span-full self-end text-[10px] text-muted max-[760px]:text-[8px] max-[760px]:leading-[1.35]">{detail}</small>
      </Link>)}
    </section>
    {Object.values(workspace.hasMore).some(Boolean) && <p className="-my-1 mx-0 text-[10px] text-muted">Charts show up to 500 records per category; totals reflect the full dataset.</p>}
    <OverviewCharts charts={charts} isDemo={isDemo} />
    <div className="grid grid-cols-2 items-stretch gap-3.5 max-[760px]:grid-cols-1 max-[760px]:gap-2.5">
      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-[18px] shadow-[var(--shadow-sm)]">
        <div className="mb-[11px] flex items-center justify-between gap-3"><div><span className="block text-[8px] font-bold tracking-[.11em] text-muted">NEEDS ATTENTION</span><h2 className="mt-1 text-sm font-semibold tracking-[-.02em]">Projects requiring attention</h2></div><Link className="inline-flex items-center gap-[5px] whitespace-nowrap text-[10px] font-medium text-primary hover:underline hover:underline-offset-[3px]" href="/projects?status=AT_RISK">All at-risk projects <ArrowRight size={14} /></Link></div>
        {attentionProjects.length ? <div className="mx-[-19px] mt-3 mb-[-5px] overflow-x-auto max-[760px]:mx-[-16px]"><table className="w-full border-collapse text-left [&_tbody_tr:last-child_td]:border-b-0"><thead><tr><th className="border-b border-border bg-surface-muted px-[19px] py-2.5 text-[9px] font-semibold tracking-[.06em] text-muted uppercase max-[760px]:px-3">Project</th><th className="border-b border-border bg-surface-muted px-[19px] py-2.5 text-[9px] font-semibold tracking-[.06em] text-muted uppercase max-[760px]:px-3">Customer</th><th className="border-b border-border bg-surface-muted px-[19px] py-2.5 text-[9px] font-semibold tracking-[.06em] text-muted uppercase max-[760px]:px-3">Status</th></tr></thead><tbody>{attentionProjects.map((project) => <tr key={project.id}>
          <td className="border-b border-border px-[19px] py-[11px] text-[10px] whitespace-nowrap text-muted max-[760px]:px-3"><Link className="grid gap-[3px] text-foreground hover:[&>strong]:text-primary" href={`/projects?record=${encodeURIComponent(project.id)}` as Route}><strong className="text-[11px] font-semibold">{project.name}</strong><small className="text-[9px] text-muted">{project.id}</small></Link></td>
          <td className="border-b border-border px-[19px] py-[11px] text-[10px] whitespace-nowrap text-muted max-[760px]:px-3">{project.customerId ? customerNames.get(project.customerId) ?? "—" : "—"}</td><td className="border-b border-border px-[19px] py-[11px] text-[10px] whitespace-nowrap text-muted max-[760px]:px-3"><StatusBadge className="!px-[7px] !py-1 !text-[9px] capitalize" status={project.status} /></td>
        </tr>)}</tbody></table></div> : <p className="mt-5 mb-2 text-[11px] text-muted">No projects are currently marked at risk.</p>}
      </section>
      <section className="min-w-0 rounded-xl border border-border bg-surface p-[18px] shadow-[var(--shadow-sm)]">
        <div className="mb-[11px] flex items-center justify-between gap-3"><div><span className="block text-[8px] font-bold tracking-[.11em] text-muted">OPERATIONS QUEUE</span><h2 className="mt-1 text-sm font-semibold tracking-[-.02em]">High-priority cases</h2></div><Link className="inline-flex items-center gap-[5px] whitespace-nowrap text-[10px] font-medium text-primary hover:underline hover:underline-offset-[3px]" href="/cases">All cases <ArrowRight size={14} /></Link></div>
        {highPriority.length ? <div className="grid">{highPriority.map((entry) => <Link className="flex min-w-0 items-center gap-2.5 border-t border-border px-0.5 py-[11px] first:border-t-0" key={entry.id} href={`/cases?record=${encodeURIComponent(entry.id)}` as Route}>
          <span className={`size-[7px] shrink-0 rounded-full ${entry.priority === "CRITICAL" ? "bg-error shadow-[0_0_0_3px_color-mix(in_srgb,var(--error)_12%,transparent)]" : entry.priority === "HIGH" ? "bg-[#d98a26]" : "bg-warning"}`} /><span className="grid min-w-0 flex-1 gap-1"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium">{entry.title}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-muted">{entry.id} · {entry.status.replaceAll("_", " ")}</small></span><StatusBadge className="!text-[9px]" status={entry.priority} />
        </Link>)}</div> : <p className="mt-5 mb-2 text-[11px] text-muted">No high-priority cases in the visible records.</p>}
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
  return <div className="grid gap-5 max-[760px]:gap-4">
    <PageHeader className={moduleHeaderClassName} eyebrow="WORKSPACE DATA" title={config.title} actions={<><span className="self-center text-[10px] text-muted max-[760px]:text-[9px]">{context.workspace.totals[module].toLocaleString()} records</span><RefreshDataButton /></>} />
    <div className="-mt-[11px] flex items-center gap-[9px] text-[10px] text-muted"><span className="size-1.5 rounded-full bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_13%,transparent)]" /> {context.mode === "demo" ? "Sample data · read only" : `Live data · ${context.session.role.replaceAll("_", " ").toLowerCase()} access`}</div>
    <RecordExplorer key={`${selectedId ?? ""}:${JSON.stringify(initialFilters ?? {})}`} records={rows} columns={config.columns} filters={filters} initialFilters={initialFilters} selectedId={selectedId} isDemo={context.mode === "demo"} emptyTitle={`No ${config.title.toLowerCase()} found`} emptyDescription={`No ${config.title.toLowerCase()} are currently visible to your account.`} />
  </div>;
}
