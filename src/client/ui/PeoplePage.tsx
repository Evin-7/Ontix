"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Building2, Plus, UsersRound } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { employeeInputSchema, employeePatchSchema, teamInputSchema, teamPatchSchema } from "@/lib/validation";
import type { Employee, Team, WorkspaceCommand } from "@/types/workspace";

type PersonDialog = { kind: "employee"; record?: Employee } | { kind: "team"; record?: Team };
type Deactivation = { kind: "employee"; record: Employee } | { kind: "team"; record: Team };
type FieldErrors = Record<string, string>;

const includesSearch = (value: string, search: string) => value.toLowerCase().includes(search.trim().toLowerCase());
const titleCase = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function PeoplePage({ employees, teams, viewerEmployeeId, search, onClearSearch, canManageEmployees, canManageTeams, onAction }: {
  employees: Employee[];
  teams: Team[];
  viewerEmployeeId: string;
  search: string;
  onClearSearch: () => void;
  canManageEmployees: boolean;
  canManageTeams: boolean;
  onAction: (command: WorkspaceCommand) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<"employees" | "teams">(canManageEmployees ? "employees" : "teams");
  const [dialog, setDialog] = useState<PersonDialog | null>(null);
  const [deactivation, setDeactivation] = useState<Deactivation | null>(null);
  const [busy, setBusy] = useState(false);
  const visibleEmployees = useMemo(() => employees.filter((item) => includesSearch(`${item.employeeNumber ?? ""} ${item.name} ${item.email ?? ""} ${item.title} ${item.department ?? ""} ${item.role} ${item.team?.name ?? ""} ${item.isActive === false ? "inactive" : "active"}`, search)), [employees, search]);
  const visibleTeams = useMemo(() => teams.filter((item) => includesSearch(`${item.name} ${item.department} ${item.description} ${item.isActive ? "active" : "inactive"}`, search)), [teams, search]);

  const employeeColumns: DataTableColumn<Employee>[] = [
    { id: "name", label: "Employee", header: "Employee", sortValue: (row) => row.name, cell: (row) => <div className="primary-cell"><strong>{row.name}</strong><span>{row.employeeNumber ?? row.title}{row.email ? ` · ${row.email}` : ` · ${row.title}`}</span></div> },
    { id: "team", label: "Team", header: "Team", sortValue: (row) => row.team?.name ?? "", cell: (row) => row.team?.name ?? "Unassigned" },
    { id: "role", label: "Role", header: "Role", sortValue: (row) => row.role, cell: (row) => titleCase(row.role) },
    { id: "status", label: "Status", header: "Status", sortValue: (row) => row.isActive !== false, cell: (row) => <StatusBadge status={row.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
    { id: "actions", label: "Actions", header: "Actions", cell: (row) => canManageEmployees ? <div className="row-actions">{row.isActive !== false && <Button variant="outline" size="sm" disabled={busy} onClick={() => setDialog({ kind: "employee", record: row })}>Edit</Button>}{row.isActive !== false ? <Button variant="ghost" size="sm" disabled={busy || row.id === viewerEmployeeId} title={row.id === viewerEmployeeId ? "You cannot deactivate your own account" : undefined} onClick={() => setDeactivation({ kind: "employee", record: row })}>Deactivate</Button> : <Button variant="outline" size="sm" disabled={busy} onClick={() => void onAction({ type: "employee.activate", employeeId: row.id })}>Reactivate</Button>}</div> : <span className="muted-icon">—</span> },
  ];
  const teamColumns: DataTableColumn<Team>[] = [
    { id: "name", label: "Team", header: "Team", sortValue: (row) => row.name, cell: (row) => <div className="primary-cell"><strong>{row.name}</strong><span>{row.description || row.department}</span></div> },
    { id: "department", label: "Department", header: "Department", sortValue: (row) => row.department, cell: (row) => row.department },
    { id: "members", label: "Members", header: "Members", sortValue: (row) => row._count?.employees ?? 0, cell: (row) => (row._count?.employees ?? 0).toLocaleString() },
    { id: "projects", label: "Projects", header: "Projects", sortValue: (row) => row._count?.projects ?? 0, cell: (row) => (row._count?.projects ?? 0).toLocaleString() },
    { id: "status", label: "Status", header: "Status", sortValue: (row) => row.isActive, cell: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} /> },
    { id: "actions", label: "Actions", header: "Actions", cell: (row) => canManageTeams ? <div className="row-actions">{row.isActive && <Button variant="outline" size="sm" disabled={busy} onClick={() => setDialog({ kind: "team", record: row })}>Edit</Button>}{row.isActive ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDeactivation({ kind: "team", record: row })}>Deactivate</Button> : <Button variant="outline" size="sm" disabled={busy} onClick={() => void onAction({ type: "team.activate", teamId: row.id })}>Reactivate</Button>}</div> : <span className="muted-icon">—</span> },
  ];

  const recordCount = tab === "employees" ? visibleEmployees.length : visibleTeams.length;
  const canCreate = tab === "employees" ? canManageEmployees : canManageTeams;
  const entity = tab === "employees" ? "employee" : "team";
  const command = deactivation?.kind === "employee"
    ? { type: "employee.deactivate", employeeId: deactivation.record.id } as const
    : deactivation
      ? { type: "team.deactivate", teamId: deactivation.record.id } as const
      : null;

  return <>
    <PageHeader
      eyebrow="PEOPLE & DELIVERY"
      title="People and teams"
      description="Keep employee records and delivery teams connected to the work they support."
      actions={canCreate ? <Button onClick={() => setDialog({ kind: tab === "employees" ? "employee" : "team" })}><Plus size={16} /> Add {entity}</Button> : undefined}
    />
    <section className="panel people-panel">
      <div className="people-panel-heading">
        <div className="people-tabs" role="tablist" aria-label="People records">
          <button type="button" role="tab" aria-selected={tab === "employees"} className={`people-tab ${tab === "employees" ? "active" : ""}`} onClick={() => setTab("employees")}><UsersRound size={16} /> Employees <span>{employees.filter((item) => item.isActive !== false).length}</span></button>
          <button type="button" role="tab" aria-selected={tab === "teams"} className={`people-tab ${tab === "teams" ? "active" : ""}`} onClick={() => setTab("teams")}><Building2 size={16} /> Teams <span>{teams.filter((item) => item.isActive).length}</span></button>
        </div>
        <span className="people-record-count">{recordCount} {recordCount === 1 ? "record" : "records"}</span>
      </div>
      <div role="tabpanel" aria-label={tab === "employees" ? "Employees" : "Teams"}>
        {tab === "employees" ? <DataTable<Employee>
          caption="Employees"
          columns={employeeColumns}
          rows={visibleEmployees}
          getRowId={(row) => row.id}
          pageSize={10}
          emptyTitle={search ? "No matching employees" : "No employees yet"}
          emptyDescription={search ? "Try another search or clear the current search." : "Add an employee to connect case and project ownership to real records."}
          emptyAction={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : canManageEmployees ? <Button size="sm" onClick={() => setDialog({ kind: "employee" })}><Plus size={15} /> Add employee</Button> : undefined}
        /> : <DataTable<Team>
          caption="Teams"
          columns={teamColumns}
          rows={visibleTeams}
          getRowId={(row) => row.id}
          pageSize={10}
          emptyTitle={search ? "No matching teams" : "No teams yet"}
          emptyDescription={search ? "Try another search or clear the current search." : "Add a team to keep work grouped by its delivery organization."}
          emptyAction={search ? <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button> : canManageTeams ? <Button size="sm" onClick={() => setDialog({ kind: "team" })}><Plus size={15} /> Add team</Button> : undefined}
        />}
      </div>
      {tab === "employees" && canManageEmployees && <p className="people-note">Employee records do not create sign-in credentials. An administrator must provision login access separately.</p>}
    </section>

    {dialog && <RecordDialog state={dialog} teams={teams} onClose={() => { if (!busy) setDialog(null); }} onAction={onAction} setBusy={setBusy} />}
    {deactivation && command && <AlertDialog open onOpenChange={(open) => { if (!open && !busy) setDeactivation(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {deactivation.kind}?</AlertDialogTitle>
          <AlertDialogDescription>{deactivation.kind === "employee"
            ? `${deactivation.record.name} will lose access to Ontix, and current Ontix sessions will be revoked. Existing case, project, approval, and audit history will remain.`
            : `${deactivation.record.name} will stay linked to existing work, but the team will no longer be available for new assignments.`}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(event) => {
            event.preventDefault();
            setBusy(true);
            void onAction(command).then((success) => { if (success) setDeactivation(null); }).finally(() => setBusy(false));
          }}>{busy ? "Saving…" : "Deactivate"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>}
  </>;
}

function RecordDialog({ state, teams, onClose, onAction, setBusy }: {
  state: PersonDialog;
  teams: Team[];
  onClose: () => void;
  onAction: (command: WorkspaceCommand) => Promise<boolean>;
  setBusy: (busy: boolean) => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const editing = Boolean(state.record);
  const employee = state.kind === "employee" ? state.record as Employee | undefined : undefined;
  const team = state.kind === "team" ? state.record as Team | undefined : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const value = (name: string) => String(values.get(name) ?? "").trim();
    let command: WorkspaceCommand;
    let validation;
    if (state.kind === "employee") {
      const input = {
        employeeNumber: value("employeeNumber"), name: value("name"), email: value("email"),
        title: value("title"), department: value("department"), role: value("role"), teamId: value("teamId") || null,
      };
      validation = editing ? employeePatchSchema.safeParse(input) : employeeInputSchema.safeParse(input);
      if (!validation.success) return setErrors(toFieldErrors(validation.error.issues));
      command = editing
        ? { type: "employee.update", employeeId: employee!.id, input: validation.data }
        : { type: "employee.create", input: validation.data };
    } else {
      const input = { name: value("name"), department: value("department"), description: value("description") };
      validation = editing ? teamPatchSchema.safeParse(input) : teamInputSchema.safeParse(input);
      if (!validation.success) return setErrors(toFieldErrors(validation.error.issues));
      command = editing
        ? { type: "team.update", teamId: team!.id, input: validation.data }
        : { type: "team.create", input: validation.data };
    }
    setErrors({});
    setSaving(true);
    setBusy(true);
    try {
      if (await onAction(command)) onClose();
    } finally {
      setSaving(false);
      setBusy(false);
    }
  };

  const label = state.kind === "employee" ? "employee" : "team";
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
        <DialogDescription>{state.kind === "employee"
          ? "Keep the directory record current. Login access is provisioned separately."
          : "Set the name and department used to group related delivery work."}</DialogDescription>
      </DialogHeader>
      <form onSubmit={(event) => void submit(event)} noValidate>
        {state.kind === "employee" ? <>
          <div className="form-row"><FormField label="Employee number" required error={errors.employeeNumber}><Input name="employeeNumber" defaultValue={employee?.employeeNumber ?? ""} placeholder="OX-2048" required maxLength={32} /></FormField><FormField label="Full name" required error={errors.name}><Input name="name" defaultValue={employee?.name ?? ""} placeholder="Jordan Lee" required maxLength={140} /></FormField></div>
          <FormField label="Work email" required error={errors.email}><Input name="email" type="email" defaultValue={employee?.email ?? ""} placeholder="jordan@example.com" required maxLength={254} /></FormField>
          <div className="form-row"><FormField label="Job title" required error={errors.title}><Input name="title" defaultValue={employee?.title ?? ""} placeholder="Operations analyst" required maxLength={120} /></FormField><FormField label="Department" required error={errors.department}><Input name="department" defaultValue={employee?.department ?? ""} placeholder="Operations" required maxLength={100} /></FormField></div>
          <div className="form-row"><FormField label="Role" required error={errors.role}><Select name="role" defaultValue={employee?.role ?? "ANALYST"}>{["ADMINISTRATOR", "MANAGER", "DEVELOPER", "ANALYST"].map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</Select></FormField><FormField label="Team" error={errors.teamId}><Select name="teamId" defaultValue={employee?.teamId ?? ""}><option value="">Unassigned</option>{teams.filter((item) => item.isActive || item.id === employee?.teamId).map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " · inactive"}</option>)}</Select></FormField></div>
        </> : <>
          <FormField label="Team name" required error={errors.name}><Input name="name" defaultValue={team?.name ?? ""} placeholder="Customer Operations" required maxLength={100} /></FormField>
          <FormField label="Department" required error={errors.department}><Input name="department" defaultValue={team?.department ?? ""} placeholder="Operations" required maxLength={100} /></FormField>
          <FormField label="Description" error={errors.description}><Textarea name="description" defaultValue={team?.description ?? ""} placeholder="What this team supports" maxLength={500} /></FormField>
        </>}
        <DialogFooter><Button variant="outline" type="button" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" loading={saving} loadingLabel="Saving…">{editing ? "Save changes" : `Add ${label}`}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function toFieldErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
