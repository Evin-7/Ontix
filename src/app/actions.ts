"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { auth, assertAuthConfigured } from "@/lib/auth";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
} from "@/lib/auth/dal";
import { archiveCustomer, createCustomer, updateCustomer } from "@/lib/services/customers";
import { decideApprovalRequest, requestApprovalForCase } from "@/lib/services/approvals";
import { assignOperationalCase, createCase, escalateOperationalCase } from "@/lib/services/cases";
import { archiveProject, createProject, updateProject } from "@/lib/services/projects";
import { ServiceError } from "@/lib/services/errors";
import { WorkflowConflictError } from "@/server/db/approval-workflow";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const idSchema = z.string().trim().min(1).max(128);
const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("customer.create"), input: z.unknown() }),
  z.object({ type: z.literal("customer.update"), customerId: idSchema, input: z.unknown() }),
  z.object({ type: z.literal("customer.archive"), customerId: idSchema }),
  z.object({ type: z.literal("project.create"), input: z.unknown() }),
  z.object({ type: z.literal("project.update"), projectId: idSchema, input: z.unknown() }),
  z.object({ type: z.literal("project.archive"), projectId: idSchema }),
  z.object({ type: z.literal("case.create"), input: z.unknown() }),
  z.object({ type: z.literal("case.assign"), caseId: idSchema, employeeId: idSchema }),
  z.object({ type: z.literal("case.escalate"), caseId: idSchema }),
  z.object({ type: z.literal("case.requestApproval"), caseId: idSchema, input: z.unknown() }),
  z.object({ type: z.literal("approval.decide"), approvalId: idSchema, decision: z.enum(["APPROVED", "REJECTED"]), comment: z.string().trim().max(1000) }),
]);

export type ActionResult = { ok: true } | { ok: false; error: string };

function publicError(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Check the submitted fields.";
  if (error instanceof AuthenticationRequiredError) return "Your session has expired. Sign in again.";
  if (error instanceof AuthorizationDeniedError) return error.message;
  if (error instanceof WorkflowConflictError || error instanceof ServiceError) return error.message;
  return "The request could not be completed. Try again.";
}

export async function runWorkspaceCommand(rawCommand: unknown): Promise<ActionResult> {
  const parsed = commandSchema.safeParse(rawCommand);
  if (!parsed.success) return { ok: false, error: "The request is invalid." };

  try {
    const command = parsed.data;
    switch (command.type) {
      case "customer.create":
        await createCustomer(command.input);
        break;
      case "customer.update":
        await updateCustomer(command.customerId, command.input);
        break;
      case "customer.archive":
        await archiveCustomer(command.customerId);
        break;
      case "project.create":
        await createProject(command.input);
        break;
      case "project.update":
        await updateProject(command.projectId, command.input);
        break;
      case "project.archive":
        await archiveProject(command.projectId);
        break;
      case "case.create":
        await createCase(command.input);
        break;
      case "case.assign":
        await assignOperationalCase(command.caseId, command.employeeId);
        break;
      case "case.escalate":
        await escalateOperationalCase(command.caseId);
        break;
      case "case.requestApproval":
        await requestApprovalForCase(command.caseId, command.input);
        break;
      case "approval.decide":
        await decideApprovalRequest(command.approvalId, {
          decision: command.decision,
          comment: command.comment,
        });
        break;
    }
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: publicError(error) };
  }
}

export async function signOutAction() {
  assertAuthConfigured();
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
