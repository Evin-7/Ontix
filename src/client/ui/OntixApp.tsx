"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity as ActivityIcon,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Command,
  Database,
  Ellipsis,
  FilePlus2,
  FolderKanban,
  Gauge,
  Layers3,
  Plus,
  Search,
  ShieldAlert,
  UsersRound,
  X,
} from "lucide-react";
import { runWorkspaceCommand, signOutAction } from "@/app/actions";
import type {
  Activity,
  Approval,
  CaseRecord,
  Customer,
  Dashboard,
  Employee,
  Project,
  Viewer,
  WorkspaceCommand,
  WorkspaceData,
} from "@/types/workspace";

type View = "Overview" | "Cases" | "Projects" | "Customers" | "Approvals" | "Activity";
type Toast = { tone: "success" | "error"; message: string } | null;

const views: { name: View; icon: typeof Gauge }[] = [
  { name: "Overview", icon: Gauge },
  { name: "Cases", icon: CircleAlert },
  { name: "Projects", icon: FolderKanban },
  { name: "Customers", icon: Building2 },
  { name: "Approvals", icon: CheckCheck },
  { name: "Activity", icon: ActivityIcon },
];

const formatDate = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
const formatMoney = (value: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
const titleCase = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const isOverdue = (value: string) => new Date(value).getTime() < Date.now();

export function OntixApp({ initialData, viewer }: { initialData: WorkspaceData; viewer: Viewer }) {
  const [view, setView] = useState<View>("Overview");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"customer" | "project" | "case" | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [mutationPending, setMutationPending] = useState(false);
  const router = useRouter();
  const dashboard = { data: initialData.dashboard };
  const health = { data: { ok: true }, isPending: false };
  const cases = { data: initialData.cases };
  const projects = { data: initialData.projects };
  const customers = { data: initialData.customers };
  const approvals = { data: initialData.approvals };
  const activity = { data: initialData.activity };
  const employees = { data: initialData.employees };
  const loading = false;
  const queryError: Error | null = null;
  const mutation = { isPending: mutationPending };
  const canManage = viewer.role === "ADMINISTRATOR" || viewer.role === "MANAGER";
  const canWorkCases = canManage || viewer.role === "DEVELOPER";
  const canDecideApprovals = canManage;
  const reload = () => router.refresh();

  const filteredCases = useMemo(() => (cases.data ?? []).filter((item) => `${item.caseKey} ${item.title} ${item.customer?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())), [cases.data, search]);
  const filteredProjects = useMemo(() => (projects.data ?? []).filter((item) => `${item.projectKey} ${item.name} ${item.customer?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())), [projects.data, search]);
  const filteredCustomers = useMemo(() => (customers.data ?? []).filter((item) => `${item.customerKey} ${item.name} ${item.industry}`.toLowerCase().includes(search.toLowerCase())), [customers.data, search]);

  const beginAction = async (command: WorkspaceCommand) => {
    setMutationPending(true);
    let result;
    try {
      result = await runWorkspaceCommand(command);
    } catch {
      setMutationPending(false);
      setToast({ tone: "error", message: "The request could not be completed. Try again." });
      window.setTimeout(() => setToast(null), 4200);
      return;
    }
    setMutationPending(false);
    if (!result.ok) {
      setToast({ tone: "error", message: result.error });
      window.setTimeout(() => setToast(null), 4200);
      if (result.error.includes("session has expired")) router.refresh();
      return;
    }
    router.refresh();
    setToast({ tone: "success", message: command.type.endsWith("archive") ? "Record archived." : "Changes saved." });
    window.setTimeout(() => setToast(null), 2800);
    setDialog(null);
  };
  const showError = (value: unknown) => value instanceof Error ? value.message : "Could not load records.";
  const initials = viewer.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark"><span /></span><span className="brand-word">ONTIX</span></div>
        <div className="brand-tagline">Connected Data.<br />Smarter Operations.</div>

        <div className="workspace-switcher">
          <div className="workspace-icon"><Layers3 size={16} /></div>
          <div><strong>Operations</strong><span>Local demo</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {views.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${view === name ? "active" : ""}`} onClick={() => { setView(name); setSearch(""); }}><Icon size={17} strokeWidth={1.8} /><span>{name}</span>{name === "Approvals" && (dashboard.data?.metrics.pendingApprovals ?? 0) > 0 && <small>{dashboard.data?.metrics.pendingApprovals}</small>}</button>)}
        </nav>

        <div className="sidebar-bottom">
          <div className="provider-card"><div className="provider-title"><Database size={14} /><span>DATA PROVIDER</span><span className={`connection-dot ${health.data?.ok ? "online" : "offline"}`} /></div><strong>Neon PostgreSQL</strong><small>{health.data?.ok ? "Connected · Local Demo" : health.isPending ? "Checking connection…" : "Connection unavailable"}</small></div>
          <div className="profile-row"><div className="avatar">{initials}</div><div><strong>{viewer.name}</strong><span>{titleCase(viewer.role)}</span></div><form action={signOutAction}><button className="logout-button" aria-label="Sign out" title="Sign out">Sign out</button></form></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{view}</strong></div>
          <div className="topbar-actions"><label className="global-search"><Search size={16} /><input aria-label="Search records" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${view.toLowerCase()}…`} /><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Refresh data" onClick={() => void reload()}><Command size={17} /></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><span /></button><div className="avatar avatar-small">{initials}</div></div>
        </header>

        <div className="page-content">
          {queryError && <div className="connection-banner"><CircleAlert size={18} /><div><strong>Couldn’t load your workspace data</strong><span>{showError(queryError)} Check that the Neon development branch is configured and migrated.</span></div><button onClick={() => void reload()}>Retry</button></div>}
          {loading ? <LoadingState /> : view === "Overview" ? <Overview data={dashboard.data} cases={cases.data ?? []} approvals={approvals.data ?? []} activity={dashboard.data?.recentActivity ?? []} onOpen={setView} onAction={beginAction} onCreate={setDialog} busy={mutation.isPending} canManage={canManage} canWorkCases={canWorkCases} canDecideApprovals={canDecideApprovals} /> : null}
          {!loading && view === "Cases" && <CasesPage cases={filteredCases} employees={employees.data ?? []} onAction={beginAction} onCreate={() => setDialog("case")} busy={mutation.isPending} canWorkCases={canWorkCases} />}
          {!loading && view === "Projects" && <ProjectsPage projects={filteredProjects} onAction={beginAction} onCreate={() => setDialog("project")} busy={mutation.isPending} canManage={canManage} />}
          {!loading && view === "Customers" && <CustomersPage customers={filteredCustomers} onAction={beginAction} onCreate={() => setDialog("customer")} busy={mutation.isPending} canManage={canManage} />}
          {!loading && view === "Approvals" && <ApprovalsPage approvals={approvals.data ?? []} onAction={beginAction} busy={mutation.isPending} canDecide={canDecideApprovals} />}
          {!loading && view === "Activity" && <ActivityPage activity={activity.data ?? []} />}
        </div>
      </main>

      {dialog && <CreateDialog kind={dialog} customers={customers.data ?? []} onClose={() => setDialog(null)} onSubmit={(input) => void beginAction({ type: `${dialog}.create` as "customer.create" | "project.create" | "case.create", input })} busy={mutation.isPending} />}
      {toast && <div className={`toast ${toast.tone}`} role="status">{toast.tone === "success" ? <CircleCheck size={17} /> : <CircleAlert size={17} />}{toast.message}<button aria-label="Dismiss" onClick={() => setToast(null)}><X size={15} /></button></div>}
    </div>
  );
}

