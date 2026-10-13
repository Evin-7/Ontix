"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity as ActivityIcon,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Clock3,
  Database,
  FilePlus2,
  FolderKanban,
  Gauge,
  Layers3,
  LogOut,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UsersRound,
  X,
} from "lucide-react";
import { runWorkspaceCommand, signOutAction } from "@/app/actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OntixLogo } from "@/components/branding/ontix-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { notify } from "@/lib/notifications";
import { OntologyModelExplorer } from "@/client/ui/OntologyModelExplorer";
import {
  approvalInputSchema,
  caseInputSchema,
  customerInputSchema,
  customerPatchSchema,
  projectInputSchema,
  projectPatchSchema,
} from "@/lib/validation";
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

type View = "Overview" | "Data model" | "Cases" | "Projects" | "Customers" | "Approvals" | "Activity";
type RecordDialogState = { kind: "customer"; record?: Customer } | { kind: "project"; record?: Project } | { kind: "case" };
type ApprovalReviewState = { approval: Approval; decision: "APPROVED" | "REJECTED" };
type DestructiveAction = { title: string; description: string; actionLabel: string; command: WorkspaceCommand };

type IconType = typeof Gauge;
const views: { name: View; icon: IconType }[] = [
  { name: "Overview", icon: Gauge },
  { name: "Data model", icon: Network },
  { name: "Cases", icon: CircleAlert },
  { name: "Projects", icon: FolderKanban },
  { name: "Customers", icon: Building2 },
  { name: "Approvals", icon: CheckCheck },
  { name: "Activity", icon: ActivityIcon },
];

