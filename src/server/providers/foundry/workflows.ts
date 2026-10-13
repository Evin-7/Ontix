import "server-only";

import {
  assignCaseToEmployee,
  Employee,
  OperationalCase,
  Project,
  updateCaseStatus,
  updateProjectStatus,
} from "@ontix-web-integration/sdk";
import { z } from "zod";
import { createFoundryClientWithTokenProvider } from "./client";
import { getCurrentFoundrySession } from "./standalone-auth";

const recordIdSchema = z.string().trim().min(1).max(256);
const projectStatusSchema = z.enum(["PLANNING", "IN_PROGRESS", "AT_RISK", "COMPLETED"]);
const EDIT_ROLES = new Set(["ADMINISTRATOR", "MANAGER"]);
const CASE_ROLES = new Set(["ADMINISTRATOR", "MANAGER", "DEVELOPER"]);

export type FoundryWorkflowResult = { ok: true } | { ok: false; error: string };

function roleAllowed(role: string, allowed: ReadonlySet<string>) {
  return allowed.has(role);
}

async function currentClient(allowed: ReadonlySet<string>) {
  const current = await getCurrentFoundrySession();
  if (!current) return { ok: false as const, error: "Sign in with Foundry to continue." };
  if (!roleAllowed(current.session.role, allowed)) {
    return { ok: false as const, error: "Your Foundry group does not allow this action." };
  }
  return { ok: true as const, client: createFoundryClientWithTokenProvider(async () => current.accessToken) };
}

function failure(error: unknown, action: string): FoundryWorkflowResult {
  console.error("[Ontix] Foundry workflow action failed", {
    action,
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  return { ok: false, error: "Foundry could not complete this change. Refresh the data and try again." };
}

export async function resolveFoundryCase(input: { caseId: unknown }): Promise<FoundryWorkflowResult> {
  const parsed = recordIdSchema.safeParse(input.caseId);
  if (!parsed.success) return { ok: false, error: "Choose a valid case." };

  try {
    const auth = await currentClient(CASE_ROLES);
    if (!auth.ok) return { ok: false, error: auth.error };
    const operationalCase = await auth.client(OperationalCase).fetchOne(parsed.data);
    if (!["OPEN", "IN_PROGRESS"].includes(operationalCase.status ?? "")) {
      return { ok: false, error: "Only open or in-progress cases can be resolved." };
    }
    await auth.client(updateCaseStatus).applyAction({ operationalCase, status: "RESOLVED" });
    return { ok: true };
  } catch (error) {
    return failure(error, "UpdateCaseStatus");
  }
}

export async function assignFoundryCase(input: { caseId: unknown; employeeId: unknown }): Promise<FoundryWorkflowResult> {
  const caseId = recordIdSchema.safeParse(input.caseId);
  const employeeId = recordIdSchema.safeParse(input.employeeId);
  if (!caseId.success || !employeeId.success) return { ok: false, error: "Choose a valid case and employee." };

  try {
    const auth = await currentClient(CASE_ROLES);
    if (!auth.ok) return { ok: false, error: auth.error };
    const [operationalCase, employee] = await Promise.all([
      auth.client(OperationalCase).fetchOne(caseId.data),
      auth.client(Employee).fetchOne(employeeId.data),
    ]);
    if (!["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"].includes(operationalCase.status ?? "")) {
      return { ok: false, error: "This case cannot be reassigned in its current status." };
    }
    await auth.client(assignCaseToEmployee).applyAction({ employee, operationalCase });
    return { ok: true };
  } catch (error) {
    return failure(error, "AssignCaseToEmployee");
  }
}

export async function updateFoundryProjectStatus(input: { projectId: unknown; status: unknown }): Promise<FoundryWorkflowResult> {
  const projectId = recordIdSchema.safeParse(input.projectId);
  const status = projectStatusSchema.safeParse(input.status);
  if (!projectId.success || !status.success) return { ok: false, error: "Choose a valid project and status." };

  try {
    const auth = await currentClient(EDIT_ROLES);
    if (!auth.ok) return { ok: false, error: auth.error };
    const project = await auth.client(Project).fetchOne(projectId.data);
    await auth.client(updateProjectStatus).applyAction({ project, status: status.data });
    return { ok: true };
  } catch (error) {
    return failure(error, "UpdateProjectStatus");
  }
}