function LoadingState() {
  return <div className="loading-state"><span className="spinner" /><p>Connecting to your operations workspace…</p></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function Overview({ data, cases, approvals, activity, onOpen, onAction, onCreate, busy, canManage, canWorkCases, canDecideApprovals }: { data?: Dashboard; cases: CaseRecord[]; approvals: Approval[]; activity: Activity[]; onOpen: (view: View) => void; onAction: (command: WorkspaceCommand) => void; onCreate: (kind: "customer" | "project" | "case") => void; busy: boolean; canManage: boolean; canWorkCases: boolean; canDecideApprovals: boolean }) {
  const metrics = data?.metrics ?? { customers: 0, projects: 0, activeCases: 0, pendingApprovals: 0 };
  const attentionCases = cases.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).slice(0, 5);
  const pending = approvals.filter((item) => item.status === "PENDING").slice(0, 3);
  const cards = [
    { label: "Active cases", value: metrics.activeCases, change: "Needs attention", icon: ShieldAlert, accent: "coral", trend: "−" },
    { label: "Projects", value: metrics.projects, change: "Across all teams", icon: BriefcaseBusiness, accent: "blue", trend: "↗" },
    { label: "Customers", value: metrics.customers, change: "Active accounts", icon: UsersRound, accent: "purple", trend: "↗" },
    { label: "Pending approvals", value: metrics.pendingApprovals, change: "Waiting for review", icon: CheckCheck, accent: "amber", trend: "!" },
  ];
  return <>
    <PageHeading eyebrow="OPERATIONS WORKSPACE" title="Operations overview" description="A clear view of what needs attention across your business." action={<>{canManage && <button className="button button-quiet" onClick={() => onCreate("customer")}><Plus size={16} /> Add customer</button>}{canWorkCases && <button className="button button-primary" onClick={() => onCreate("case")}><FilePlus2 size={16} /> New case</button>}</>} />
    <div className="metrics-grid">{cards.map(({ label, value, change, icon: Icon, accent, trend }) => <article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${accent}`}><Icon size={17} /></span></div><div className="metric-value">{value.toLocaleString()}</div><div className="metric-foot"><span className={`metric-trend ${accent}`}>{trend}</span><span>{change}</span></div></article>)}</div>
    <div className="overview-grid">
      <section className="panel attention-panel"><div className="panel-heading"><div><span className="eyebrow">PRIORITY QUEUE</span><h2>Cases to watch</h2></div><button className="text-link" onClick={() => onOpen("Cases")}>View all <ArrowRight size={15} /></button></div>
        {attentionCases.length ? <div className="case-queue">{attentionCases.map((item) => <div className="queue-row" key={item.id}><span className={`priority-indicator ${item.priority.toLowerCase()}`} /><div className="queue-main"><div className="queue-title-line"><strong>{item.title}</strong><span className={`badge status-${item.status.toLowerCase()}`}>{titleCase(item.status)}</span></div><div className="queue-meta"><span>{item.caseKey}</span><span>{item.customer?.name ?? "Customer"}</span><span className={isOverdue(item.slaDeadline) ? "overdue" : ""}><Clock3 size={12} /> Due {formatDate(item.slaDeadline)}</span></div></div><button className="icon-button compact" disabled={busy || !canWorkCases || item.priority === "HIGH" || ["CLOSED", "RESOLVED"].includes(item.status)} title="Escalate case" onClick={() => onAction({ type: "case.escalate", caseId: item.id })}><ArrowUpRight size={16} /></button></div>)}</div> : <EmptyState icon={CircleCheck} title="All clear" description="No active cases need attention." />}
      </section>
      <section className="panel approvals-panel"><div className="panel-heading"><div><span className="eyebrow">DECISIONS</span><h2>Pending approvals</h2></div><button className="text-link" onClick={() => onOpen("Approvals")}>View all <ArrowRight size={15} /></button></div>
        {pending.length ? <div className="approval-list">{pending.map((item) => <div className="approval-row" key={item.id}><span className="approval-mark"><CheckCheck size={16} /></span><div className="approval-copy"><strong>{item.title}</strong><span>{item.approvalKey} · {item.requestedBy.name}</span></div><strong className="approval-amount">{item.amount ? formatMoney(item.amount) : "Review"}</strong>{canDecideApprovals && <div className="approval-actions"><button className="tiny-action approve" disabled={busy} aria-label={`Approve ${item.title}`} onClick={() => onAction({ type: "approval.decide", approvalId: item.id, decision: "APPROVED", comment: "Approved in the demo workspace." })}><Check size={14} /></button><button className="tiny-action reject" disabled={busy} aria-label={`Reject ${item.title}`} onClick={() => onAction({ type: "approval.decide", approvalId: item.id, decision: "REJECTED", comment: "Rejected in the demo workspace." })}><X size={14} /></button></div>}</div>)}</div> : <EmptyState icon={Check} title="No decisions waiting" description="New requests will appear here." />}
      </section>
    </div>
    <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST UPDATES</span><h2>Recent activity</h2></div><button className="text-link" onClick={() => onOpen("Activity")}>Activity log <ArrowRight size={15} /></button></div><ActivityList items={activity.slice(0, 5)} /></section>
  </>;
}

function CasesPage({ cases, employees, onAction, onCreate, busy, canWorkCases }: { cases: CaseRecord[]; employees: Employee[]; onAction: (command: WorkspaceCommand) => void; onCreate: () => void; busy: boolean; canWorkCases: boolean }) {
  return <><PageHeading eyebrow="SERVICE OPERATIONS" title="Operational cases" description="Triage requests, coordinate owners, and keep service commitments on track." action={canWorkCases ? <button className="button button-primary" onClick={onCreate}><Plus size={16} /> New case</button> : undefined} />
    <div className="list-summary"><span><strong>{cases.length}</strong> records</span><span className="summary-spacer" /><span className="legend-dot high" /> High priority<span className="legend-dot medium" /> Medium priority</div>
    <div className="table-card"><table><thead><tr><th>CASE</th><th>CUSTOMER</th><th>PRIORITY</th><th>STATUS</th><th>OWNER</th><th>SLA</th><th /></tr></thead><tbody>{cases.map((item) => <tr key={item.id}><td><div className="primary-cell"><strong>{item.title}</strong><span>{item.caseKey} · {item.category}</span></div></td><td>{item.customer?.name ?? "—"}</td><td><span className={`priority-pill ${item.priority.toLowerCase()}`}><i />{titleCase(item.priority)}</span>{item.escalationLevel > 0 && <small className="escalation-tag">Escalated {item.escalationLevel}×</small>}</td><td><span className={`badge status-${item.status.toLowerCase()}`}>{titleCase(item.status)}</span></td><td><select className="inline-select" aria-label={`Assign ${item.caseKey}`} value={item.assignedEmployeeId ?? ""} onChange={(event) => beginAssign(onAction, item.id, event.target.value)} disabled={busy || !canWorkCases}><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></td><td><span className={isOverdue(item.slaDeadline) ? "overdue" : "date-cell"}>{formatDate(item.slaDeadline)}</span></td><td><button className="icon-button compact" title="Escalate" disabled={busy || !canWorkCases || item.priority === "HIGH" || ["CLOSED", "RESOLVED"].includes(item.status)} onClick={() => onAction({ type: "case.escalate", caseId: item.id })}><ArrowUpRight size={16} /></button></td></tr>)}</tbody></table>{!cases.length && <EmptyState icon={CircleCheck} title="No cases found" description="Create a case or adjust the search." />}</div>
  </>;
}

function beginAssign(onAction: (command: WorkspaceCommand) => void, caseId: string, employeeId: string) {
  onAction({ type: "case.assign", caseId, employeeId });
}

function ProjectsPage({ projects, onAction, onCreate, busy, canManage }: { projects: Project[]; onAction: (command: WorkspaceCommand) => void; onCreate: () => void; busy: boolean; canManage: boolean }) {
  return <><PageHeading eyebrow="DELIVERY PORTFOLIO" title="Projects" description="Track ownership, delivery health, and work in flight across your portfolio." action={canManage ? <button className="button button-primary" onClick={onCreate}><Plus size={16} /> New project</button> : undefined} />
    <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.id}><div className="project-card-top"><span className={`project-status ${project.status.toLowerCase()}`}><i />{titleCase(project.status)}</span><button className="icon-button compact" aria-label={`Archive ${project.name}`} title="Archive project" disabled={busy || !canManage} onClick={() => window.confirm(`Archive “${project.name}”? Its records will remain available in the audit history.`) && onAction({ type: "project.archive", projectId: project.id })}><Ellipsis size={17} /></button></div><div className="project-key">{project.projectKey}</div><h3>{project.name}</h3><p>{project.customer?.name ?? "Customer not linked"} <span>·</span> {project.team?.name ?? "Unassigned team"}</p><div className="project-progress-head"><span>Delivery progress</span><strong>{project.progress}%</strong></div><div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div><div className="project-footer"><span><Clock3 size={13} /> Due {formatDate(project.dueDate)}</span><span>{project._count?.cases ?? 0} cases</span><button className="text-link" disabled={busy || !canManage} onClick={() => onAction({ type: "project.update", projectId: project.id, input: { revision: project.revision, progress: Math.min(project.progress + 10, 100) } })}>Update <ArrowRight size={14} /></button></div></article>)}</div>{!projects.length && <EmptyState icon={FolderKanban} title="Your portfolio starts here" description="Create a project to bring delivery work into view." />}
  </>;
}

function CustomersPage({ customers, onAction, onCreate, busy, canManage }: { customers: Customer[]; onAction: (command: WorkspaceCommand) => void; onCreate: () => void; busy: boolean; canManage: boolean }) {
  return <><PageHeading eyebrow="CUSTOMER DIRECTORY" title="Customers" description="Keep account context connected to the work your teams deliver." action={canManage ? <button className="button button-primary" onClick={onCreate}><Plus size={16} /> Add customer</button> : undefined} />
    <div className="table-card"><table><thead><tr><th>ACCOUNT</th><th>INDUSTRY</th><th>OWNER</th><th>PROJECTS</th><th>OPEN CASES</th><th>CONTACT</th><th /></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><div className="customer-cell"><span className="customer-monogram">{customer.name.slice(0, 1)}</span><div className="primary-cell"><strong>{customer.name}</strong><span>{customer.customerKey}</span></div></div></td><td>{customer.industry}</td><td>{customer.accountOwner?.name ?? "—"}</td><td>{customer._count?.projects ?? 0}</td><td>{customer._count?.cases ?? 0}</td><td><a className="email-link" href={`mailto:${customer.email}`}>{customer.email}</a></td><td><button className="icon-button compact" aria-label={`Archive ${customer.name}`} title="Archive customer" disabled={busy || !canManage} onClick={() => window.confirm(`Archive “${customer.name}”? Existing project and case history will be kept.`) && onAction({ type: "customer.archive", customerId: customer.id })}><Ellipsis size={17} /></button></td></tr>)}</tbody></table>{!customers.length && <EmptyState icon={Building2} title="No customers found" description="Add a customer or adjust the search." />}</div>
  </>;
}

function ApprovalsPage({ approvals, onAction, busy, canDecide }: { approvals: Approval[]; onAction: (command: WorkspaceCommand) => void; busy: boolean; canDecide: boolean }) {
  return <><PageHeading eyebrow="GOVERNANCE" title="Approvals" description="Review requests with their business context and recorded decision history." />
    <div className="approval-board">{approvals.map((item) => <article className="approval-card" key={item.id}><div className="approval-card-head"><span className="approval-key">{item.approvalKey}</span><span className={`badge status-${item.status.toLowerCase()}`}>{titleCase(item.status)}</span></div><h3>{item.title}</h3><p>{item.justification}</p><div className="approval-context"><span>{titleCase(item.type)}</span>{item.case && <span>{item.case.caseKey} · {item.case.title}</span>}</div><div className="approval-card-footer"><div><small>REQUESTED BY</small><strong>{item.requestedBy.name}</strong></div><div><small>AMOUNT</small><strong>{item.amount ? formatMoney(item.amount) : "—"}</strong></div>{item.status === "PENDING" && canDecide ? <div className="approval-actions"><button className="button button-quiet" disabled={busy} onClick={() => onAction({ type: "approval.decide", approvalId: item.id, decision: "REJECTED", comment: "Rejected in the demo workspace." })}>Reject</button><button className="button button-primary compact-button" disabled={busy} onClick={() => onAction({ type: "approval.decide", approvalId: item.id, decision: "APPROVED", comment: "Approved in the demo workspace." })}><Check size={15} /> Approve</button></div> : item.status === "PENDING" ? <div className="decision-label">Awaiting a manager</div> : <div className="decision-label"><Check size={14} /> {titleCase(item.status)}</div>}</div></article>)}</div>{!approvals.length && <EmptyState icon={CheckCheck} title="No approval requests" description="Requests attached to operational cases will appear here." />}
  </>;
}

function ActivityPage({ activity }: { activity: Activity[] }) {
  return <><PageHeading eyebrow="AUDIT TRAIL" title="Activity" description="A chronological record of changes made in this workspace." /><section className="panel full-activity"><ActivityList items={activity} emptyLabel="No recorded changes yet." /></section></>;
}

function ActivityList({ items, emptyLabel = "No recent events." }: { items: Activity[]; emptyLabel?: string }) {
  return items.length ? <div className="activity-list">{items.map((item) => <div className="activity-row" key={item.id}><span className="activity-avatar">{item.actor?.name.slice(0, 1) ?? "O"}</span><div className="activity-copy"><strong>{item.summary}</strong><span>{item.actor?.name ?? "Ontix"} · {titleCase(item.objectType)} · {titleCase(item.action)}</span></div><time>{formatDate(item.createdAt)}</time></div>)}</div> : <div className="empty-inline">{emptyLabel}</div>;
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Gauge; title: string; description: string }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={20} /></span><strong>{title}</strong><p>{description}</p></div>;
}

function CreateDialog({ kind, customers, onClose, onSubmit, busy }: { kind: "customer" | "project" | "case"; customers: Customer[]; onClose: () => void; onSubmit: (body: unknown) => void; busy: boolean }) {
  const labels = { customer: "Add customer", project: "Create project", case: "Open a case" };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    if (kind === "customer") onSubmit({ name: value("name"), industry: value("industry"), email: value("email"), phone: value("phone") });
    if (kind === "project") onSubmit({ name: value("name"), description: value("description"), customerId: value("customerId"), status: "PLANNING", priority: value("priority"), startDate: value("startDate"), dueDate: value("dueDate"), budget: value("budget"), progress: 0 });
    if (kind === "case") onSubmit({ title: value("title"), description: value("description"), customerId: value("customerId"), priority: value("priority"), category: value("category"), slaDeadline: value("slaDeadline") });
  };
  const date = new Date();
  const dateInput = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-head"><div><span className="eyebrow">WORKSPACE RECORD</span><h2 id="dialog-title">{labels[kind]}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button></div><form onSubmit={submit} className="dialog-form">
    {kind === "customer" && <><Field name="name" label="Company name" placeholder="e.g. Northstar Logistics" required /><div className="form-row"><Field name="industry" label="Industry" placeholder="Transportation" required /><Field name="phone" label="Phone" placeholder="+1 555 010 1000" required /></div><Field name="email" label="Contact email" type="email" placeholder="operations@example.test" required /></>}
    {kind === "project" && <><Field name="name" label="Project name" placeholder="e.g. Fleet visibility rollout" required /><Field name="description" label="Description" placeholder="What outcome will this project deliver?" /><label className="field"><span>Customer</span><select name="customerId" required><option value="">Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><div className="form-row"><Field name="priority" label="Priority" select options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]} /><Field name="budget" label="Budget (USD)" type="number" min="0" step="0.01" defaultValue="0" /></div><div className="form-row"><Field name="startDate" label="Start date" type="date" defaultValue={dateInput} required /><Field name="dueDate" label="Due date" type="date" defaultValue={dateInput} required /></div></>}
    {kind === "case" && <><Field name="title" label="Case title" placeholder="Summarize the customer issue" required /><Field name="description" label="Description" placeholder="Add useful context for the team" /><label className="field"><span>Customer</span><select name="customerId" required><option value="">Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><div className="form-row"><Field name="category" label="Category" placeholder="Data quality" required /><Field name="priority" label="Priority" select options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]} /></div><Field name="slaDeadline" label="SLA deadline" type="datetime-local" required /></>}
    <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Saving…" : labels[kind]}</button></div>
  </form></section></div>;
}

function Field({ name, label, type = "text", placeholder, required = false, defaultValue, min, step, select = false, options = [] }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string; min?: string; step?: string; select?: boolean; options?: string[] }) {
  return <label className="field"><span>{label}</span>{select ? <select name={name} defaultValue={options[1] ?? options[0]}>{options.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select> : <input name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} min={min} step={step} />}</label>;
}
