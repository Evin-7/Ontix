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
  input: { caseId: string; employeeId: string; actorId: string },
) {
  return prisma.$transaction(async (tx) => {
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
        summary: `${current.caseKey} assigned to ${input.employeeId}`,
        beforeJson: JSON.stringify({ assignedEmployeeId: current.assignedEmployeeId }),
        afterJson: JSON.stringify({ assignedEmployeeId: input.employeeId }),
      },
    });

    return tx.operationalCase.findUniqueOrThrow({ where: { id: current.id } });
  });
}

/**
 * Raises an active case by one priority level. The current schema and fixtures
 * use LOW/MEDIUM/HIGH, so HIGH is the defined escalation ceiling. Concurrent
 * updates fail by revision.
 */
export async function escalateCase(
  prisma: PrismaClient,
  input: { caseId: string; actorId: string },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.operationalCase.findUnique({
      where: { id: input.caseId },
      select: { id: true, caseKey: true, status: true, priority: true, revision: true },
    });

    if (!current) throw new WorkflowConflictError("The case no longer exists.");
    if (!ACTIVE_CASE_STATUSES.has(current.status)) {
      throw new WorkflowConflictError("A completed case cannot be escalated.");
    }
    const nextPriority = current.priority === "LOW" ? "MEDIUM" : current.priority === "MEDIUM" ? "HIGH" : null;
    if (current.priority === "HIGH") {
      throw new WorkflowConflictError("The case is already at the current escalation level.");
    }
    if (!nextPriority) {
      throw new WorkflowConflictError("The case priority cannot be escalated from its current value.");
    }

    const changed = await tx.operationalCase.updateMany({
      where: { id: current.id, status: current.status, revision: current.revision },
      data: { priority: nextPriority, revision: { increment: 1 } },
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
        beforeJson: JSON.stringify({ priority: current.priority, revision: current.revision }),
        afterJson: JSON.stringify({ priority: nextPriority, revision: current.revision + 1 }),
      },
    });

    return tx.operationalCase.findUniqueOrThrow({ where: { id: current.id } });
  });
}
