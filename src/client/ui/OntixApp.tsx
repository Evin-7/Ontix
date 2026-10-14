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
  PlugZap,
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
import { notificationCopy, workspaceErrorMessage, workspaceSuccessMessage } from "@/lib/notification-copy";
import { toFieldErrors } from "@/lib/validation-messages";
import { OntologyModelExplorer } from "@/client/ui/OntologyModelExplorer";
import { PeoplePage } from "@/client/ui/PeoplePage";
import { FoundryIntegrationsPage } from "@/client/ui/FoundryIntegrationsPage";
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
import type { FoundryIntegrationStatus } from "@/types/integrations";

type View = "Overview" | "Data model" | "Cases" | "Projects" | "Customers" | "People" | "Approvals" | "Activity" | "Integrations";
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
  { name: "People", icon: UsersRound },
  { name: "Approvals", icon: CheckCheck },
  { name: "Activity", icon: ActivityIcon },
  { name: "Integrations", icon: PlugZap },
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

export function OntixApp({ initialData, viewer, integrationStatus }: { initialData: WorkspaceData; viewer: Viewer; integrationStatus: FoundryIntegrationStatus }) {
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
  const canManageEmployees = viewer.role === "ADMINISTRATOR";
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
    notify.loading({ id: pendingId, title: "Saving changes…" });
    setMutationPending(true);
    try {
      const result = await runWorkspaceCommand(command);
      notify.dismiss(pendingId);
      if (!result.ok) {
        notify.error({ title: workspaceErrorMessage(result.error) });
        return false;
      }
      router.refresh();
      notify.success({ title: workspaceSuccessMessage(command) });
      return true;
    } catch {
      notify.dismiss(pendingId);
      notify.error({ title: notificationCopy.requestFailed });
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
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-border bg-surface px-[18px] pt-7 pb-[18px] text-foreground max-[1180px]:w-[232px] max-[820px]:sticky max-[820px]:inset-x-0 max-[820px]:top-0 max-[820px]:bottom-auto max-[820px]:z-20 max-[820px]:h-auto max-[820px]:w-full max-[820px]:border-r-0 max-[820px]:border-b max-[820px]:px-[14px] max-[820px]:pt-3 max-[820px]:pb-[9px]">
        <div className="inline-flex items-center gap-[11px] px-[9px] max-[820px]:inline-flex"><OntixLogo size="small" /></div>
        <div className="mx-[9px] mt-[10px] mb-[27px] text-xs leading-[1.55] text-muted max-[820px]:hidden">Connected Data.<br />Smarter Operations.</div>
        <div className="flex items-center gap-2.5 rounded-[var(--radius-control)] border border-border bg-surface-muted p-2.5 max-[820px]:hidden" aria-label="Current workspace">
          <div className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary"><Layers3 size={17} aria-hidden="true" /></div>
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold">Operations</strong><span className="text-[11px] text-muted">Local Demo Mode</span></div>
        </div>
        <div className="mt-7 mx-2.5 mb-[9px] text-[10px] font-bold tracking-[.12em] text-muted max-[820px]:hidden">WORKSPACE</div>
        <nav className="grid gap-1 max-[820px]:mt-[11px] max-[820px]:flex max-[820px]:gap-[5px] max-[820px]:overflow-x-auto max-[820px]:px-0 max-[820px]:pb-0.5" aria-label="Main navigation">
          {views.map(({ name, icon: Icon }) => (
            <button key={name} type="button" className={`flex min-h-10 items-center gap-[11px] rounded-lg border-0 bg-transparent px-[11px] text-left text-[13px] text-muted transition-colors hover:bg-surface-muted hover:text-foreground max-[820px]:min-h-[38px] max-[820px]:w-auto max-[820px]:shrink-0 max-[820px]:gap-[7px] max-[820px]:px-2.5 max-[820px]:text-xs ${view === name ? "bg-primary-subtle font-semibold text-primary" : ""}`} aria-current={view === name ? "page" : undefined} onClick={() => { setView(name); setSearch(""); }}>
              <Icon className="size-[18px] max-[820px]:size-4" strokeWidth={1.8} aria-hidden="true" /><span>{name}</span>
              {name === "Approvals" && initialData.dashboard.metrics.pendingApprovals > 0 && <small className="ml-auto min-w-[21px] rounded-full bg-surface px-1.5 py-[3px] text-center text-[11px] text-primary max-[820px]:ml-0" aria-label={`${initialData.dashboard.metrics.pendingApprovals} pending`}>{initialData.dashboard.metrics.pendingApprovals}</small>}
            </button>
          ))}
        </nav>
        <div className="mt-auto max-[820px]:hidden">
          <div className="rounded-[10px] border border-border bg-surface-muted px-3 py-[13px]"><div className="mb-2 flex items-center gap-[7px] text-[10px] font-bold tracking-[.08em] text-muted"><Database size={15} aria-hidden="true" /><span>ACTIVE DATA SOURCE</span></div><strong className="block text-xs font-semibold">Neon PostgreSQL</strong><small className="mt-1 block text-[11px] text-muted">Local Demo · Foundry is not connected</small></div>
          <div className="mt-3 flex items-center gap-2"><div className="grid size-[34px] shrink-0 place-items-center rounded-full border border-border bg-primary-subtle text-[11px] font-bold text-primary" aria-hidden="true">{initials}</div><div className="flex min-w-0 flex-1 flex-col gap-[3px]"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold">{viewer.name}</strong><span className="text-[11px] text-muted">{titleCase(viewer.role)}</span></div><form action={signOutAction}><button className="rounded-[7px] border border-border bg-surface px-[9px] py-[7px] text-[11px] text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Sign out" title="Sign out">Sign out</button></form></div>
        </div>
      </aside>

      <main className="min-h-screen ml-64 max-[1180px]:ml-[232px] max-[820px]:ml-0">
        <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between gap-[18px] border-b border-border bg-surface px-9 max-[820px]:static max-[820px]:h-[58px] max-[820px]:px-4 max-[520px]:gap-2">
          <div className="flex min-w-0 items-center gap-[13px]">
            <OntixLogo variant="icon" size="small" decorative className="size-6 max-[520px]:hidden" />
            <div className="flex items-center gap-[9px] text-[13px] text-muted max-[520px]:text-xs" aria-label="Breadcrumb"><span className="max-[400px]:hidden">Workspace</span><span className="text-border max-[400px]:hidden" aria-hidden="true">/</span><strong className="font-semibold text-foreground">{view}</strong></div>
          </div>
          <div className="flex items-center gap-2.5 max-[520px]:gap-[5px]">
            <label className="flex min-h-[38px] w-[264px] items-center gap-[9px] rounded-[var(--radius-control)] border border-border bg-surface px-2.5 text-muted focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15 max-[820px]:w-[min(230px,44vw)] max-[520px]:w-[min(150px,42vw)]"><Search size={17} aria-hidden="true" /><input className="w-full min-w-0 border-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted" ref={searchRef} aria-label={`Search ${view.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${view.toLowerCase()}…`} /><kbd className="shrink-0 rounded-[5px] border border-border bg-surface-muted px-[5px] py-[3px] text-[10px] text-muted max-[820px]:hidden" aria-hidden="true">⌘ K</kbd></label>
            <Button variant="ghost" size="icon" className="relative inline-grid size-9 shrink-0 place-items-center rounded-lg border border-transparent bg-transparent p-0 text-muted hover:border-border hover:bg-surface-muted hover:text-foreground" aria-label="Refresh data" title="Refresh data" onClick={reload}><RefreshCw size={17} aria-hidden="true" /></Button>
            <ThemeToggle className="max-[520px]:min-w-10 max-[520px]:justify-center max-[520px]:px-0" />
            <form action={signOutAction} className="hidden max-[520px]:block"><Button type="submit" variant="ghost" size="icon" className="relative inline-grid size-9 shrink-0 place-items-center rounded-lg border border-transparent bg-transparent p-0 text-muted hover:border-border hover:bg-surface-muted hover:text-foreground" aria-label="Sign out" title="Sign out"><LogOut size={17} aria-hidden="true" /></Button></form>
            <div className="grid size-[34px] shrink-0 place-items-center rounded-full border border-border bg-primary-subtle text-[11px] font-bold text-primary max-[520px]:hidden" aria-label={`Signed in as ${viewer.name}`}>{initials}</div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1480px] px-9 pt-8 pb-14 max-[1180px]:px-6 max-[820px]:px-4 max-[820px]:pt-6 max-[820px]:pb-10">
          {view === "Overview" && <Overview data={initialData.dashboard} cases={filteredCases} approvals={filteredApprovals} activity={filteredActivity} search={search} onClearSearch={() => setSearch("")} onOpen={(nextView) => { setView(nextView); setSearch(""); }} onAction={(command) => void performAction(command)} onCreate={openRecordDialog} onReview={setApprovalReview} busy={mutationPending} canManage={canManage} canWorkCases={canWorkCases} canDecideApprovals={canDecideApprovals} employeeId={viewer.employeeId} />}
          {view === "Data model" && <OntologyModelExplorer data={initialData} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Cases" && <CasesPage cases={filteredCases} employees={initialData.employees} onAction={(command) => void performAction(command)} onResolve={(caseId) => performAction({ type: "case.resolve", caseId })} onCreate={() => openRecordDialog({ kind: "case" })} onRequestApproval={setApprovalRequestCase} busy={mutationPending} canWorkCases={canWorkCases} canRequestApprovals={canWorkCases} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Projects" && <ProjectsPage projects={filteredProjects} onAction={(command) => void performAction(command)} onCreate={() => openRecordDialog({ kind: "project" })} onEdit={(project) => openRecordDialog({ kind: "project", record: project })} onArchive={(project) => beginArchive("project", project)} busy={mutationPending} canManage={canManage} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Customers" && <CustomersPage customers={filteredCustomers} onCreate={() => openRecordDialog({ kind: "customer" })} onEdit={(customer) => openRecordDialog({ kind: "customer", record: customer })} onArchive={(customer) => beginArchive("customer", customer)} canManage={canManage} search={search} onClearSearch={() => setSearch("")} />}
          {view === "People" && <PeoplePage employees={initialData.employees} teams={initialData.teams} viewerEmployeeId={viewer.employeeId} search={search} onClearSearch={() => setSearch("")} canManageEmployees={canManageEmployees} canManageTeams={canManage} onAction={performAction} />}
          {view === "Approvals" && <ApprovalsPage approvals={filteredApprovals} onReview={setApprovalReview} busy={mutationPending} canDecide={canDecideApprovals} employeeId={viewer.employeeId} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Activity" && <ActivityPage activity={filteredActivity} search={search} onClearSearch={() => setSearch("")} />}
          {view === "Integrations" && <FoundryIntegrationsPage status={integrationStatus} />}
        </div>
      </main>

      {recordDialog && <RecordDialog state={recordDialog} customers={initialData.customers} teams={initialData.teams} onClose={() => setRecordDialog(null)} onSubmit={performAction} />}
      {approvalRequestCase && <ApprovalRequestDialog caseRecord={approvalRequestCase} onClose={() => setApprovalRequestCase(null)} onSubmit={performAction} />}
      {approvalReview && <ApprovalReviewDialog state={approvalReview} onClose={() => setApprovalReview(null)} onSubmit={performAction} />}
      {destructiveAction && <ArchiveConfirmation action={destructiveAction} busy={mutationPending} onOpenChange={(open) => { if (!open && !mutationPending) setDestructiveAction(null); }} onConfirm={performAction} />}
    </div>
  );
}

function PageHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <PageHeader eyebrow={eyebrow} title={title} actions={action} />;
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
    <PageHeading eyebrow="OPERATIONS WORKSPACE" title="Operations overview" action={<>{canManage && <Button variant="outline" onClick={() => onCreate({ kind: "customer" })}><Plus size={16} /> Add customer</Button>}{canWorkCases && <Button onClick={() => onCreate({ kind: "case" })}><FilePlus2 size={16} /> New case</Button>}</>} />
    <div className="mb-4 grid grid-cols-4 gap-[14px] max-[820px]:grid-cols-2 max-[820px]:gap-2.5">{cards.map(({ label, value, change, icon: Icon, accent }) => <article className="min-h-[132px] rounded-[var(--radius-card)] border border-border bg-surface p-[17px_18px] shadow-[var(--shadow-sm)] max-[820px]:min-h-[116px] max-[820px]:p-[14px]" key={label}><div className="flex items-center justify-between text-[13px] text-muted"><span>{label}</span><span className={`grid size-[34px] place-items-center rounded-[9px] ${accent === "warning" ? "bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface))] text-warning" : "bg-primary-subtle text-primary"}`}><Icon size={18} aria-hidden="true" /></span></div><div className="mt-[9px] mb-[3px] text-[28px] leading-[1.1] font-semibold tracking-[-.04em] text-foreground">{value.toLocaleString()}</div><div className="flex items-center gap-[7px] text-xs text-muted"><span className={`text-xs font-bold ${accent === "warning" || accent === "attention" ? "text-warning" : "text-primary"}`} aria-hidden="true">{label === "Pending approvals" ? <CircleAlert size={14} /> : <ArrowUpRight size={14} />}</span><span>{change}</span></div></article>)}</div>
    <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)] gap-4 max-[1180px]:grid-cols-1 max-[820px]:gap-[11px]">
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-[18px_19px] shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between gap-3"><div><span className="block text-[11px] font-bold tracking-[.11em] text-muted">PRIORITY QUEUE</span><h2 className="mt-[5px] text-base font-[650] tracking-[-.02em] text-foreground">Cases to watch</h2></div><button className="inline-flex items-center gap-[5px] border-0 bg-transparent px-px py-1.5 text-[13px] font-semibold text-primary hover:not-disabled:text-primary-hover" onClick={() => onOpen("Cases")}>View all <ArrowRight size={16} aria-hidden="true" /></button></div>
        {attentionCases.length ? <div className="mt-[13px]">{attentionCases.map((item) => <div className="flex min-h-[68px] items-center gap-[11px] border-t border-border" key={item.id}><span className={`my-[14px] ml-0 mr-px w-[3px] self-stretch rounded-[5px] ${item.priority === "HIGH" || item.priority === "CRITICAL" ? "bg-error" : item.priority === "MEDIUM" ? "bg-warning" : "bg-success"}`} aria-hidden="true" /><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2 max-[520px]:items-start max-[520px]:flex-col max-[520px]:gap-1"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-foreground">{item.title}</strong><StatusBadge status={item.status} /></div><div className="mt-[5px] flex flex-wrap gap-[11px] text-[11px] text-muted max-[520px]:gap-[6px]"><span>{item.caseKey}</span><span>{item.customer?.name ?? "Customer"}</span><span className={`inline-flex items-center gap-[3px] ${isOverdue(item.slaDeadline) ? "font-semibold text-error" : ""}`}><Clock3 size={13} aria-hidden="true" /> Due {formatDate(item.slaDeadline)}</span></div></div><Button variant="ghost" size="icon" className="relative inline-grid size-[34px] shrink-0 place-items-center rounded-lg border border-transparent bg-transparent p-0 text-muted hover:border-border hover:bg-surface-muted hover:text-foreground" disabled={busy || !canWorkCases || item.priority === "CRITICAL" || ["CLOSED", "RESOLVED"].includes(item.status)} title="Escalate case" aria-label={`Escalate ${item.caseKey}`} onClick={() => onAction({ type: "case.escalate", caseId: item.id })}><ArrowUpRight size={17} aria-hidden="true" /></Button></div>)}</div> : search ? <EmptyState icon={Search} title="No matching cases" description="Try another term or clear your search." action={<Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button>} /> : <EmptyState icon={CircleCheck} title="All clear" description="No active cases need attention." />}
      </section>
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-[18px_19px] shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between gap-3"><div><span className="block text-[11px] font-bold tracking-[.11em] text-muted">DECISIONS</span><h2 className="mt-[5px] text-base font-[650] tracking-[-.02em] text-foreground">Pending approvals</h2></div><button className="inline-flex items-center gap-[5px] border-0 bg-transparent px-px py-1.5 text-[13px] font-semibold text-primary hover:not-disabled:text-primary-hover" onClick={() => onOpen("Approvals")}>View all <ArrowRight size={16} aria-hidden="true" /></button></div>
        {pending.length ? <div className="mt-[13px]">{pending.map((item) => <div className="flex min-h-[66px] items-center gap-[9px] border-t border-border" key={item.id}><span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-primary-subtle text-primary"><CheckCheck size={17} aria-hidden="true" /></span><div className="flex min-w-0 flex-1 flex-col gap-1"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-foreground">{item.title}</strong><span className="text-[11px] text-muted">{item.approvalKey} · {item.requestedBy.name}</span></div><strong className="whitespace-nowrap text-xs font-semibold text-foreground">{item.amount ? formatMoney(item.amount) : "Review"}</strong>{canDecideApprovals && item.requestedBy.id !== employeeId && <div className="flex items-center gap-1.5"><button className="grid size-[30px] place-items-center rounded-[7px] border border-border bg-surface text-success hover:bg-surface-muted disabled:cursor-not-allowed" disabled={busy} aria-label={`Approve ${item.title}`} onClick={() => onReview({ approval: item, decision: "APPROVED" })}><Check size={15} aria-hidden="true" /></button><button className="grid size-[30px] place-items-center rounded-[7px] border border-border bg-surface text-error hover:bg-surface-muted disabled:cursor-not-allowed" disabled={busy} aria-label={`Reject ${item.title}`} onClick={() => onReview({ approval: item, decision: "REJECTED" })}><X size={15} aria-hidden="true" /></button></div>}</div>)}</div> : search ? <EmptyState icon={Search} title="No matching approvals" description="Try another term or clear your search." action={<Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button>} /> : <EmptyState icon={Check} title="No decisions waiting" description="New requests will appear here." />}
      </section>
    </div>
    <section className="mt-4 min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-[18px_19px] shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between gap-3"><div><span className="block text-[11px] font-bold tracking-[.11em] text-muted">LATEST UPDATES</span><h2 className="mt-[5px] text-base font-[650] tracking-[-.02em] text-foreground">Recent activity</h2></div><button className="inline-flex items-center gap-[5px] border-0 bg-transparent px-px py-1.5 text-[13px] font-semibold text-primary hover:not-disabled:text-primary-hover" onClick={() => onOpen("Activity")}>Activity log <ArrowRight size={16} aria-hidden="true" /></button></div><ActivityList items={activity.slice(0, 5)} emptyLabel={search ? "No matching activity records." : "No recent events."} /></section>
  </>;
}

