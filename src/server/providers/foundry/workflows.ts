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
import { getCurrentFoundryAccessToken, getCurrentFoundrySession } from "./standalone-auth";

const recordIdSchema = z.string().trim().min(1).max(256);
const projectStatusSchema = z.enum(["PLANNING", "IN_PROGRESS", "AT_RISK", "COMPLETED"]);
const EDIT_ROLES = new Set(["ADMINISTRATOR", "MANAGER"]);
const CASE_ROLES = new Set(["ADMINISTRATOR", "MANAGER", "DEVELOPER"]);

export type FoundryWorkflowFailureCode =
  | "invalid_input"
  | "unauthenticated"
  | "forbidden"
  | "authorization_expired"
  | "not_found"
  | "conflict"
  | "action_denied"
  | "provider_error";

export type FoundryWorkflowResult =
  | { ok: true }
  | { ok: false; code: FoundryWorkflowFailureCode; error: string };

function roleAllowed(role: string, allowed: ReadonlySet<string>) {
  return allowed.has(role);
}

async function currentClient(allowed: ReadonlySet<string>) {
  const current = await getCurrentFoundrySession();
  if (!current) return { ok: false as const, code: "unauthenticated" as const, error: "Your Foundry session is unavailable. Sign in again, then retry." };
  if (!roleAllowed(current.session.role, allowed)) {
    return { ok: false as const, code: "forbidden" as const, error: "Your Foundry group does not allow this action." };
  }
  return {
    ok: true as const,
    client: createFoundryClientWithTokenProvider(async () => {
      const accessToken = await getCurrentFoundryAccessToken();
      if (!accessToken) throw new Error("Foundry session is no longer available.");
      return accessToken;
    }),
  };
}

type SafeProviderErrorFacts = {
  status?: number;
  errorCode?: string;
  errorName?: string;
  correlationId?: string;
};

function safeDiagnosticString(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,96}$/.test(value) ? value : undefined;
}

function safeProviderErrorFacts(error: unknown): SafeProviderErrorFacts {
  const facts: SafeProviderErrorFacts = {};
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === "object"; depth += 1) {
    const record = current as Record<string, unknown>;
    const response = record.response && typeof record.response === "object"
      ? record.response as Record<string, unknown>
      : undefined;
    if (facts.status === undefined) {
      const status = [record.status, record.statusCode, record.httpStatus, response?.status]
        .find((value) => typeof value === "number" && Number.isInteger(value));
      if (typeof status === "number") facts.status = status;
    }
    facts.errorCode ??= safeDiagnosticString(record.errorCode ?? record.error_code ?? record.code ?? record.failureCode);
    facts.errorName ??= safeDiagnosticString(record.errorName ?? record.name);
    facts.correlationId ??= safeDiagnosticString(record.errorInstanceId ?? record.error_instance_id ?? record.correlationId);
    current = record.cause;
  }
  return facts;
}

function failure(error: unknown, action: string): FoundryWorkflowResult {
  const facts = safeProviderErrorFacts(error);
  console.error("[Ontix] Foundry workflow action failed", {
    action,
    errorType: error instanceof Error ? error.name : "UnknownError",
    ...facts,
  });

  const normalizedCode = facts.errorCode?.toLowerCase() ?? "";
  if (facts.status === 401 || normalizedCode === "invalid_grant") {
    return { ok: false, code: "authorization_expired", error: "Your Foundry authorization expired. Sign in again, then retry." };
  }
  if (facts.status === 403 || /permission_denied|not_authorized|forbidden/.test(normalizedCode)) {
    return { ok: false, code: "action_denied", error: "Foundry denied this action. Check your access to the Ontology action." };
  }
  if (facts.status === 404) return { ok: false, code: "not_found", error: "The Foundry record or action is no longer available. Refresh and retry." };
  if (facts.status === 409) return { ok: false, code: "conflict", error: "The Foundry record changed. Refresh the data and retry." };
  return { ok: false, code: "provider_error", error: "Foundry could not complete this change. Refresh the data and try again." };
}

export async function resolveFoundryCase(input: { caseId: unknown }): Promise<FoundryWorkflowResult> {
  const parsed = recordIdSchema.safeParse(input.caseId);
  if (!parsed.success) return { ok: false, code: "invalid_input", error: "Choose a valid case." };

  try {
    const auth = await currentClient(CASE_ROLES);
    if (!auth.ok) return auth;
    const operationalCase = await auth.client(OperationalCase).fetchOne(parsed.data);
    if (!["OPEN", "IN_PROGRESS"].includes(operationalCase.status ?? "")) {
      return { ok: false, code: "conflict", error: "Only open or in-progress cases can be resolved." };
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
  if (!caseId.success || !employeeId.success) return { ok: false, code: "invalid_input", error: "Choose a valid case and employee." };

  try {
    const auth = await currentClient(CASE_ROLES);
    if (!auth.ok) return auth;
    const [operationalCase, employee] = await Promise.all([
      auth.client(OperationalCase).fetchOne(caseId.data),
      auth.client(Employee).fetchOne(employeeId.data),
    ]);
    if (!["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"].includes(operationalCase.status ?? "")) {
      return { ok: false, code: "conflict", error: "This case cannot be reassigned in its current status." };
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
  if (!projectId.success || !status.success) return { ok: false, code: "invalid_input", error: "Choose a valid project and status." };

  try {
    const auth = await currentClient(EDIT_ROLES);
    if (!auth.ok) return auth;
    const project = await auth.client(Project).fetchOne(projectId.data);
    await auth.client(updateProjectStatus).applyAction({ project, status: status.data });
    return { ok: true };
  } catch (error) {
    return failure(error, "UpdateProjectStatus");
  }
}
