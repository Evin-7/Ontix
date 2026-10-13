import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireActor, requireRole } from "@/lib/auth/dal";
import { appendAudit } from "@/lib/services/audit";
import { ServiceError } from "@/lib/services/errors";
import { teamInputSchema, teamPatchSchema } from "@/lib/validation";

export async function listTeams() {
  await requireActor();
  return prisma.team.findMany({
    take: 200,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { employees: true, projects: true } } },
  });
}

export async function createTeam(rawInput: unknown) {
  const actor = await requireRole(["ADMINISTRATOR", "MANAGER"]);
  const input = teamInputSchema.parse(rawInput);
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.create({ data: input });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "CREATED",
      objectType: "Team",
      objectId: team.id,
      summary: `Team ${team.name} created`,
      after: { name: team.name, department: team.department },
    });
    return team;
  });
}

export async function updateTeam(id: string, rawInput: unknown) {
  const actor = await requireRole(["ADMINISTRATOR", "MANAGER"]);
  const input = teamPatchSchema.parse(rawInput);
  return prisma.$transaction(async (tx) => {
    const before = await tx.team.findUnique({ where: { id } });
    if (!before || !before.isActive) throw new ServiceError("Active team not found.");
    const changed = await tx.team.updateMany({ where: { id, isActive: true }, data: input });
    if (changed.count !== 1) throw new ServiceError("Team changed while being updated. Refresh and retry.");
    const after = await tx.team.findUniqueOrThrow({ where: { id } });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "UPDATED",
      objectType: "Team",
      objectId: id,
      summary: `Team ${after.name} updated`,
      before: { name: before.name, department: before.department, description: before.description },
      after: { name: after.name, department: after.department, description: after.description },
    });
    return after;
  });
}

export async function deactivateTeam(id: string) {
  const actor = await requireRole(["ADMINISTRATOR", "MANAGER"]);
  return prisma.$transaction(async (tx) => {
    const before = await tx.team.findUnique({ where: { id } });
    if (!before || !before.isActive) throw new ServiceError("Active team not found.");
    const changed = await tx.team.updateMany({ where: { id, isActive: true }, data: { isActive: false } });
    if (changed.count !== 1) throw new ServiceError("Team changed while being deactivated. Refresh and retry.");
    const after = await tx.team.findUniqueOrThrow({ where: { id } });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "DEACTIVATED",
      objectType: "Team",
      objectId: id,
      summary: `Team ${after.name} deactivated`,
      before: { isActive: true },
      after: { isActive: false },
    });
    return after;
  });
}

export async function activateTeam(id: string) {
  const actor = await requireRole(["ADMINISTRATOR", "MANAGER"]);
  return prisma.$transaction(async (tx) => {
    const before = await tx.team.findUnique({ where: { id } });
    if (!before || before.isActive) throw new ServiceError("Inactive team not found.");
    const changed = await tx.team.updateMany({ where: { id, isActive: false }, data: { isActive: true } });
    if (changed.count !== 1) throw new ServiceError("Team changed while being activated. Refresh and retry.");
    const after = await tx.team.findUniqueOrThrow({ where: { id } });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "ACTIVATED",
      objectType: "Team",
      objectId: id,
      summary: `Team ${after.name} activated`,
      before: { isActive: false },
      after: { isActive: true },
    });
    return after;
  });
}
