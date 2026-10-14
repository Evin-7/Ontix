"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "AT_RISK" | "COMPLETED";
type FoundryAction = "assign-case" | "resolve-case" | "update-project-status";
const PROJECT_STATUSES = new Set<ProjectStatus>(["PLANNING", "IN_PROGRESS", "AT_RISK", "COMPLETED"]);

function projectStatusOrDefault(status: string): ProjectStatus {
  return PROJECT_STATUSES.has(status as ProjectStatus) ? status as ProjectStatus : "PLANNING";
}

async function postWorkflow(action: FoundryAction, values: Record<string, string>) {
  const response = await fetch("/api/foundry/workflows", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...values }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error ?? "Foundry could not complete this change. Try again.");
  }
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
        toast.success("Foundry saved the project workflow change.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Foundry could not complete this change. Try again.");
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
    <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
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
        toast.success("Foundry saved the case assignment.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Foundry could not complete this change. Try again.");
      }
    });
  }

  return <form className="foundry-inline-form" onSubmit={submit}>
    <select aria-label={`Assign ${caseTitle} to`} name="employeeId" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={pending}>
      {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
    </select>
    <button type="submit" disabled={pending}>{pending ? "Assigning…" : "Assign"}</button>
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
        toast.success("Foundry resolved the case.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Foundry could not complete this change. Try again.");
      }
    });
  }

  return <form onSubmit={submit}>
    <button className="foundry-quiet-button" type="submit" disabled={pending}>{pending ? "Resolving…" : "Resolve"}</button>
  </form>;
}
