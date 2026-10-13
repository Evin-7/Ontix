import { describe, expect, it } from "vitest";
import { permissionsForRole, roleHasPermission } from "./permissions";

describe("server-side role permissions", () => {
  it("keeps account and project changes with administrators and managers", () => {
    expect(roleHasPermission("ADMINISTRATOR", "customers:manage")).toBe(true);
    expect(roleHasPermission("MANAGER", "projects:manage")).toBe(true);
    expect(roleHasPermission("DEVELOPER", "customers:manage")).toBe(false);
    expect(roleHasPermission("ANALYST", "projects:manage")).toBe(false);
  });

  it("allows developers to work cases while keeping approval decisions separate", () => {
    expect(roleHasPermission("DEVELOPER", "cases:work")).toBe(true);
    expect(roleHasPermission("DEVELOPER", "approvals:request")).toBe(true);
    expect(roleHasPermission("DEVELOPER", "approvals:decide")).toBe(false);
    expect(roleHasPermission("ANALYST", "cases:create")).toBe(false);
  });

  it("grants analysts read access only", () => {
    expect(permissionsForRole("ANALYST")).toEqual(["workspace:read"]);
  });
});
