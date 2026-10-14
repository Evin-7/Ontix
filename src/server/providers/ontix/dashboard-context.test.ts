import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentDemoSession: vi.fn(),
  getCurrentFoundrySession: vi.fn(),
  getFoundryWorkspaceWithToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/providers/demo/auth", () => ({ getCurrentDemoSession: mocks.getCurrentDemoSession }));
vi.mock("@/server/providers/foundry/standalone-auth", () => ({ getCurrentFoundrySession: mocks.getCurrentFoundrySession }));
vi.mock("@/server/providers/foundry/workspace", async () => {
  const actual = await vi.importActual<typeof import("@/server/providers/foundry/workspace")>("@/server/providers/foundry/workspace");
  return { ...actual, getFoundryWorkspaceWithToken: mocks.getFoundryWorkspaceWithToken };
});

import { getOntixModuleContext } from "./dashboard-context";

describe("workspace provider isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentDemoSession.mockResolvedValue({ cookiePresent: true, session: { expiresAt: Date.now() + 60_000 } });
    mocks.getCurrentFoundrySession.mockResolvedValue({ session: { role: "MANAGER" }, accessToken: "never-used-for-demo" });
  });

  it("uses only fictional data for a demo session and never loads Foundry", async () => {
    const context = await getOntixModuleContext("overview");

    expect(context?.mode).toBe("demo");
    expect(context?.session.role).toBe("DEMO");
    expect(context?.workspace.totals).toEqual({ customers: 4, projects: 5, employees: 8, teams: 3, cases: 8, approvals: 4 });
    expect(mocks.getCurrentFoundrySession).not.toHaveBeenCalled();
    expect(mocks.getFoundryWorkspaceWithToken).not.toHaveBeenCalled();
  });

  it("does not fall through to Foundry when a demo cookie is present but expired", async () => {
    mocks.getCurrentDemoSession.mockResolvedValueOnce({ cookiePresent: true, session: null });

    await expect(getOntixModuleContext("overview")).resolves.toBeNull();
    expect(mocks.getCurrentFoundrySession).not.toHaveBeenCalled();
    expect(mocks.getFoundryWorkspaceWithToken).not.toHaveBeenCalled();
  });

  it("keeps the existing Foundry provider for requests without a demo cookie", async () => {
    const workspace = { customers: [], projects: [], employees: [], teams: [], cases: [], approvals: [], totals: {}, hasMore: {}, checkedAt: "2026-10-14T00:00:00.000Z" };
    mocks.getCurrentDemoSession.mockResolvedValueOnce({ cookiePresent: false, session: null });
    mocks.getFoundryWorkspaceWithToken.mockResolvedValueOnce(workspace);

    const context = await getOntixModuleContext("overview");

    expect(context?.mode).toBe("foundry");
    expect(mocks.getFoundryWorkspaceWithToken).toHaveBeenCalledWith("never-used-for-demo", "overview");
  });
});
