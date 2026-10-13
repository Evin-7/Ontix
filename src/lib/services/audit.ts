import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireActor } from "@/lib/auth/dal";

export function appendAudit(
  tx: Prisma.TransactionClient,
  input: {
    actorId: string;
    action: string;
    objectType: string;
    objectId: string;
    summary: string;
    before?: unknown;
    after?: unknown;
  },
) {
  return tx.activityEvent.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      summary: input.summary,
      beforeJson: input.before === undefined ? undefined : JSON.stringify(input.before),
      afterJson: input.after === undefined ? undefined : JSON.stringify(input.after),
    },
  });
}

export async function listAuditActivity() {
  await requireActor();
  const events = await prisma.activityEvent.findMany({
    take: 100,
    select: {
      id: true,
      action: true,
      objectType: true,
      objectId: true,
      summary: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return events;
}
