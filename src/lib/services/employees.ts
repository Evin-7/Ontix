import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireActor } from "@/lib/auth/dal";

export async function listEmployees() {
  await requireActor();
  return prisma.employee.findMany({
    where: { isActive: true },
    take: 500,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      title: true,
      role: true,
      teamId: true,
      team: { select: { id: true, name: true, department: true } },
      projectAssignments: {
        select: {
          project: { select: { id: true, name: true, projectKey: true, status: true } },
        },
      },
    },
  });
}
