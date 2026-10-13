import type { Role } from "../../types/workspace";

export type Permission =
  | "workspace:read"
  | "customers:manage"
  | "projects:manage"
  | "cases:create"
  | "cases:work"
  | "approvals:request"
  | "approvals:decide";

const grants: Record<Permission, readonly Role[]> = {
  "workspace:read": ["ADMINISTRATOR", "MANAGER", "DEVELOPER", "ANALYST"],
  "customers:manage": ["ADMINISTRATOR", "MANAGER"],
  "projects:manage": ["ADMINISTRATOR", "MANAGER"],
  "cases:create": ["ADMINISTRATOR", "MANAGER", "DEVELOPER"],
  "cases:work": ["ADMINISTRATOR", "MANAGER", "DEVELOPER"],
  "approvals:request": ["ADMINISTRATOR", "MANAGER", "DEVELOPER"],
  "approvals:decide": ["ADMINISTRATOR", "MANAGER"],
};

export function roleHasPermission(role: Role, permission: Permission) {
  return grants[permission].includes(role);
}

export function permissionsForRole(role: Role) {
  return (Object.keys(grants) as Permission[]).filter((permission) => roleHasPermission(role, permission));
}
