import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireActor, requireRole } from "@/lib/auth/dal";
import { appendAudit } from "@/lib/services/audit";
import { ServiceError } from "@/lib/services/errors";
import { employeeInputSchema, employeePatchSchema } from "@/lib/validation";

const NON_LOGIN_PASSWORD_SENTINEL = "disabled:managed:non-loginable";

export async function listEmployees() {
  const actor = await requireActor();
  const rows = await prisma.employee.findMany({
    where: actor.role === "ADMINISTRATOR" ? {} : { isActive: true },
    take: 500,
    orderBy: { name: "asc" },
    select: {
      id: true,
      employeeNumber: true,
      name: true,
      email: true,
      title: true,
      department: true,
      role: true,
      isActive: true,
      teamId: true,
      team: { select: { id: true, name: true, department: true } },
      projectAssignments: {
        select: {
          project: { select: { id: true, name: true, projectKey: true, status: true } },
        },
      },
    },
  });
  if (actor.role === "ADMINISTRATOR") return rows;
  return rows.map((employee) => ({
    id: employee.id,
    name: employee.name,
    title: employee.title,
    role: employee.role,
    teamId: employee.teamId,
    team: employee.team,
    projectAssignments: employee.projectAssignments,
  }));
}

export async function createEmployee(rawInput: unknown) {
  const actor = await requireRole(["ADMINISTRATOR"]);
  const input = employeeInputSchema.parse(rawInput);
  const teamId = input.teamId || null;

  return prisma.$transaction(async (tx) => {
    if (teamId) await requireActiveTeam(tx, teamId);
    const employee = await tx.employee.create({
      data: {
        ...input,
        email: input.email.trim().toLowerCase(),
        teamId,
        passwordHash: NON_LOGIN_PASSWORD_SENTINEL,
        isDemoAccount: false,
      },
      select: { id: true, employeeNumber: true, name: true, email: true, title: true, department: true, role: true, teamId: true, isActive: true },
    });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "CREATED",
      objectType: "Employee",
      objectId: employee.id,
      summary: `Employee ${employee.name} added`,
      after: {
        employeeNumber: employee.employeeNumber,
        name: employee.name,
        email: employee.email,
        title: employee.title,
        department: employee.department,
        role: employee.role,
        teamId: employee.teamId,
      },
    });
    return employee;
  });
}

export async function updateEmployee(id: string, rawInput: unknown) {
  const actor = await requireRole(["ADMINISTRATOR"]);
  const input = employeePatchSchema.parse(rawInput);
  if (id === actor.employeeId && input.role && input.role !== "ADMINISTRATOR") {
    throw new ServiceError("You cannot remove your own administrator role.");
  }

  return prisma.$transaction(async (tx) => {
    const before = await tx.employee.findUnique({ where: { id } });
    if (!before) throw new ServiceError("Employee not found.");
    if (input.teamId && input.teamId !== before.teamId) await requireActiveTeam(tx, input.teamId);
    if (before.role === "ADMINISTRATOR" && input.role && input.role !== "ADMINISTRATOR") {
      const otherAdministrators = await tx.employee.count({ where: { role: "ADMINISTRATOR", isActive: true, id: { not: id } } });
      if (otherAdministrators === 0) throw new ServiceError("The last active administrator must keep administrator access.");
    }
    const after = await tx.employee.update({
      where: { id },
      data: { ...input, ...(input.email === undefined ? {} : { email: input.email.trim().toLowerCase() }), ...(input.teamId === undefined ? {} : { teamId: input.teamId || null }) },
      select: { id: true, employeeNumber: true, name: true, email: true, title: true, department: true, role: true, teamId: true, isActive: true },
    });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "UPDATED",
      objectType: "Employee",
      objectId: id,
      summary: `Employee ${after.name} updated`,
      before: {
        employeeNumber: before.employeeNumber,
        name: before.name,
        email: before.email,
        title: before.title,
        department: before.department,
        role: before.role,
        teamId: before.teamId,
        isActive: before.isActive,
      },
      after: {
        employeeNumber: after.employeeNumber,
        name: after.name,
        email: after.email,
        title: after.title,
        department: after.department,
        role: after.role,
        teamId: after.teamId,
        isActive: after.isActive,
      },
    });
    return after;
  }, { isolationLevel: "Serializable" });
}

export async function deactivateEmployee(id: string) {
  const actor = await requireRole(["ADMINISTRATOR"]);
  if (id === actor.employeeId) throw new ServiceError("You cannot deactivate your own account.");
  return prisma.$transaction(async (tx) => {
    const before = await tx.employee.findUnique({ where: { id } });
    if (!before || !before.isActive) throw new ServiceError("Active employee not found.");
    if (before.role === "ADMINISTRATOR") {
      const otherAdministrators = await tx.employee.count({ where: { role: "ADMINISTRATOR", isActive: true, id: { not: id } } });
      if (otherAdministrators === 0) throw new ServiceError("The last active administrator cannot be deactivated.");
    }
    const linkedAuthUser = await tx.authUser.findUnique({ where: { employeeId: id }, select: { id: true } });
    if (linkedAuthUser) await tx.authSession.deleteMany({ where: { userId: linkedAuthUser.id } });
    const changed = await tx.employee.updateMany({ where: { id, isActive: true }, data: { isActive: false } });
    if (changed.count !== 1) throw new ServiceError("Employee changed while being deactivated. Refresh and retry.");
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "DEACTIVATED",
      objectType: "Employee",
      objectId: id,
      summary: `Employee ${before.name} deactivated`,
      before: { isActive: true, role: before.role },
      after: { isActive: false, role: before.role },
    });
    return { id, isActive: false };
  }, { isolationLevel: "Serializable" });
}

export async function activateEmployee(id: string) {
  const actor = await requireRole(["ADMINISTRATOR"]);
  return prisma.$transaction(async (tx) => {
    const before = await tx.employee.findUnique({ where: { id } });
    if (!before || before.isActive) throw new ServiceError("Inactive employee not found.");
    const changed = await tx.employee.updateMany({ where: { id, isActive: false }, data: { isActive: true } });
    if (changed.count !== 1) throw new ServiceError("Employee changed while being activated. Refresh and retry.");
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "ACTIVATED",
      objectType: "Employee",
      objectId: id,
      summary: `Employee ${before.name} activated`,
      before: { isActive: false, role: before.role },
      after: { isActive: true, role: before.role },
    });
    return { id, isActive: true };
  });
}

async function requireActiveTeam(tx: Prisma.TransactionClient, teamId: string) {
  // Serialize assignments with team deactivation so a stale activity check
  // cannot attach a new record after the team has been turned off.
  const team = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "teams" WHERE "id" = ${teamId} AND "isActive" = TRUE FOR UPDATE
  `;
  if (team.length === 0) throw new ServiceError("Choose an active team or leave the employee unassigned.");
}