function CasesPage({ cases, employees, onAction, onResolve, onCreate, onRequestApproval, busy, canWorkCases, canRequestApprovals, search, onClearSearch }: {
  cases: CaseRecord[];
  employees: Employee[];
  onAction: (command: WorkspaceCommand) => void;
  onResolve: (caseId: string) => Promise<boolean>;
  onCreate: () => void;
  onRequestApproval: (record: CaseRecord) => void;
  busy: boolean;
  canWorkCases: boolean;
  canRequestApprovals: boolean;
  search: string;
  onClearSearch: () => void;
}) {
  const columns: DataTableColumn<CaseRecord>[] = [
    { id: "title", label: "Case", header: "Case", sortValue: (row) => row.title, cell: (row) => <div className="flex min-w-40 flex-col gap-1"><strong className="text-[13px] font-semibold text-foreground">{row.title}</strong><span className="text-[11px] text-muted">{row.caseKey} · {row.category}</span></div> },
    { id: "customer", label: "Customer", header: "Customer", sortValue: (row) => row.customer?.name ?? "", cell: (row) => row.customer?.name ?? "—" },
    { id: "priority", label: "Priority", header: "Priority", sortValue: (row) => row.priority, cell: (row) => <><StatusBadge status={row.priority} />{row.escalationLevel > 0 && <small className="mt-1 block text-[10px] text-error">Escalated {row.escalationLevel}×</small>}</> },
    { id: "status", label: "Status", header: "Status", sortValue: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
    { id: "owner", label: "Owner", header: "Owner", sortValue: (row) => row.assignedEmployee?.name ?? "", cell: (row) => <Select className="min-h-[34px] max-w-[150px] rounded-[7px] px-2 py-0 text-xs" aria-label={`Assign ${row.caseKey}`} value={row.assignedEmployeeId ?? ""} onChange={(event) => onAction({ type: "case.assign", caseId: row.id, employeeId: event.currentTarget.value || null })} disabled={busy || !canWorkCases}><option value="">Unassigned</option>{row.assignedEmployeeId && !employees.some((employee) => employee.id === row.assignedEmployeeId) && <option value={row.assignedEmployeeId} disabled>{row.assignedEmployee?.name ?? "Inactive employee"} · inactive</option>}{employees.filter((employee) => employee.isActive !== false || employee.id === row.assignedEmployeeId).map((employee) => <option key={employee.id} value={employee.id} disabled={employee.isActive === false}>{employee.name}{employee.isActive === false ? " · inactive" : ""}</option>)}</Select> },
    { id: "sla", label: "SLA", header: "SLA", sortValue: (row) => new Date(row.slaDeadline), cell: (row) => <span className={isOverdue(row.slaDeadline) ? "font-semibold text-error" : "text-muted"}>{formatDate(row.slaDeadline)}</span> },
    { id: "actions", label: "Actions", header: "Actions", cell: (row) => <div className="flex flex-wrap items-center gap-1.5"><Button variant="ghost" size="icon" className="relative inline-grid size-[34px] shrink-0 place-items-center rounded-lg border border-transparent bg-transparent p-0 text-muted hover:border-border hover:bg-surface-muted hover:text-foreground" title="Escalate case" aria-label={`Escalate ${row.caseKey}`} disabled={busy || !canWorkCases || row.priority === "CRITICAL" || ["CLOSED", "RESOLVED"].includes(row.status)} onClick={() => onAction({ type: "case.escalate", caseId: row.id })}><ArrowUpRight size={16} aria-hidden="true" /></Button>{canRequestApprovals && ["OPEN", "IN_PROGRESS"].includes(row.status) && <Button variant="outline" size="sm" disabled={busy} onClick={() => onRequestApproval(row)}>Request approval</Button>}{canWorkCases && ["OPEN", "IN_PROGRESS"].includes(row.status) && <Button variant="outline" size="sm" disabled={busy} onClick={() => void onResolve(row.id)}>Resolve</Button>}</div> },
  ];
  return <><PageHeading eyebrow="SERVICE OPERATIONS" title="Operational cases" action={canWorkCases ? <Button onClick={onCreate}><Plus size={16} /> New case</Button> : undefined} />
    <div className="my-0 mx-0.5 mb-3 flex items-center gap-2 text-xs text-muted"><span><strong className="text-foreground">{cases.length}</strong> {cases.length === 1 ? "record" : "records"}</span><span className="flex-1" /><span className="ml-2 size-[7px] rounded-full bg-error" /> High priority<span className="ml-2 size-[7px] rounded-full bg-warning" /> Medium priority</div>
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
  return <><PageHeading eyebrow="DELIVERY PORTFOLIO" title="Projects" action={canManage ? <Button onClick={onCreate}><Plus size={16} /> New project</Button> : undefined} />
    <div className="grid grid-cols-3 gap-[14px] max-[1180px]:grid-cols-2 max-[820px]:grid-cols-1">{projects.map((project) => <article className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-[17px] shadow-[var(--shadow-sm)]" key={project.id}><div className="flex items-center justify-between"><StatusBadge status={project.status} /><div className="flex flex-wrap items-center gap-1.5"><Button variant="outline" size="sm" disabled={!canManage || busy} onClick={() => onEdit(project)}>Edit</Button><Button variant="ghost" size="icon" className="relative inline-grid size-[34px] shrink-0 place-items-center rounded-lg border border-transparent bg-transparent p-0 text-muted hover:border-border hover:bg-surface-muted hover:text-foreground" aria-label={`Archive ${project.name}`} title="Archive project" disabled={busy || !canManage} onClick={() => onArchive(project)}><X size={17} aria-hidden="true" /></Button></div></div><div className="mt-[11px] text-[11px] tracking-[.05em] text-muted">{project.projectKey}</div><h3 className="mt-[5px] mb-[5px] text-base leading-[1.4] font-semibold tracking-[-.02em] text-foreground">{project.name}</h3><p className="m-0 text-xs text-muted">{project.customer?.name ?? "Customer not linked"} <span className="mx-1 text-border">·</span> {project.team?.name ?? "Unassigned team"}</p><div className="mt-[19px] mb-2 flex justify-between text-xs text-muted"><span>Delivery progress</span><strong className="text-foreground">{project.progress}%</strong></div><div className="h-[7px] overflow-hidden rounded-lg bg-surface-muted" role="progressbar" aria-label={`${project.name} delivery progress`} aria-valuenow={project.progress} aria-valuemin={0} aria-valuemax={100}><span className="block h-full rounded-[inherit] bg-primary" style={{ width: `${project.progress}%` }} /></div><div className="mt-[15px] flex items-center justify-between gap-2 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><Clock3 size={14} aria-hidden="true" /> Due {formatDate(project.dueDate)}</span><span>{project._count?.cases ?? 0} cases</span><Button variant="link" size="sm" disabled={busy || !canManage || project.progress >= 100} onClick={() => onAction({ type: "project.update", projectId: project.id, input: { revision: project.revision, progress: Math.min(project.progress + 10, 100) } })}>Advance 10% <ArrowRight size={14} aria-hidden="true" /></Button></div></article>)}</div>
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
    { id: "account", label: "Account", header: "Account", sortValue: (row) => row.name, cell: (row) => <div className="flex items-center gap-[9px]"><span className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-border bg-primary-subtle text-xs font-bold text-primary" aria-hidden="true">{row.name.slice(0, 1)}</span><div className="flex min-w-40 flex-col gap-1"><strong className="text-[13px] font-semibold text-foreground">{row.name}</strong><span className="text-[11px] text-muted">{row.customerKey}</span></div></div> },
    { id: "industry", label: "Industry", header: "Industry", sortValue: (row) => row.industry, cell: (row) => row.industry },
    { id: "owner", label: "Owner", header: "Owner", sortValue: (row) => row.accountOwner?.name ?? "", cell: (row) => row.accountOwner?.name ?? "—" },
    { id: "projects", label: "Projects", header: "Projects", sortValue: (row) => row._count?.projects ?? 0, cell: (row) => row._count?.projects ?? 0 },
    { id: "cases", label: "Open cases", header: "Open cases", sortValue: (row) => row._count?.cases ?? 0, cell: (row) => row._count?.cases ?? 0 },
    { id: "contact", label: "Contact", header: "Contact", cell: (row) => <a className="text-xs text-primary hover:underline" href={`mailto:${row.email}`}>{row.email}</a> },
    { id: "actions", label: "Actions", header: "Actions", cell: (row) => canManage ? <div className="flex flex-wrap items-center gap-1.5"><Button variant="outline" size="sm" onClick={() => onEdit(row)}>Edit</Button><Button variant="ghost" size="sm" className="text-error" onClick={() => onArchive(row)}>Archive</Button></div> : <span>—</span> },
  ];
  return <><PageHeading eyebrow="CUSTOMER DIRECTORY" title="Customers" action={canManage ? <Button onClick={onCreate}><Plus size={16} /> Add customer</Button> : undefined} />
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
  return <><PageHeading eyebrow="GOVERNANCE" title="Approvals" />
    <div className="grid grid-cols-2 gap-[14px] max-[820px]:grid-cols-1">{approvals.map((item) => <article className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-[17px] shadow-[var(--shadow-sm)]" key={item.id}><div className="flex items-center justify-between gap-2.5"><span className="text-[11px] font-semibold tracking-[.05em] text-muted">{item.approvalKey}</span><StatusBadge status={item.status} /></div><h3 className="mt-3 mb-1.5 text-base font-semibold text-foreground">{item.title}</h3><p className="m-0 min-h-[42px] text-[13px] leading-[1.55] text-muted">{item.justification}</p><div className="mt-[11px] flex flex-wrap gap-[7px]"><span className="rounded-md bg-surface-muted px-2 py-[5px] text-[11px] text-muted">{titleCase(item.type)}</span>{item.case && <span className="rounded-md bg-surface-muted px-2 py-[5px] text-[11px] text-muted">{item.case.caseKey} · {item.case.title}</span>}</div><div className="mt-4 flex min-w-0 items-end gap-4 border-t border-border pt-[13px] max-[520px]:flex-wrap max-[520px]:gap-[11px]"><div className="flex min-w-0 flex-col gap-1"><small className="text-[10px] font-bold tracking-[.07em] text-muted">REQUESTED BY</small><strong className="text-xs font-semibold text-foreground">{item.requestedBy.name}</strong></div><div className="flex min-w-0 flex-col gap-1"><small className="text-[10px] font-bold tracking-[.07em] text-muted">AMOUNT</small><strong className="text-xs font-semibold text-foreground">{item.amount ? formatMoney(item.amount) : "—"}</strong></div>{item.status === "PENDING" && canDecide && item.requestedBy.id !== employeeId ? <div className="ml-auto flex items-center gap-1.5"><Button variant="outline" size="sm" disabled={busy} onClick={() => onReview({ approval: item, decision: "REJECTED" })}>Reject</Button><Button size="sm" disabled={busy} onClick={() => onReview({ approval: item, decision: "APPROVED" })}><Check size={15} aria-hidden="true" /> Approve</Button></div> : item.status === "PENDING" && item.requestedBy.id === employeeId ? <div className="ml-auto flex items-center gap-[5px] text-xs text-success">You requested this</div> : item.status === "PENDING" ? <div className="ml-auto flex items-center gap-[5px] text-xs text-success">Awaiting a manager</div> : <div className="ml-auto flex items-center gap-[5px] text-xs text-success"><Check size={15} aria-hidden="true" /> {titleCase(item.status)}</div>}</div></article>)}</div>
    {!approvals.length && <EmptyState icon={search ? Search : CheckCheck} title={search ? "No matching approvals" : "No approval requests"} description={search ? "Try another search or clear the current search." : "Requests attached to operational cases will appear here."} action={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : undefined} />}
  </>;
}

function ActivityPage({ activity, search, onClearSearch }: { activity: Activity[]; search: string; onClearSearch: () => void }) {
  return <><PageHeading eyebrow="AUDIT TRAIL" title="Activity" /><section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface px-[18px] py-[14px] shadow-[var(--shadow-sm)]"><ActivityList items={activity} emptyLabel={search ? "No matching activity records." : "No recorded changes yet."} />{search && activity.length === 0 && <div className="flex justify-center pb-[18px]"><Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button></div>}</section></>;
}

function ActivityList({ items, emptyLabel = "No recent events." }: { items: Activity[]; emptyLabel?: string }) {
  return items.length ? <div className="mt-2">{items.map((item) => <div className="flex min-h-[54px] items-center gap-[11px] border-t border-border" key={item.id}><span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary-subtle text-xs font-bold text-primary" aria-hidden="true">{item.actor?.name.slice(0, 1) ?? "O"}</span><div className="flex min-w-0 flex-1 flex-col gap-[3px]"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-foreground">{item.summary}</strong><span className="text-[11px] text-muted">{item.actor?.name ?? "Ontix"} · {titleCase(item.objectType)} · {titleCase(item.action)}</span></div><time className="shrink-0 text-[11px] text-muted" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div>)}</div> : <div className="px-3 py-[30px] text-center text-[13px] text-muted" role="status">{emptyLabel}</div>;
}

function RecordDialog({ state, customers, teams, onClose, onSubmit }: {
  state: RecordDialogState;
  customers: Customer[];
  teams: WorkspaceData["teams"];
  onClose: () => void;
  onSubmit: (command: WorkspaceCommand) => Promise<boolean>;
}) {
  const kind = state.kind;
  const editing = "record" in state && Boolean(state.record);
  const current = editing ? state.record : undefined;
  const [busy, setBusy] = useState(false);
  const title = editing ? `Edit ${kind}` : kind === "case" ? "Open a case" : kind === "project" ? "Create project" : "Add customer";
  const selectOptions = (values: string[]) => values.map((value) => <option key={value} value={value}>{titleCase(value)}</option>);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const value = (name: string) => String(values.get(name) ?? "").trim();
    let command: WorkspaceCommand;
    let validation;

    if (kind === "customer") {
      const input = { name: value("name"), industry: value("industry"), email: value("email"), phone: value("phone") };
      validation = editing ? customerPatchSchema.safeParse(input) : customerInputSchema.safeParse(input);
      if (!validation.success) {
        notify.error({ title: Object.values(toFieldErrors(validation.error.issues))[0] ?? "Check the form details and try again." });
        return;
      }
      command = editing ? { type: "customer.update", customerId: state.record!.id, input: validation.data } : { type: "customer.create", input: validation.data };
    } else if (kind === "project") {
      const input = {
        name: value("name"), description: value("description"), customerId: value("customerId"),
        teamId: value("teamId") || null,
        status: value("status") || "PLANNING", priority: value("priority") || "MEDIUM",
        startDate: value("startDate"), dueDate: value("dueDate"), budget: value("budget") || "0",
        progress: editing ? Number(value("progress")) : 0,
      };
      validation = editing
        ? projectPatchSchema.safeParse({ ...input, revision: state.record!.revision })
        : projectInputSchema.safeParse(input);
      if (!validation.success) {
        notify.error({ title: Object.values(toFieldErrors(validation.error.issues))[0] ?? "Check the form details and try again." });
        return;
      }
      command = editing ? { type: "project.update", projectId: state.record!.id, input: validation.data } : { type: "project.create", input: validation.data };
    } else {
      const input = {
        title: value("title"), description: value("description"), customerId: value("customerId"),
        priority: value("priority") || "MEDIUM", category: value("category"), slaDeadline: value("slaDeadline"),
      };
      validation = caseInputSchema.safeParse(input);
      if (!validation.success) {
        notify.error({ title: Object.values(toFieldErrors(validation.error.issues))[0] ?? "Check the form details and try again." });
        return;
      }
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
      <DialogHeader><span className="block text-[11px] font-bold tracking-[.11em] text-muted">WORKSPACE RECORD</span><DialogTitle>{title}</DialogTitle></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="grid gap-[15px]" noValidate>
        {kind === "customer" && <>
          <FormField label="Company name" required><Input name="name" placeholder="e.g. Northstar Logistics" defaultValue={current && "name" in current ? current.name : ""} required maxLength={140} /></FormField>
          <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1"><FormField label="Industry" required><Input name="industry" placeholder="Transportation" defaultValue={current && "industry" in current ? current.industry : ""} required maxLength={100} /></FormField><FormField label="Phone" required><Input name="phone" type="tel" placeholder="+1 555 010 1000" defaultValue={current && "phone" in current ? current.phone : ""} required maxLength={40} /></FormField></div>
          <FormField label="Contact email" required><Input name="email" type="email" placeholder="operations@example.test" defaultValue={current && "email" in current ? current.email : ""} required maxLength={254} /></FormField>
        </>}
        {kind === "project" && <>
          <FormField label="Project name" required><Input name="name" placeholder="e.g. Fleet visibility rollout" defaultValue={current && "name" in current ? current.name : ""} required maxLength={160} /></FormField>
          <FormField label="Description"><Textarea name="description" placeholder="What outcome will this project deliver?" defaultValue={current && "description" in current ? current.description : ""} maxLength={4000} /></FormField>
          <FormField label="Customer" required><Select name="customerId" defaultValue={current && "customerId" in current ? current.customerId : ""} required><option value="">Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></FormField>
          <FormField label="Delivery team"><Select name="teamId" defaultValue={current && "teamId" in current ? current.teamId ?? "" : ""}><option value="">Unassigned</option>{teams.filter((team) => team.isActive || team.id === (current && "teamId" in current ? current.teamId : null)).map((team) => <option key={team.id} value={team.id}>{team.name}{team.isActive ? "" : " · inactive"}</option>)}</Select></FormField>
          <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1"><FormField label="Status" required><Select name="status" defaultValue={current && "status" in current ? current.status : "PLANNING"}>{selectOptions(["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "AT_RISK"])}</Select></FormField><FormField label="Priority" required><Select name="priority" defaultValue={current && "priority" in current ? current.priority : "MEDIUM"}>{selectOptions(["LOW", "MEDIUM", "HIGH", "CRITICAL"])}</Select></FormField></div>
          <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1"><FormField label="Start date" required><Input name="startDate" type="date" defaultValue={current && "startDate" in current ? toLocalDateInput(current.startDate) : toLocalDateInput()} required /></FormField><FormField label="Due date" required><Input name="dueDate" type="date" defaultValue={current && "dueDate" in current ? toLocalDateInput(current.dueDate) : toLocalDateInput()} required /></FormField></div>
          <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1"><FormField label="Budget (USD)"><Input name="budget" type="number" min="0" step="0.01" defaultValue={current && "budget" in current ? current.budget : "0"} /></FormField>{editing && <FormField label="Progress (%)" required><Input name="progress" type="number" min="0" max="100" step="1" defaultValue={current && "progress" in current ? String(current.progress) : "0"} required /></FormField>}</div>
        </>}
        {kind === "case" && <>
          <FormField label="Case title" required><Input name="title" placeholder="Summarize the customer issue" required maxLength={180} /></FormField>
          <FormField label="Description"><Textarea name="description" placeholder="Add useful context for the team" maxLength={4000} /></FormField>
          <FormField label="Customer" required><Select name="customerId" defaultValue="" required><option value="">Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></FormField>
          <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1"><FormField label="Category" required><Input name="category" placeholder="Data quality" required maxLength={80} /></FormField><FormField label="Priority" required><Select name="priority" defaultValue="MEDIUM">{selectOptions(["LOW", "MEDIUM", "HIGH", "CRITICAL"])}</Select></FormField></div>
          <FormField label="SLA deadline" required><Input name="slaDeadline" type="datetime-local" defaultValue={toLocalDateTimeInput()} required /></FormField>
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
  const approving = state.decision === "APPROVED";
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = comment.trim();
    if (!approving && trimmed.length < 5) {
      const message = "Add a short reason of at least 5 characters before rejecting this request.";
      notify.error({ title: message });
      return;
    }
    setBusy(true);
    try {
      if (await onSubmit({ type: "approval.decide", approvalId: state.approval.id, decision: state.decision, comment: trimmed })) onClose();
    } finally {
      setBusy(false);
    }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent size="sm" showCloseButton={!busy}>
      <DialogHeader><span className="block text-[11px] font-bold tracking-[.11em] text-muted">APPROVAL {state.approval.approvalKey}</span><DialogTitle>{approving ? "Approve request?" : "Reject request?"}</DialogTitle><DialogDescription>{state.approval.title} · Requested by {state.approval.requestedBy.name}{state.approval.amount ? ` · ${formatMoney(state.approval.amount)}` : ""}</DialogDescription></DialogHeader>
      <form className="grid gap-[15px]" onSubmit={(event) => void submit(event)} noValidate>
        <FormField label={approving ? "Decision note" : "Reason for rejection"} hint={approving ? "Optional. This note is recorded in the approval history." : "A short reason is required and will be recorded in the approval history."} required={!approving}><Textarea value={comment} onChange={(event) => setComment(event.currentTarget.value)} maxLength={1000} required={!approving} placeholder={approving ? "Add context for this decision" : "Explain why this request is being rejected"} /></FormField>
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
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const amountValue = String(values.get("amount") ?? "").trim();
    const raw = {
      type: String(values.get("type") ?? "").trim(),
      title: String(values.get("title") ?? "").trim(),
      justification: String(values.get("justification") ?? "").trim(),
      ...(amountValue ? { amount: amountValue } : {}),
    };
    const validation = approvalInputSchema.safeParse(raw);
    if (!validation.success) {
      notify.error({ title: Object.values(toFieldErrors(validation.error.issues))[0] ?? "Check the form details and try again." });
      return;
    }
    setBusy(true);
    try {
      if (await onSubmit({ type: "case.requestApproval", caseId: caseRecord.id, input: validation.data })) onClose();
    } finally {
      setBusy(false);
    }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent size="md" showCloseButton={!busy}>
      <DialogHeader><span className="block text-[11px] font-bold tracking-[.11em] text-muted">{caseRecord.caseKey} · {caseRecord.title}</span><DialogTitle>Request approval</DialogTitle></DialogHeader>
      <form className="grid gap-[15px]" onSubmit={(event) => void submit(event)} noValidate>
        <FormField label="Request type" required><Input name="type" placeholder="e.g. Expense or exception" required maxLength={80} /></FormField>
        <FormField label="Title" required><Input name="title" placeholder="A concise decision request" required maxLength={180} /></FormField>
        <FormField label="Justification" required><Textarea name="justification" placeholder="Explain the business need and relevant context" required maxLength={2000} /></FormField>
        <FormField label="Amount (USD)" hint="Leave blank if this request has no monetary amount."><Input name="amount" type="number" min="0" step="0.01" placeholder="0.00" /></FormField>
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
