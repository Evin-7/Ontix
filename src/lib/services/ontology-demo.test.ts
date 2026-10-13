import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireActor: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    customer: { findFirst: vi.fn() },
  },
}));
vi.mock("@/server/providers/provider-mode", () => ({
  requireNeonDemoProvider: vi.fn(() => {
    if (process.env.DATA_PROVIDER === "foundry") throw new Error("Foundry is not connected");
  }),
}));

import { queryOntologyDemoObject } from "@/lib/services/ontology-demo";
import { prisma } from "@/server/db/prisma";
import { requireActor } from "@/lib/auth/dal";

describe("Ontology-style demo relationship queries", () => {
  beforeEach(() => {
    vi.stubEnv("DATA_PROVIDER", "neon-demo");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns connected Neon-backed customer objects after authentication", async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      id: "customer-1",
      customerKey: "CUS-001",
      name: "Northwind Logistics",
      industry: "Transport",
      status: "ACTIVE",
      archivedAt: null,
      accountOwner: { id: "employee-1", name: "Sam Lee", title: "Account Lead", role: "MANAGER" },
      projects: [{ id: "project-1", projectKey: "PRJ-001", name: "Fleet Refresh", status: "ACTIVE" }],
      cases: [{ id: "case-1", caseKey: "CASE-001", title: "Dispatch delay", status: "OPEN" }],
    } as never);

    const result = await queryOntologyDemoObject({ type: "Customer", id: "customer-1" });

    expect(requireActor).toHaveBeenCalledOnce();
    expect(result.object).toMatchObject({ type: "Customer", id: "customer-1", title: "Northwind Logistics" });
    expect(result.relationships.map(({ label }) => label)).toEqual(["Account owner", "Projects", "Operational cases"]);
    expect(result.relationships[1]?.objects[0]).toMatchObject({ type: "Project", id: "project-1", title: "Fleet Refresh" });
  });

  it("does not query Neon when Foundry mode is selected", async () => {
    vi.stubEnv("DATA_PROVIDER", "foundry");

    await expect(queryOntologyDemoObject({ type: "Customer", id: "customer-1" })).rejects.toThrow("Foundry is not connected");

    expect(requireActor).not.toHaveBeenCalled();
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
  });

  it("rejects unknown object types before reaching the database", async () => {
    await expect(queryOntologyDemoObject({ type: "Unsupported", id: "record-1" })).rejects.toThrow();
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
  });
});
