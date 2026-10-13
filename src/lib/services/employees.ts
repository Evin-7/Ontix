import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireActor } from "@/lib/auth/dal";

export async function listEmployees() {
  await requireActor();
  return prisma.employee.findMany({
    where: { isActive: true },
    take: 500,
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true, role: true, teamId: true },
  });
}
