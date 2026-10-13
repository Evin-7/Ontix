import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { requireActor, requirePermission } from "@/lib/auth/dal";
import { appendAudit } from "@/lib/services/audit";
import { caseInputSchema } from "@/lib/validation";
import { assignCase, escalateCase } from "@/server/db/case-workflow";

export async function listCases() {
  await requireActor();
  return prisma.operationalCase.findMany({
    take: 500,
    include: {
      customer: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      assignedEmployee: { select: { id: true, name: true } },
    },
    orderBy: [{ slaDeadline: "asc" }, { createdAt: "desc" }],
  });
}

export async function createCase(rawInput: unknown) {
  const actor = await requirePermission("cases:create");
  const input = caseInputSchema.parse(rawInput);
  return prisma.$transaction(async (tx) => {
    const operationalCase = await tx.operationalCase.create({
      data: { ...input, caseKey: `CASE-${randomUUID().slice(0, 8).toUpperCase()}` },
    });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "CREATED",
      objectType: "OperationalCase",
      objectId: operationalCase.id,
      summary: `Case ${operationalCase.caseKey} created`,
      after: { status: operationalCase.status, priority: operationalCase.priority },
    });
    return operationalCase;
  });
}

export async function assignOperationalCase(caseId: string, employeeId: string | null) {
  const actor = await requirePermission("cases:work");
  return assignCase(prisma, { caseId, employeeId, actorId: actor.employeeId });
}

export async function escalateOperationalCase(caseId: string) {
  const actor = await requirePermission("cases:work");
  return escalateCase(prisma, { caseId, actorId: actor.employeeId });
}