const formatDate = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
const formatMoney = (value: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
const titleCase = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const isOverdue = (value: string) => new Date(value).getTime() < Date.now();
const includesSearch = (value: string, search: string) => value.toLowerCase().includes(search.trim().toLowerCase());
const toLocalDateInput = (value?: string | Date) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const toLocalDateTimeInput = (value?: string) => {
  const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${toLocalDateInput(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export function OntixApp({ initialData, viewer }: { initialData: WorkspaceData; viewer: Viewer }) {
  const [view, setView] = useState<View>("Overview");
  const [search, setSearch] = useState("");
  const [recordDialog, setRecordDialog] = useState<RecordDialogState | null>(null);
  const [approvalReview, setApprovalReview] = useState<ApprovalReviewState | null>(null);
  const [approvalRequestCase, setApprovalRequestCase] = useState<CaseRecord | null>(null);
  const [destructiveAction, setDestructiveAction] = useState<DestructiveAction | null>(null);
  const [mutationPending, setMutationPending] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const canManage = viewer.role === "ADMINISTRATOR" || viewer.role === "MANAGER";
  const canWorkCases = canManage || viewer.role === "DEVELOPER";
  const canDecideApprovals = canManage;
  const reload = () => router.refresh();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filteredCases = useMemo(() => initialData.cases.filter((item) => includesSearch(`${item.caseKey} ${item.title} ${item.customer?.name ?? ""} ${item.category} ${item.status} ${item.priority} ${item.assignedEmployee?.name ?? ""}`, search)), [initialData.cases, search]);
  const filteredProjects = useMemo(() => initialData.projects.filter((item) => includesSearch(`${item.projectKey} ${item.name} ${item.customer?.name ?? ""} ${item.status} ${item.team?.name ?? ""}`, search)), [initialData.projects, search]);
  const filteredCustomers = useMemo(() => initialData.customers.filter((item) => includesSearch(`${item.customerKey} ${item.name} ${item.industry} ${item.email}`, search)), [initialData.customers, search]);
  const filteredApprovals = useMemo(() => initialData.approvals.filter((item) => includesSearch(`${item.approvalKey} ${item.title} ${item.justification} ${item.requestedBy.name} ${item.status}`, search)), [initialData.approvals, search]);
  const filteredActivity = useMemo(() => initialData.activity.filter((item) => includesSearch(`${item.summary} ${item.actor?.name ?? ""} ${item.action} ${item.objectType}`, search)), [initialData.activity, search]);

  const performAction = async (command: WorkspaceCommand): Promise<boolean> => {
    const pendingId = "ontix:workspace-action";
    notify.loading({ id: pendingId, title: "Saving changes", description: "Please wait while the workspace is updated." });
    setMutationPending(true);
    try {
      const result = await runWorkspaceCommand(command);
      notify.dismiss(pendingId);
      if (!result.ok) {
        notify.error({ title: "Unable to save changes", description: result.error });
        if (result.error.toLowerCase().includes("session has expired")) router.refresh();
        return false;
      }
      router.refresh();
      notify.success({ title: successTitle(command), description: successDescription(command) });
      return true;
    } catch {
      notify.dismiss(pendingId);
      notify.error({ title: "Request failed", description: "Check your connection and try again. Your changes were not saved." });
      return false;
    } finally {
      setMutationPending(false);
    }
  };

  const beginArchive = (kind: "customer" | "project", record: Customer | Project) => {
    const isProject = kind === "project";
    setDestructiveAction({
      title: `Archive ${isProject ? "project" : "customer"}?`,
      description: isProject
        ? `“${record.name}” will be archived. Its history remains available in the audit trail.`
        : `“${record.name}” will be archived. Existing project and case history will be kept.`,
      actionLabel: `Archive ${isProject ? "project" : "customer"}`,
      command: isProject
        ? { type: "project.archive", projectId: record.id }
        : { type: "customer.archive", customerId: record.id },
    });
  };

  const initials = viewer.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const openRecordDialog = (state: RecordDialogState) => setRecordDialog(state);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><OntixLogo size="small" /></div>
        <div className="brand-tagline">Connected Data.<br />Smarter Operations.</div>
        <div className="workspace-switcher" aria-label="Current workspace">
          <div className="workspace-icon"><Layers3 size={17} aria-hidden="true" /></div>
          <div><strong>Operations</strong><span>Local Demo Mode</span></div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {views.map(({ name, icon: Icon }) => (
            <button key={name} type="button" className={`nav-item ${view === name ? "active" : ""}`} aria-current={view === name ? "page" : undefined} onClick={() => { setView(name); setSearch(""); }}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{name}</span>
              {name === "Approvals" && initialData.dashboard.metrics.pendingApprovals > 0 && <small aria-label={`${initialData.dashboard.metrics.pendingApprovals} pending`}>{initialData.dashboard.metrics.pendingApprovals}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="provider-card"><div className="provider-title"><Database size={15} aria-hidden="true" /><span>ACTIVE DATA SOURCE</span></div><strong>Neon PostgreSQL</strong><small>Ontology-style view is simulated · Foundry is not connected</small></div>
          <div className="profile-row"><div className="avatar" aria-hidden="true">{initials}</div><div><strong>{viewer.name}</strong><span>{titleCase(viewer.role)}</span></div><form action={signOutAction}><button className="logout-button" aria-label="Sign out" title="Sign out">Sign out</button></form></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-leading">
            <OntixLogo variant="icon" size="small" decorative className="topbar-brand-icon" />
            <div className="breadcrumbs" aria-label="Breadcrumb"><span>Workspace</span><span className="crumb-slash" aria-hidden="true">/</span><strong>{view}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={17} aria-hidden="true" /><input ref={searchRef} aria-label={`Search ${view.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${view.toLowerCase()}…`} /><kbd aria-hidden="true">⌘ K</kbd></label>
            <Button variant="ghost" size="icon" className="icon-button" aria-label="Refresh data" title="Refresh data" onClick={reload}><RefreshCw size={17} aria-hidden="true" /></Button>
            <ThemeToggle />
            <form action={signOutAction} className="mobile-signout"><Button type="submit" variant="ghost" size="icon" className="icon-button" aria-label="Sign out" title="Sign out"><LogOut size={17} aria-hidden="true" /></Button></form>
            <div className="avatar avatar-small" aria-label={`Signed in as ${viewer.name}`}>{initials}</div>
          </div>
        </header>

        <div className="page-content">
          {view === "Overview" && <Overview data={initialData.dashboard} cases={filteredCases} approvals={filteredApprovals} activity={filteredActivity} search={search} onClearSearch={() => setSearch("")} onOpen={(nextView) => { setView(nextView); setSearch(""); }} onAction={(command) => void performAction(command)} onCreate={openRecordDialog} onReview={setApprovalReview} busy={mutationPending} canManage={canManage} canWorkCases={canWorkCases} canDecideApprovals={canDecideApprovals} employeeId={viewer.employeeId} />}
          {view === "Data model" && <OntologyModelExplorer data={initialData} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Cases" && <CasesPage cases={filteredCases} employees={initialData.employees} onAction={(command) => void performAction(command)} onCreate={() => openRecordDialog({ kind: "case" })} onRequestApproval={setApprovalRequestCase} busy={mutationPending} canWorkCases={canWorkCases} canRequestApprovals={canWorkCases} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Projects" && <ProjectsPage projects={filteredProjects} onAction={(command) => void performAction(command)} onCreate={() => openRecordDialog({ kind: "project" })} onEdit={(project) => openRecordDialog({ kind: "project", record: project })} onArchive={(project) => beginArchive("project", project)} busy={mutationPending} canManage={canManage} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Customers" && <CustomersPage customers={filteredCustomers} onCreate={() => openRecordDialog({ kind: "customer" })} onEdit={(customer) => openRecordDialog({ kind: "customer", record: customer })} onArchive={(customer) => beginArchive("customer", customer)} canManage={canManage} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Approvals" && <ApprovalsPage approvals={filteredApprovals} onReview={setApprovalReview} busy={mutationPending} canDecide={canDecideApprovals} employeeId={viewer.employeeId} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Activity" && <ActivityPage activity={filteredActivity} search={search} onClearSearch={() => setSearch("")} />}
        </div>
      </main>

      {recordDialog && <RecordDialog state={recordDialog} customers={initialData.customers} onClose={() => setRecordDialog(null)} onSubmit={performAction} />}
      {approvalRequestCase && <ApprovalRequestDialog caseRecord={approvalRequestCase} onClose={() => setApprovalRequestCase(null)} onSubmit={performAction} />}
      {approvalReview && <ApprovalReviewDialog state={approvalReview} onClose={() => setApprovalReview(null)} onSubmit={performAction} />}
      {destructiveAction && <ArchiveConfirmation action={destructiveAction} busy={mutationPending} onOpenChange={(open) => { if (!open && !mutationPending) setDestructiveAction(null); }} onConfirm={performAction} />}
    </div>
  );
}

function successTitle(command: WorkspaceCommand) {
  if (command.type.endsWith("archive")) return "Record archived";
  if (command.type === "approval.decide") return command.decision === "APPROVED" ? "Approval recorded" : "Request rejected";
  if (command.type === "case.escalate") return "Case escalated";
  if (command.type === "case.assign") return "Case assignment updated";
  if (command.type === "case.requestApproval") return "Approval requested";
  return "Changes saved";
}

function successDescription(command: WorkspaceCommand) {
  if (command.type === "approval.decide") return "The decision is saved to the approval history.";
  if (command.type === "case.requestApproval") return "The request is now in the approval queue.";
  if (command.type === "case.assign") return command.employeeId ? "The case owner was updated." : "The case is now unassigned.";
  return "The workspace has been updated successfully.";
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <PageHeader eyebrow={eyebrow} title={title} description={description} actions={action} />;
}

function Overview({ data, cases, approvals, activity, search, onClearSearch, onOpen, onAction, onCreate, onReview, busy, canManage, canWorkCases, canDecideApprovals, employeeId }: {
  data: Dashboard;
  cases: CaseRecord[];
  approvals: Approval[];
  activity: Activity[];
  search: string;
  onClearSearch: () => void;
  onOpen: (view: View) => void;
  onAction: (command: WorkspaceCommand) => void;
  onCreate: (state: RecordDialogState) => void;
  onReview: (state: ApprovalReviewState) => void;
  busy: boolean;
  canManage: boolean;
  canWorkCases: boolean;
  canDecideApprovals: boolean;
  employeeId: string;
}) {
  const metrics = data.metrics;
  const attentionCases = cases.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).slice(0, 5);
  const pending = approvals.filter((item) => item.status === "PENDING").slice(0, 3);
  const cards = [
    { label: "Active cases", value: metrics.activeCases, change: "Needs attention", icon: ShieldAlert, accent: "attention" },
    { label: "Projects", value: metrics.projects, change: "Across all teams", icon: BriefcaseBusiness, accent: "primary" },
    { label: "Customers", value: metrics.customers, change: "Active accounts", icon: UsersRound, accent: "secondary" },
    { label: "Pending approvals", value: metrics.pendingApprovals, change: "Waiting for review", icon: CheckCheck, accent: "warning" },
  ];
  return <>
    <PageHeading eyebrow="OPERATIONS WORKSPACE" title="Operations overview" description="A clear view of what needs attention across your business." action={<>{canManage && <Button variant="outline" onClick={() => onCreate({ kind: "customer" })}><Plus size={16} /> Add customer</Button>}{canWorkCases && <Button onClick={() => onCreate({ kind: "case" })}><FilePlus2 size={16} /> New case</Button>}</>} />
    <div className="metrics-grid">{cards.map(({ label, value, change, icon: Icon, accent }) => <article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${accent}`}><Icon size={18} aria-hidden="true" /></span></div><div className="metric-value">{value.toLocaleString()}</div><div className="metric-foot"><span className={`metric-trend ${accent}`} aria-hidden="true">{label === "Pending approvals" ? <CircleAlert size={14} /> : <ArrowUpRight size={14} />}</span><span>{change}</span></div></article>)}</div>
    <div className="overview-grid">
      <section className="panel attention-panel"><div className="panel-heading"><div><span className="eyebrow">PRIORITY QUEUE</span><h2>Cases to watch</h2></div><button className="text-link" onClick={() => onOpen("Cases")}>View all <ArrowRight size={16} aria-hidden="true" /></button></div>
        {attentionCases.length ? <div className="case-queue">{attentionCases.map((item) => <div className="queue-row" key={item.id}><span className={`priority-indicator ${item.priority.toLowerCase()}`} aria-hidden="true" /><div className="queue-main"><div className="queue-title-line"><strong>{item.title}</strong><StatusBadge status={item.status} /></div><div className="queue-meta"><span>{item.caseKey}</span><span>{item.customer?.name ?? "Customer"}</span><span className={isOverdue(item.slaDeadline) ? "overdue" : ""}><Clock3 size={13} aria-hidden="true" /> Due {formatDate(item.slaDeadline)}</span></div></div><Button variant="ghost" size="icon" className="icon-button compact" disabled={busy || !canWorkCases || item.priority === "HIGH" || ["CLOSED", "RESOLVED"].includes(item.status)} title="Escalate case" aria-label={`Escalate ${item.caseKey}`} onClick={() => onAction({ type: "case.escalate", caseId: item.id })}><ArrowUpRight size={17} aria-hidden="true" /></Button></div>)}</div> : search ? <EmptyState icon={Search} title="No matching cases" description="Try another term or clear your search." action={<Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button>} /> : <EmptyState icon={CircleCheck} title="All clear" description="No active cases need attention." />}
      </section>
      <section className="panel approvals-panel"><div className="panel-heading"><div><span className="eyebrow">DECISIONS</span><h2>Pending approvals</h2></div><button className="text-link" onClick={() => onOpen("Approvals")}>View all <ArrowRight size={16} aria-hidden="true" /></button></div>
        {pending.length ? <div className="approval-list">{pending.map((item) => <div className="approval-row" key={item.id}><span className="approval-mark"><CheckCheck size={17} aria-hidden="true" /></span><div className="approval-copy"><strong>{item.title}</strong><span>{item.approvalKey} · {item.requestedBy.name}</span></div><strong className="approval-amount">{item.amount ? formatMoney(item.amount) : "Review"}</strong>{canDecideApprovals && item.requestedBy.id !== employeeId && <div className="approval-actions"><button className="tiny-action approve" disabled={busy} aria-label={`Approve ${item.title}`} onClick={() => onReview({ approval: item, decision: "APPROVED" })}><Check size={15} aria-hidden="true" /></button><button className="tiny-action reject" disabled={busy} aria-label={`Reject ${item.title}`} onClick={() => onReview({ approval: item, decision: "REJECTED" })}><X size={15} aria-hidden="true" /></button></div>}</div>)}</div> : search ? <EmptyState icon={Search} title="No matching approvals" description="Try another term or clear your search." action={<Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button>} /> : <EmptyState icon={Check} title="No decisions waiting" description="New requests will appear here." />}
      </section>
    </div>
    <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST UPDATES</span><h2>Recent activity</h2></div><button className="text-link" onClick={() => onOpen("Activity")}>Activity log <ArrowRight size={16} aria-hidden="true" /></button></div><ActivityList items={activity.slice(0, 5)} emptyLabel={search ? "No matching activity records." : "No recent events."} /></section>
  </>;
}

function CasesPage({ cases, employees, onAction, onCreate, onRequestApproval, busy, canWorkCases, canRequestApprovals, search, onClearSearch }: {
  cases: CaseRecord[];
  employees: Employee[];
  onAction: (command: WorkspaceCommand) => void;
  onCreate: () => void;
  onRequestApproval: (record: CaseRecord) => void;
  busy: boolean;
  canWorkCases: boolean;
  canRequestApprovals: boolean;
  search: string;
  onClearSearch: () => void;
}) {
  const columns: DataTableColumn<CaseRecord>[] = [
    { id: "title", label: "Case", header: "Case", sortValue: (row) => row.title, cell: (row) => <div className="primary-cell"><strong>{row.title}</strong><span>{row.caseKey} · {row.category}</span></div> },
    { id: "customer", label: "Customer", header: "Customer", sortValue: (row) => row.customer?.name ?? "", cell: (row) => row.customer?.name ?? "—" },
    { id: "priority", label: "Priority", header: "Priority", sortValue: (row) => row.priority, cell: (row) => <><StatusBadge status={row.priority} />{row.escalationLevel > 0 && <small className="escalation-tag">Escalated {row.escalationLevel}×</small>}</> },
    { id: "status", label: "Status", header: "Status", sortValue: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
    { id: "owner", label: "Owner", header: "Owner", sortValue: (row) => row.assignedEmployee?.name ?? "", cell: (row) => <Select className="inline-select" aria-label={`Assign ${row.caseKey}`} value={row.assignedEmployeeId ?? ""} onChange={(event) => onAction({ type: "case.assign", caseId: row.id, employeeId: event.currentTarget.value || null })} disabled={busy || !canWorkCases}><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select> },
    { id: "sla", label: "SLA", header: "SLA", sortValue: (row) => new Date(row.slaDeadline), cell: (row) => <span className={isOverdue(row.slaDeadline) ? "overdue" : "date-cell"}>{formatDate(row.slaDeadline)}</span> },
    { id: "actions", label: "Actions", header: "Actions", cell: (row) => <div className="row-actions"><Button variant="ghost" size="icon" className="icon-button compact" title="Escalate case" aria-label={`Escalate ${row.caseKey}`} disabled={busy || !canWorkCases || row.priority === "HIGH" || ["CLOSED", "RESOLVED"].includes(row.status)} onClick={() => onAction({ type: "case.escalate", caseId: row.id })}><ArrowUpRight size={16} aria-hidden="true" /></Button>{canRequestApprovals && <Button variant="outline" size="sm" disabled={busy || ["CLOSED", "RESOLVED"].includes(row.status)} onClick={() => onRequestApproval(row)}>Request approval</Button>}</div> },
  ];
  return <><PageHeading eyebrow="SERVICE OPERATIONS" title="Operational cases" description="Triage requests, coordinate owners, and keep service commitments on track." action={canWorkCases ? <Button onClick={onCreate}><Plus size={16} /> New case</Button> : undefined} />
    <div className="list-summary"><span><strong>{cases.length}</strong> {cases.length === 1 ? "record" : "records"}</span><span className="summary-spacer" /><span className="legend-dot high" /> High priority<span className="legend-dot medium" /> Medium priority</div>
    <DataTable caption="Operational cases" columns={columns} rows={cases} getRowId={(row) => row.id} pageSize={10} emptyTitle={search ? "No matching cases" : "No cases yet"} emptyDescription={search ? "Try a different search or clear the current search." : "Create a case to start tracking operational work."} emptyAction={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : undefined} />
  </>;
}

function ProjectsPage({ projects, onAction, onCreate, onEdit, onArchive, busy, canManage, search, onClearSearch }: {
  projects: Project[];
  onAction: (command: WorkspaceCommand) => void;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  busy: boolean;
  canManage: boolean;
  search: string;
  onClearSearch: () => void;
}) {
  return <><PageHeading eyebrow="DELIVERY PORTFOLIO" title="Projects" description="Track ownership, delivery health, and work in flight across your portfolio." action={canManage ? <Button onClick={onCreate}><Plus size={16} /> New project</Button> : undefined} />
    <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.id}><div className="project-card-top"><StatusBadge status={project.status} /><div className="row-actions"><Button variant="outline" size="sm" disabled={!canManage || busy} onClick={() => onEdit(project)}>Edit</Button><Button variant="ghost" size="icon" className="icon-button compact" aria-label={`Archive ${project.name}`} title="Archive project" disabled={busy || !canManage} onClick={() => onArchive(project)}><X size={17} aria-hidden="true" /></Button></div></div><div className="project-key">{project.projectKey}</div><h3>{project.name}</h3><p>{project.customer?.name ?? "Customer not linked"} <span>·</span> {project.team?.name ?? "Unassigned team"}</p><div className="project-progress-head"><span>Delivery progress</span><strong>{project.progress}%</strong></div><div className="progress-track" role="progressbar" aria-label={`${project.name} delivery progress`} aria-valuenow={project.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${project.progress}%` }} /></div><div className="project-footer"><span><Clock3 size={14} aria-hidden="true" /> Due {formatDate(project.dueDate)}</span><span>{project._count?.cases ?? 0} cases</span><Button variant="link" size="sm" disabled={busy || !canManage || project.progress >= 100} onClick={() => onAction({ type: "project.update", projectId: project.id, input: { revision: project.revision, progress: Math.min(project.progress + 10, 100) } })}>Advance 10% <ArrowRight size={14} aria-hidden="true" /></Button></div></article>)}</div>
    {!projects.length && <EmptyState icon={search ? Search : FolderKanban} title={search ? "No matching projects" : "Your portfolio starts here"} description={search ? "Try another search or clear the current search." : "Create a project to bring delivery work into view."} action={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : canManage ? <Button onClick={onCreate}><Plus size={16} /> Create project</Button> : undefined} />}
  </>;
}

function CustomersPage({ customers, onCreate, onEdit, onArchive, canManage, search, onClearSearch }: {
  customers: Customer[];
  onCreate: () => void;
  onEdit: (customer: Customer) => void;
  onArchive: (customer: Customer) => void;
  canManage: boolean;
  search: string;
  onClearSearch: () => void;
}) {
  const columns: DataTableColumn<Customer>[] = [
    { id: "account", label: "Account", header: "Account", sortValue: (row) => row.name, cell: (row) => <div className="customer-cell"><span className="customer-monogram" aria-hidden="true">{row.name.slice(0, 1)}</span><div className="primary-cell"><strong>{row.name}</strong><span>{row.customerKey}</span></div></div> },
    { id: "industry", label: "Industry", header: "Industry", sortValue: (row) => row.industry, cell: (row) => row.industry },
    { id: "owner", label: "Owner", header: "Owner", sortValue: (row) => row.accountOwner?.name ?? "", cell: (row) => row.accountOwner?.name ?? "—" },
    { id: "projects", label: "Projects", header: "Projects", sortValue: (row) => row._count?.projects ?? 0, cell: (row) => row._count?.projects ?? 0 },
    { id: "cases", label: "Open cases", header: "Open cases", sortValue: (row) => row._count?.cases ?? 0, cell: (row) => row._count?.cases ?? 0 },
    { id: "contact", label: "Contact", header: "Contact", cell: (row) => <a className="email-link" href={`mailto:${row.email}`}>{row.email}</a> },
    { id: "actions", label: "Actions", header: "Actions", cell: (row) => canManage ? <div className="row-actions"><Button variant="outline" size="sm" onClick={() => onEdit(row)}>Edit</Button><Button variant="ghost" size="sm" className="danger-quiet" onClick={() => onArchive(row)}>Archive</Button></div> : <span>—</span> },
  ];
  return <><PageHeading eyebrow="CUSTOMER DIRECTORY" title="Customers" description="Keep account context connected to the work your teams deliver." action={canManage ? <Button onClick={onCreate}><Plus size={16} /> Add customer</Button> : undefined} />
    <DataTable caption="Customers" columns={columns} rows={customers} getRowId={(row) => row.id} pageSize={10} emptyTitle={search ? "No matching customers" : "No customers yet"} emptyDescription={search ? "Try another search or clear the current search." : "Add a customer to connect account context to your work."} emptyAction={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : canManage ? <Button onClick={onCreate}><Plus size={16} /> Add customer</Button> : undefined} />
  </>;
}

function ApprovalsPage({ approvals, onReview, busy, canDecide, employeeId, search, onClearSearch }: {
  approvals: Approval[];
  onReview: (state: ApprovalReviewState) => void;
  busy: boolean;
  canDecide: boolean;
  employeeId: string;
  search: string;
  onClearSearch: () => void;
}) {
  return <><PageHeading eyebrow="GOVERNANCE" title="Approvals" description="Review requests with their business context and recorded decision history." />
    <div className="approval-board">{approvals.map((item) => <article className="approval-card" key={item.id}><div className="approval-card-head"><span className="approval-key">{item.approvalKey}</span><StatusBadge status={item.status} /></div><h3>{item.title}</h3><p>{item.justification}</p><div className="approval-context"><span>{titleCase(item.type)}</span>{item.case && <span>{item.case.caseKey} · {item.case.title}</span>}</div><div className="approval-card-footer"><div><small>REQUESTED BY</small><strong>{item.requestedBy.name}</strong></div><div><small>AMOUNT</small><strong>{item.amount ? formatMoney(item.amount) : "—"}</strong></div>{item.status === "PENDING" && canDecide && item.requestedBy.id !== employeeId ? <div className="approval-actions"><Button variant="outline" size="sm" disabled={busy} onClick={() => onReview({ approval: item, decision: "REJECTED" })}>Reject</Button><Button size="sm" disabled={busy} onClick={() => onReview({ approval: item, decision: "APPROVED" })}><Check size={15} aria-hidden="true" /> Approve</Button></div> : item.status === "PENDING" && item.requestedBy.id === employeeId ? <div className="decision-label">You requested this</div> : item.status === "PENDING" ? <div className="decision-label">Awaiting a manager</div> : <div className="decision-label"><Check size={15} aria-hidden="true" /> {titleCase(item.status)}</div>}</div></article>)}</div>
    {!approvals.length && <EmptyState icon={search ? Search : CheckCheck} title={search ? "No matching approvals" : "No approval requests"} description={search ? "Try another search or clear the current search." : "Requests attached to operational cases will appear here."} action={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : undefined} />}
  </>;
}

function ActivityPage({ activity, search, onClearSearch }: { activity: Activity[]; search: string; onClearSearch: () => void }) {
  return <><PageHeading eyebrow="AUDIT TRAIL" title="Activity" description="A chronological record of changes made in this workspace." /><section className="panel full-activity"><ActivityList items={activity} emptyLabel={search ? "No matching activity records." : "No recorded changes yet."} />{search && activity.length === 0 && <div className="activity-empty-action"><Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button></div>}</section></>;
}

function ActivityList({ items, emptyLabel = "No recent events." }: { items: Activity[]; emptyLabel?: string }) {
  return items.length ? <div className="activity-list">{items.map((item) => <div className="activity-row" key={item.id}><span className="activity-avatar" aria-hidden="true">{item.actor?.name.slice(0, 1) ?? "O"}</span><div className="activity-copy"><strong>{item.summary}</strong><span>{item.actor?.name ?? "Ontix"} · {titleCase(item.objectType)} · {titleCase(item.action)}</span></div><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div>)}</div> : <div className="empty-inline" role="status">{emptyLabel}</div>;
}

function RecordDialog({ state, customers, onClose, onSubmit }: {
  state: RecordDialogState;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (command: WorkspaceCommand) => Promise<boolean>;
}) {
  const kind = state.kind;
  const editing = "record" in state && Boolean(state.record);
  const current = editing ? state.record : undefined;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const title = editing ? `Edit ${kind}` : kind === "case" ? "Open a case" : kind === "project" ? "Create project" : "Add customer";
  const selectOptions = (values: string[]) => values.map((value) => <option key={value} value={value}>{titleCase(value)}</option>);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    const values = new FormData(event.currentTarget);
    const value = (name: string) => String(values.get(name) ?? "").trim();
    let command: WorkspaceCommand;
    let validation;

    if (kind === "customer") {
      const input = { name: value("name"), industry: value("industry"), email: value("email"), phone: value("phone") };
      validation = editing ? customerPatchSchema.safeParse(input) : customerInputSchema.safeParse(input);
      if (!validation.success) return setErrors(toFieldErrors(validation.error.issues));
      command = editing ? { type: "customer.update", customerId: state.record!.id, input: validation.data } : { type: "customer.create", input: validation.data };
    } else if (kind === "project") {
      const input = {
        name: value("name"), description: value("description"), customerId: value("customerId"),
        status: value("status") || "PLANNING", priority: value("priority") || "MEDIUM",
        startDate: value("startDate"), dueDate: value("dueDate"), budget: value("budget") || "0",
        progress: editing ? Number(value("progress")) : 0,
      };
      validation = editing
        ? projectPatchSchema.safeParse({ ...input, revision: state.record!.revision })
        : projectInputSchema.safeParse(input);
      if (!validation.success) return setErrors(toFieldErrors(validation.error.issues));
      command = editing ? { type: "project.update", projectId: state.record!.id, input: validation.data } : { type: "project.create", input: validation.data };
    } else {
      const input = {
        title: value("title"), description: value("description"), customerId: value("customerId"),
        priority: value("priority") || "MEDIUM", category: value("category"), slaDeadline: value("slaDeadline"),
      };
      validation = caseInputSchema.safeParse(input);
      if (!validation.success) return setErrors(toFieldErrors(validation.error.issues));
      command = { type: "case.create", input: validation.data };
    }

    setBusy(true);
    try {
      if (await onSubmit(command)) onClose();
    } finally {
      setBusy(false);
    }
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent size="md" showCloseButton={!busy}>
      <DialogHeader><span className="eyebrow">WORKSPACE RECORD</span><DialogTitle>{title}</DialogTitle><DialogDescription>{editing ? "Update this record. Your changes will be saved to the workspace audit trail." : "Enter the details for this workspace record."}</DialogDescription></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="dialog-form" noValidate>
        {kind === "customer" && <>
          <FormField label="Company name" required error={errors.name}><Input name="name" placeholder="e.g. Northstar Logistics" defaultValue={current && "name" in current ? current.name : ""} required maxLength={140} /></FormField>
          <div className="form-row"><FormField label="Industry" required error={errors.industry}><Input name="industry" placeholder="Transportation" defaultValue={current && "industry" in current ? current.industry : ""} required maxLength={100} /></FormField><FormField label="Phone" required error={errors.phone}><Input name="phone" type="tel" placeholder="+1 555 010 1000" defaultValue={current && "phone" in current ? current.phone : ""} required maxLength={40} /></FormField></div>
          <FormField label="Contact email" required error={errors.email}><Input name="email" type="email" placeholder="operations@example.test" defaultValue={current && "email" in current ? current.email : ""} required maxLength={254} /></FormField>
        </>}
        {kind === "project" && <>
          <FormField label="Project name" required error={errors.name}><Input name="name" placeholder="e.g. Fleet visibility rollout" defaultValue={current && "name" in current ? current.name : ""} required maxLength={160} /></FormField>
          <FormField label="Description" error={errors.description}><Textarea name="description" placeholder="What outcome will this project deliver?" defaultValue={current && "description" in current ? current.description : ""} maxLength={4000} /></FormField>
          <FormField label="Customer" required error={errors.customerId}><Select name="customerId" defaultValue={current && "customerId" in current ? current.customerId : ""} required><option value="">Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></FormField>
          <div className="form-row"><FormField label="Status" required error={errors.status}><Select name="status" defaultValue={current && "status" in current ? current.status : "PLANNING"}>{selectOptions(["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "AT_RISK"])}</Select></FormField><FormField label="Priority" required error={errors.priority}><Select name="priority" defaultValue={current && "priority" in current ? current.priority : "MEDIUM"}>{selectOptions(["LOW", "MEDIUM", "HIGH", "CRITICAL"])}</Select></FormField></div>
          <div className="form-row"><FormField label="Start date" required error={errors.startDate}><Input name="startDate" type="date" defaultValue={current && "startDate" in current ? toLocalDateInput(current.startDate) : toLocalDateInput()} required /></FormField><FormField label="Due date" required error={errors.dueDate}><Input name="dueDate" type="date" defaultValue={current && "dueDate" in current ? toLocalDateInput(current.dueDate) : toLocalDateInput()} required /></FormField></div>
          <div className="form-row"><FormField label="Budget (USD)" error={errors.budget}><Input name="budget" type="number" min="0" step="0.01" defaultValue={current && "budget" in current ? current.budget : "0"} /></FormField>{editing && <FormField label="Progress (%)" required error={errors.progress}><Input name="progress" type="number" min="0" max="100" step="1" defaultValue={current && "progress" in current ? String(current.progress) : "0"} required /></FormField>}</div>
        </>}
        {kind === "case" && <>
          <FormField label="Case title" required error={errors.title}><Input name="title" placeholder="Summarize the customer issue" required maxLength={180} /></FormField>
          <FormField label="Description" error={errors.description}><Textarea name="description" placeholder="Add useful context for the team" maxLength={4000} /></FormField>
          <FormField label="Customer" required error={errors.customerId}><Select name="customerId" defaultValue="" required><option value="">Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></FormField>
          <div className="form-row"><FormField label="Category" required error={errors.category}><Input name="category" placeholder="Data quality" required maxLength={80} /></FormField><FormField label="Priority" required error={errors.priority}><Select name="priority" defaultValue="MEDIUM">{selectOptions(["LOW", "MEDIUM", "HIGH", "CRITICAL"])}</Select></FormField></div>
          <FormField label="SLA deadline" required error={errors.slaDeadline}><Input name="slaDeadline" type="datetime-local" defaultValue={toLocalDateTimeInput()} required /></FormField>
        </>}
        <DialogFooter><Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" loading={busy} loadingLabel="Saving…">{title}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function ApprovalReviewDialog({ state, onClose, onSubmit }: {
  state: ApprovalReviewState;
  onClose: () => void;
  onSubmit: (command: WorkspaceCommand) => Promise<boolean>;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const approving = state.decision === "APPROVED";
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = comment.trim();
    if (!approving && trimmed.length < 5) {
      setError("Add a short reason of at least 5 characters before rejecting this request.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (await onSubmit({ type: "approval.decide", approvalId: state.approval.id, decision: state.decision, comment: trimmed })) onClose();
    } finally {
      setBusy(false);
    }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent size="sm" showCloseButton={!busy}>
      <DialogHeader><span className="eyebrow">APPROVAL {state.approval.approvalKey}</span><DialogTitle>{approving ? "Approve request?" : "Reject request?"}</DialogTitle><DialogDescription>{state.approval.title} · Requested by {state.approval.requestedBy.name}{state.approval.amount ? ` · ${formatMoney(state.approval.amount)}` : ""}</DialogDescription></DialogHeader>
      <form className="dialog-form" onSubmit={(event) => void submit(event)} noValidate>
        <FormField label={approving ? "Decision note" : "Reason for rejection"} hint={approving ? "Optional. This note is recorded in the approval history." : "A short reason is required and will be recorded in the approval history."} error={error} required={!approving}><Textarea value={comment} onChange={(event) => setComment(event.currentTarget.value)} maxLength={1000} required={!approving} placeholder={approving ? "Add context for this decision" : "Explain why this request is being rejected"} /></FormField>
        <DialogFooter><Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant={approving ? "primary" : "destructive"} loading={busy} loadingLabel="Saving decision…">{approving ? "Approve request" : "Reject request"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function ApprovalRequestDialog({ caseRecord, onClose, onSubmit }: {
  caseRecord: CaseRecord;
  onClose: () => void;
  onSubmit: (command: WorkspaceCommand) => Promise<boolean>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    const values = new FormData(event.currentTarget);
    const amountValue = String(values.get("amount") ?? "").trim();
    const raw = {
      type: String(values.get("type") ?? "").trim(),
      title: String(values.get("title") ?? "").trim(),
      justification: String(values.get("justification") ?? "").trim(),
      ...(amountValue ? { amount: amountValue } : {}),
    };
    const validation = approvalInputSchema.safeParse(raw);
    if (!validation.success) return setErrors(toFieldErrors(validation.error.issues));
    setBusy(true);
    try {
      if (await onSubmit({ type: "case.requestApproval", caseId: caseRecord.id, input: validation.data })) onClose();
    } finally {
      setBusy(false);
    }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent size="md" showCloseButton={!busy}>
      <DialogHeader><span className="eyebrow">{caseRecord.caseKey} · {caseRecord.title}</span><DialogTitle>Request approval</DialogTitle><DialogDescription>Provide the decision context for this operational case. The request will be attributed to your account.</DialogDescription></DialogHeader>
      <form className="dialog-form" onSubmit={(event) => void submit(event)} noValidate>
        <FormField label="Request type" required error={errors.type}><Input name="type" placeholder="e.g. Expense or exception" required maxLength={80} /></FormField>
        <FormField label="Title" required error={errors.title}><Input name="title" placeholder="A concise decision request" required maxLength={180} /></FormField>
        <FormField label="Justification" required error={errors.justification}><Textarea name="justification" placeholder="Explain the business need and relevant context" required maxLength={2000} /></FormField>
        <FormField label="Amount (USD)" hint="Leave blank if this request has no monetary amount." error={errors.amount}><Input name="amount" type="number" min="0" step="0.01" placeholder="0.00" /></FormField>
        <DialogFooter><Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" loading={busy} loadingLabel="Submitting…">Submit request</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function ArchiveConfirmation({ action, busy, onOpenChange, onConfirm }: {
  action: DestructiveAction;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (command: WorkspaceCommand) => Promise<boolean>;
}) {
  return <AlertDialog open onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{action.title}</AlertDialogTitle><AlertDialogDescription>{action.description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void onConfirm(action.command).then((success) => { if (success) onOpenChange(false); }); }}>{busy ? "Archiving…" : action.actionLabel}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

function toFieldErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
