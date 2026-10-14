import { afterEach, describe, expect, it, vi } from "vitest";

const { getContext } = vi.hoisted(() => ({ getContext: vi.fn() }));
vi.mock("@/server/providers/foundry/dashboard-context", () => ({ getFoundryModuleContext: getContext }));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

describe("Foundry search route", () => {
  it("searches only records from the authenticated server-side workspace and returns detail links", async () => {
    getContext.mockResolvedValue({
      session: { role: "ANALYST" },
      workspace: {
        projects: [{ id: "PRJ-1", name: "Dispatch modernization", status: "IN_PROGRESS" }],
        cases: [{ id: "CASE-1", title: "Dispatch alert", priority: "HIGH", status: "OPEN" }],
        customers: [{ id: "CUS-1", name: "Northwind", industry: "Logistics", status: "ACTIVE" }],
        employees: [{ id: "EMP-1", name: "Casey Rivera", role: "Operations Lead", email: "private@example.test" }],
        teams: [{ id: "TEAM-1", name: "Operations", department: "Field" }],
        approvals: [{ id: "APR-1", caseId: "CASE-1", requestedBy: "Morgan Lee", status: "PENDING" }],
      },
    });

    const response = await GET(new Request("https://ontix.test/api/foundry/search?q=dispatch"));
    const payload = await response.json() as { results: Array<{ id: string; type: string; href: string }> };
    expect(response.status).toBe(200);
    expect(payload.results.map(({ type }) => type)).toEqual(["Projects", "Cases"]);
    expect(payload.results[0]?.href).toBe("/projects?record=PRJ-1");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("does not issue a Foundry request for too-short search terms", async () => {
    const response = await GET(new Request("https://ontix.test/api/foundry/search?q=a"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
    expect(getContext).not.toHaveBeenCalled();
  });

  it("requires an authenticated Foundry session", async () => {
    getContext.mockResolvedValue(null);
    const response = await GET(new Request("https://ontix.test/api/foundry/search?q=case"));
    expect(response.status).toBe(401);
  });
});
