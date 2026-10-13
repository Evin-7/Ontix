import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireActor, requirePermission } from "@/lib/auth/dal";
import { appendAudit } from "@/lib/services/audit";
import { ServiceError } from "@/lib/services/errors";
import { projectInputSchema, projectPatchSchema } from "@/lib/validation";
import { WorkflowConflictError } from "@/server/db/approval-workflow";

export async function listProjects() {
  await requireActor();
  return prisma.project.findMany({
    where: { status: { not: "ARCHIVED" } },
    take: 500,
    include: {
      customer: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      assignments: { select: { employee: { select: { id: true, name: true, title: true, role: true } } } },
      _count: { select: { assignments: true, cases: true } },
    },
    orderBy: [{ dueDate: "asc" }, { name: "asc" }],
  });
}

export async function createProject(rawInput: unknown) {
  const actor = await requirePermission("projects:manage");
  const input = projectInputSchema.parse(rawInput);
  if (input.dueDate < input.startDate) throw new ServiceError("Due date must be on or after the start date.");
  return prisma.$transaction(async (tx) => {
    if (input.teamId) {
      const team = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "teams" WHERE "id" = ${input.teamId} AND "isActive" = TRUE FOR UPDATE
      `;
      if (team.length === 0) throw new ServiceError("Choose an active delivery team or leave the project unassigned.");
    }
    const project = await tx.project.create({
      data: {
        ...input,
        projectKey: `PRJ-${randomUUID().slice(0, 8).toUpperCase()}`,
        budget: new Prisma.Decimal(input.budget),
      },
    });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "CREATED",
      objectType: "Project",
      objectId: project.id,
      summary: `Project ${project.name} created`,
      after: { status: project.status, progress: project.progress },
    });
    return project;
  });
}

export async function updateProject(id: string, rawInput: unknown) {
  const actor = await requirePermission("projects:manage");
  const { revision, ...changes } = projectPatchSchema.parse(rawInput);
  return prisma.$transaction(async (tx) => {
    const before = await tx.project.findUnique({ where: { id } });
    if (!before || before.status === "ARCHIVED") throw new WorkflowConflictError("Project not found.");
    if (changes.teamId && changes.teamId !== before.teamId) {
      const team = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "teams" WHERE "id" = ${changes.teamId} AND "isActive" = TRUE FOR UPDATE
      `;
      if (team.length === 0) throw new ServiceError("Choose an active delivery team or leave the project unassigned.");
    }
    const effectiveStart = changes.startDate ?? before.startDate;
    const effectiveDue = changes.dueDate ?? before.dueDate;
    if (effectiveDue < effectiveStart) throw new ServiceError("Due date must be on or after the start date.");
    const data = {
      ...changes,
      ...(changes.budget === undefined ? {} : { budget: new Prisma.Decimal(changes.budget) }),
      revision: { increment: 1 },
    };
    const changed = await tx.project.updateMany({ where: { id, revision }, data });
    if (changed.count !== 1) {
      throw new WorkflowConflictError("The project changed while it was being edited. Refresh and retry.");
    }
    const after = await tx.project.findUniqueOrThrow({ where: { id } });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "UPDATED",
      objectType: "Project",
      objectId: id,
      summary: `Project ${after.name} updated`,
      before: { status: before.status, progress: before.progress, revision: before.revision },
      after: { status: after.status, progress: after.progress, revision: after.revision },
    });
    return after;
  });
}

export async function archiveProject(id: string) {
  const actor = await requirePermission("projects:manage");
  return prisma.$transaction(async (tx) => {
    const before = await tx.project.findUnique({ where: { id } });
    if (!before || before.status === "ARCHIVED") throw new WorkflowConflictError("Project not found.");
    const changed = await tx.project.updateMany({
      where: { id, revision: before.revision },
      data: { status: "ARCHIVED", revision: { increment: 1 } },
    });
    if (changed.count !== 1) throw new WorkflowConflictError("The project changed while it was being archived.");
    const after = await tx.project.findUniqueOrThrow({ where: { id } });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "ARCHIVED",
      objectType: "Project",
      objectId: id,
      summary: `Project ${after.name} archived`,
      before: { status: before.status },
      after: { status: after.status },
    });
    return after;
  });
}
