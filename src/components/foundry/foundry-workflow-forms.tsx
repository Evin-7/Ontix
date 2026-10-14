"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { notify } from "@/lib/notifications";
import { notificationCopy, workflowErrorMessage, type FoundryWorkflowAction } from "@/lib/notification-copy";

type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "AT_RISK" | "COMPLETED";
type WorkflowResult = { ok?: boolean; code?: string } | null;
class WorkflowRequestError extends Error {
  constructor(readonly code: string | undefined) { super("Workflow request failed"); }
}
const PROJECT_STATUSES = new Set<ProjectStatus>(["PLANNING", "IN_PROGRESS", "AT_RISK", "COMPLETED"]);

function projectStatusOrDefault(status: string): ProjectStatus {
  return PROJECT_STATUSES.has(status as ProjectStatus) ? status as ProjectStatus : "PLANNING";
}

async function postWorkflow(action: FoundryWorkflowAction, values: Record<string, string>) {
  const response = await fetch("/api/foundry/workflows", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...values }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json().catch(() => null) as WorkflowResult;
  if (!response.ok || !result?.ok) {
    throw new WorkflowRequestError(result?.code);
  }
}

function showWorkflowError(error: unknown, action: FoundryWorkflowAction) {
  notify.error({ title: workflowErrorMessage(error instanceof WorkflowRequestError ? error.code : undefined, action) });
}

export function FoundryProjectStatusForm({
  projectId,
  projectName,
  initialStatus,
}: {
  projectId: string;
  projectName: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(projectStatusOrDefault(initialStatus));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await postWorkflow("update-project-status", { projectId, status });
        notify.success({ title: notificationCopy.projectStatusUpdated });
        router.refresh();
      } catch (error) {
        showWorkflowError(error, "update-project-status");
      }
    });
  }

  return <form className="foundry-inline-form" onSubmit={submit}>
    <select aria-label={`New status for ${projectName}`} name="status" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} disabled={pending}>
      <option value="PLANNING">Planning</option>
      <option value="IN_PROGRESS">In progress</option>
      <option value="AT_RISK">At risk</option>
      <option value="COMPLETED">Completed</option>
    </select>
    <button type="submit" disabled={pending} aria-busy={pending || undefined}>{pending && <LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{pending ? "Saving…" : "Save"}</button>
  </form>;
}

export function FoundryCaseAssignmentForm({
  caseId,
  caseTitle,
  assignedEmployeeId,
  employees,
}: {
  caseId: string;
  caseTitle: string;
  assignedEmployeeId: string | null;
  employees: Array<{ id: string; name: string }>;
}) {
  const [employeeId, setEmployeeId] = useState(assignedEmployeeId ?? employees[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await postWorkflow("assign-case", { caseId, employeeId });
        notify.success({ title: notificationCopy.caseAssigned });
        router.refresh();
      } catch (error) {
        showWorkflowError(error, "assign-case");
      }
    });
  }

  return <form className="foundry-inline-form" onSubmit={submit}>
    <select aria-label={`Assign ${caseTitle} to`} name="employeeId" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={pending}>
      {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
    </select>
    <button type="submit" disabled={pending} aria-busy={pending || undefined}>{pending && <LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{pending ? "Assigning…" : "Assign"}</button>
  </form>;
}

export function FoundryResolveCaseButton({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await postWorkflow("resolve-case", { caseId });
        notify.success({ title: notificationCopy.caseResolved });
        router.refresh();
      } catch (error) {
        showWorkflowError(error, "resolve-case");
      }
    });
  }

  return <form onSubmit={submit}>
    <button className="foundry-quiet-button" type="submit" disabled={pending} aria-busy={pending || undefined}>{pending && <LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{pending ? "Resolving…" : "Resolve"}</button>
  </form>;
}

export function FoundryProjectStatusDialog({ projectId, projectName, initialStatus }: {
  projectId: string; projectName: string; initialStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(projectStatusOrDefault(initialStatus));
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await postWorkflow("update-project-status", { projectId, status });
        notify.success({ title: notificationCopy.projectStatusUpdated });
        setOpen(false);
        router.refresh();
      } catch (error) {
        showWorkflowError(error, "update-project-status");
      }
    });
  }
  return <>
    <Button variant="outline" size="sm" onClick={() => { setStatus(projectStatusOrDefault(initialStatus)); setOpen(true); }}>Update status</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>Update project status</DialogTitle><DialogDescription>Change the workflow status for {projectName}. The new status will be checked and saved.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="foundry-action-form">
          <label htmlFor={`project-status-${projectId}`}>New status</label>
          <select id={`project-status-${projectId}`} value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} disabled={pending}>
            <option value="PLANNING">Planning</option><option value="IN_PROGRESS">In progress</option><option value="AT_RISK">At risk</option><option value="COMPLETED">Completed</option>
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending} loadingLabel="Saving…"><Check size={15} />Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

export function FoundryCaseDetailActions({ caseId, caseTitle, assignedEmployeeId, employees, canResolve }: {
  caseId: string; caseTitle: string; assignedEmployeeId: string | null;
  employees: Array<{ id: string; name: string }>; canResolve: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(assignedEmployeeId ?? employees[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await postWorkflow("assign-case", { caseId, employeeId });
        notify.success({ title: notificationCopy.caseAssigned });
        setOpen(false); router.refresh();
      } catch (error) {
        showWorkflowError(error, "assign-case");
      }
    });
  }
  function resolve() {
    startTransition(async () => {
      try {
        await postWorkflow("resolve-case", { caseId });
        notify.success({ title: notificationCopy.caseResolved }); setResolveOpen(false); router.refresh();
      } catch (error) {
        showWorkflowError(error, "resolve-case");
      }
    });
  }
  return <div className="foundry-detail-actions">
    {employees.length > 0 && <>
      <Button variant="outline" size="sm" onClick={() => { setEmployeeId(assignedEmployeeId ?? employees[0]?.id ?? ""); setOpen(true); }}><UserRoundPlus size={15} />Assign case</Button>
      <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Assign case</DialogTitle><DialogDescription>Choose an employee to own “{caseTitle}”.</DialogDescription></DialogHeader>
          <form onSubmit={assign} className="foundry-action-form">
            <label htmlFor={`case-employee-${caseId}`}>Assigned employee</label>
            <select id={`case-employee-${caseId}`} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={pending}>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" loading={pending} loadingLabel="Assigning…">Save assignment</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>}
    {canResolve && <AlertDialog open={resolveOpen} onOpenChange={(next) => { if (!pending) setResolveOpen(next); }}>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Resolve case</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Resolve this case?</AlertDialogTitle><AlertDialogDescription>“{caseTitle}” will be marked as resolved. This action can’t be undone from Ontix.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} aria-busy={pending || undefined} onClick={(event) => { event.preventDefault(); resolve(); }}>{pending && <LoaderCircle size={15} className="mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{pending ? "Resolving…" : "Resolve case"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>}
  </div>;
}
