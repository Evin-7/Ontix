import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { auth, assertAuthConfigured } from "@/lib/auth";
import { roleHasPermission, type Permission } from "@/lib/auth/permissions";
import { prisma } from "@/server/db/prisma";
import type { Role, Viewer } from "@/types/workspace";

export type Actor = Viewer & {
  authUserId: string;
  employeeId: string;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Please sign in to continue.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationDeniedError extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
    this.name = "AuthorizationDeniedError";
  }
}

const getCurrentActorCached = cache(async (): Promise<Actor | null> => {
  assertAuthConfigured();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      employee: { select: { id: true, name: true, role: true, isActive: true } },
    },
  });
  if (!user?.employee || !user.employee.isActive) return null;

  const validRoles: Role[] = ["ADMINISTRATOR", "MANAGER", "DEVELOPER", "ANALYST"];
  const role = validRoles.includes(user.employee.role as Role) ? (user.employee.role as Role) : "ANALYST";
  return {
    authUserId: user.id,
    employeeId: user.employee.id,
    name: user.employee.name || user.name,
    email: user.email,
    role,
  };
});

export function getCurrentActor() {
  return getCurrentActorCached();
}

export async function requireActor() {
  const actor = await getCurrentActor();
  if (!actor) throw new AuthenticationRequiredError();
  return actor;
}

export async function requireRole(allowed: readonly Role[]) {
  const actor = await requireActor();
  if (!allowed.includes(actor.role)) throw new AuthorizationDeniedError();
  return actor;
}

export async function requirePermission(permission: Permission) {
  const actor = await requireActor();
  if (!roleHasPermission(actor.role, permission)) throw new AuthorizationDeniedError();
  return actor;
}

export async function requireEmployeeManager() {
  return requirePermission("customers:manage");
}
