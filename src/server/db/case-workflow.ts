import type { PrismaClient } from "../../generated/prisma/client";
import { WorkflowConflictError } from "./approval-workflow";

const ACTIVE_CASE_STATUSES = new Set(["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"]);

/**
 * Assigns a case with a revision compare-and-set. The audit event
 * is written in the same transaction, so neither change can commit alone.
 * Employee existence and actor identity are enforced by the database FKs.
 */
export async function assignCase(
  prisma: PrismaClient,
  input: { caseId: string; employeeId: string | null; actorId: string },
) {
  return prisma.$transaction(async (tx) => {
    if (input.employeeId) {
      const employee = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "employees" WHERE "id" = ${input.employeeId} AND "isActive" = TRUE FOR UPDATE
      `;
      if (employee.length === 0) throw new WorkflowConflictError("Only active employees can be assigned to a case.");
    }
    const current = await tx.operationalCase.findUnique({
      where: { id: input.caseId },
      select: {
        id: true,
        caseKey: true,
        status: true,
        revision: true,
        assignedEmployeeId: true,
      },
    });

    if (!current) throw new WorkflowConflictError("The case no longer exists.");
    if (!ACTIVE_CASE_STATUSES.has(current.status)) {
      throw new WorkflowConflictError("A completed case cannot be reassigned.");
    }
    if (current.assignedEmployeeId === input.employeeId) {
      throw new WorkflowConflictError("The case already has this assignment.");
    }

    const changed = await tx.operationalCase.updateMany({
      where: { id: current.id, status: current.status, revision: current.revision },
      data: {
        assignedEmployeeId: input.employeeId,
        revision: { increment: 1 },
      },
    });

    if (changed.count !== 1) {
      throw new WorkflowConflictError("The case changed while its assignment was being updated.");
    }

    await tx.activityEvent.create({
      data: {
        actorId: input.actorId,
        action: "CASE_ASSIGNED",
        objectType: "OperationalCase",
        objectId: current.id,
        summary: input.employeeId
          ? `${current.caseKey} assigned to employee ${input.employeeId}`
          : `${current.caseKey} unassigned`,
        beforeJson: JSON.stringify({ assignedEmployeeId: current.assignedEmployeeId }),
        afterJson: JSON.stringify({ assignedEmployeeId: input.employeeId }),
      },
    });

    return tx.operationalCase.findUniqueOrThrow({ where: { id: current.id } });
  });
}

/** Resolves an open case with a revision compare-and-set and an atomic audit event. */
export async function resolveCase(
  prisma: PrismaClient,
  input: { caseId: string; actorId: string },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.operationalCase.findUnique({
      where: { id: input.caseId },
      select: { id: true, caseKey: true, status: true, revision: true },
    });
    if (!current) throw new WorkflowConflictError("The case no longer exists.");
    if (current.status !== "OPEN" && current.status !== "IN_PROGRESS") {
      throw new WorkflowConflictError("Only open or in-progress cases can be resolved. Finish any pending approval first.");
    }

    const resolvedAt = new Date();
    const changed = await tx.operationalCase.updateMany({
      where: { id: current.id, status: current.status, revision: current.revision },
      data: { status: "RESOLVED", resolutionDate: resolvedAt, revision: { increment: 1 } },
    });
    if (changed.count !== 1) throw new WorkflowConflictError("The case changed while it was being resolved.");

    await tx.activityEvent.create({
      data: {
        actorId: input.actorId,
        action: "RESOLVED",
        objectType: "OperationalCase",
        objectId: current.id,
        summary: `${current.caseKey} resolved`,
        beforeJson: JSON.stringify({ status: current.status, revision: current.revision }),
        afterJson: JSON.stringify({ status: "RESOLVED", revision: current.revision + 1 }),
      },
    });
    return tx.operationalCase.findUniqueOrThrow({ where: { id: current.id } });
  });
}

/**
 * Raises an active case by one priority level, up to CRITICAL. Concurrent
 * updates fail by revision.
 */
export async function escalateCase(
  prisma: PrismaClient,
  input: { caseId: string; actorId: string },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.operationalCase.findUnique({
      where: { id: input.caseId },
      select: { id: true, caseKey: true, status: true, priority: true, escalationLevel: true, revision: true },
    });

    if (!current) throw new WorkflowConflictError("The case no longer exists.");
    if (!ACTIVE_CASE_STATUSES.has(current.status)) {
      throw new WorkflowConflictError("A completed case cannot be escalated.");
    }
    const nextPriority = current.priority === "LOW" ? "MEDIUM" : current.priority === "MEDIUM" ? "HIGH" : current.priority === "HIGH" ? "CRITICAL" : null;
    if (!nextPriority) {
      throw new WorkflowConflictError("The case is already at the highest priority.");
    }

    const changed = await tx.operationalCase.updateMany({
      where: { id: current.id, status: current.status, revision: current.revision },
      data: { priority: nextPriority, escalationLevel: { increment: 1 }, revision: { increment: 1 } },
    });

    if (changed.count !== 1) {
      throw new WorkflowConflictError("The case changed while it was being escalated.");
    }

    await tx.activityEvent.create({
      data: {
        actorId: input.actorId,
        action: "CASE_ESCALATED",
        objectType: "OperationalCase",
        objectId: current.id,
        summary: `${current.caseKey} escalated from ${current.priority} to ${nextPriority}`,
        beforeJson: JSON.stringify({ priority: current.priority, escalationLevel: current.escalationLevel, revision: current.revision }),
        afterJson: JSON.stringify({ priority: nextPriority, escalationLevel: current.escalationLevel + 1, revision: current.revision + 1 }),
      },
    });

    return tx.operationalCase.findUniqueOrThrow({ where: { id: current.id } });
  });
}
