import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { requireActor, requirePermission } from "@/lib/auth/dal";
import { appendAudit } from "@/lib/services/audit";
import { ServiceError } from "@/lib/services/errors";
import { customerInputSchema, customerPatchSchema } from "@/lib/validation";

export async function listCustomers() {
  await requireActor();
  return prisma.customer.findMany({
    where: { archivedAt: null },
    take: 500,
    include: {
      accountOwner: { select: { id: true, name: true } },
      _count: { select: { projects: true, cases: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createCustomer(rawInput: unknown) {
  const actor = await requirePermission("customers:manage");
  const input = customerInputSchema.parse(rawInput);
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        ...input,
        accountOwnerId: input.accountOwnerId ?? actor.employeeId,
        customerKey: `CUS-${randomUUID().slice(0, 8).toUpperCase()}`,
      },
    });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "CREATED",
      objectType: "Customer",
      objectId: customer.id,
      summary: `Customer ${customer.name} created`,
      after: { name: customer.name, industry: customer.industry },
    });
    return customer;
  });
}

export async function updateCustomer(id: string, rawInput: unknown) {
  const actor = await requirePermission("customers:manage");
  const input = customerPatchSchema.parse(rawInput);
  return prisma.$transaction(async (tx) => {
    const before = await tx.customer.findUnique({ where: { id } });
    if (!before || before.archivedAt) throw new ServiceError("Customer not found.");
    const after = await tx.customer.update({ where: { id }, data: input });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "UPDATED",
      objectType: "Customer",
      objectId: id,
      summary: `Customer ${after.name} updated`,
      before,
      after,
    });
    return after;
  });
}

export async function archiveCustomer(id: string) {
  const actor = await requirePermission("customers:manage");
  return prisma.$transaction(async (tx) => {
    const before = await tx.customer.findUnique({ where: { id } });
    if (!before || before.archivedAt) throw new ServiceError("Customer not found.");
    const after = await tx.customer.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    await appendAudit(tx, {
      actorId: actor.employeeId,
      action: "ARCHIVED",
      objectType: "Customer",
      objectId: id,
      summary: `Customer ${after.name} archived`,
      before: { status: before.status },
      after: { status: after.status },
    });
    return after;
  });
}
