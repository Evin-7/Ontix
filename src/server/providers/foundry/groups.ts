import "server-only";

import { getFoundryOAuthConfig } from "./config";

export const FOUNDRY_ROLE_ENV = {
  ADMINISTRATOR: "FOUNDRY_ADMIN_GROUP_IDS",
  MANAGER: "FOUNDRY_MANAGER_GROUP_IDS",
  DEVELOPER: "FOUNDRY_DEVELOPER_GROUP_IDS",
  ANALYST: "FOUNDRY_ANALYST_GROUP_IDS",
} as const;

export type FoundryRole = keyof typeof FOUNDRY_ROLE_ENV;

const ROLE_ORDER: readonly FoundryRole[] = ["ADMINISTRATOR", "MANAGER", "DEVELOPER", "ANALYST"];

export class FoundryGroupAuthorizationError extends Error {
  constructor(message = "Your Foundry account is not assigned to an Ontix access group.") {
    super(message);
    this.name = "FoundryGroupAuthorizationError";
  }
}

export class FoundryGroupServiceError extends Error {
  constructor(message = "Foundry group membership could not be checked. Try again later.") {
    super(message);
    this.name = "FoundryGroupServiceError";
  }
}

function parseGroupIds(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function configuredFoundryRoleGroups() {
  const entries = ROLE_ORDER.flatMap((role) =>
    parseGroupIds(process.env[FOUNDRY_ROLE_ENV[role]]).map((id) => ({ role, id })),
  );
  const seen = new Set<string>();
  for (const { id } of entries) {
    if (seen.has(id)) throw new Error("A Foundry group ID is assigned to more than one Ontix role.");
    seen.add(id);
  }
  return entries;
}

export function resolveFoundryRole(groupIds: readonly string[]): FoundryRole | null {
  const memberships = new Set(groupIds);
  const mapping = configuredFoundryRoleGroups();
  for (const role of ROLE_ORDER) {
    if (mapping.some((entry) => entry.role === role && memberships.has(entry.id))) return role;
  }
  return null;
}

export function assertFoundryRoleGroupsConfigured() {
  const groups = configuredFoundryRoleGroups();
  if (groups.length === 0) throw new Error("Configure at least one Foundry group ID for an Ontix role.");
  return groups;
}

export async function getCurrentFoundryGroupIds(accessToken: string): Promise<string[]> {
  const { stackUrl } = getFoundryOAuthConfig();
  const endpoint = new URL("/api/v2/admin/groups/listCurrent?preview=true", stackUrl);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new FoundryGroupServiceError();
  }
  if (!response.ok) throw new FoundryGroupServiceError();
  const payload = await response.json().catch(() => null) as unknown;
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).data)) {
    throw new FoundryGroupServiceError();
  }
  const groups = (payload as { data: unknown[] }).data;
  const ids: string[] = [];
  for (const group of groups) {
    if (!group || typeof group !== "object") throw new FoundryGroupServiceError();
    const id = (group as Record<string, unknown>).id;
    if (typeof id !== "string" || id.length === 0 || id.length > 512) throw new FoundryGroupServiceError();
    ids.push(id);
  }
  return [...new Set(ids)];
}
