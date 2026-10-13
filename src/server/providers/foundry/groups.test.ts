import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertFoundryRoleGroupsConfigured, configuredFoundryRoleGroups, resolveFoundryRole } from "./groups";

describe("Foundry group role mapping", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to deny and maps only explicitly configured group IDs", () => {
    vi.stubEnv("FOUNDRY_ADMIN_GROUP_IDS", "group-admin-1");
    vi.stubEnv("FOUNDRY_MANAGER_GROUP_IDS", "group-manager-1, group-manager-2");
    expect(resolveFoundryRole(["unmapped-group"])).toBeNull();
    expect(resolveFoundryRole(["group-manager-2"])).toBe("MANAGER");
    expect(resolveFoundryRole(["group-manager-1", "group-admin-1"])).toBe("ADMINISTRATOR");
  });

  it("rejects a group assigned to more than one Ontix role", () => {
    vi.stubEnv("FOUNDRY_ADMIN_GROUP_IDS", "duplicate-group");
    vi.stubEnv("FOUNDRY_ANALYST_GROUP_IDS", "duplicate-group");
    expect(() => configuredFoundryRoleGroups()).toThrow("A Foundry group ID is assigned to more than one Ontix role.");
  });

  it("requires at least one mapped group before enabling Foundry login", () => {
    vi.stubEnv("FOUNDRY_ADMIN_GROUP_IDS", "");
    vi.stubEnv("FOUNDRY_MANAGER_GROUP_IDS", "");
    vi.stubEnv("FOUNDRY_DEVELOPER_GROUP_IDS", "");
    vi.stubEnv("FOUNDRY_ANALYST_GROUP_IDS", "");
    expect(() => assertFoundryRoleGroupsConfigured()).toThrow("Configure at least one Foundry group ID for an Ontix role.");
  });
});
