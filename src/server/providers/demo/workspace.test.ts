import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDemoWorkspace } from "./workspace";

describe("fictional demo workspace", () => {
  it("contains separate fictional records for all six Ontology object types", () => {
    const workspace = getDemoWorkspace();
    expect(workspace.totals).toEqual({ customers: 4, projects: 5, employees: 8, teams: 3, cases: 8, approvals: 4 });
    expect(workspace.customers).toHaveLength(4);
    expect(workspace.projects).toHaveLength(5);
    expect(workspace.employees).toHaveLength(8);
    expect(workspace.teams).toHaveLength(3);
    expect(workspace.cases).toHaveLength(8);
    expect(workspace.approvals).toHaveLength(4);
    expect(workspace.employees.every((employee) => employee.email.endsWith("@example.com"))).toBe(true);
  });

  it("returns isolated data copies", () => {
    const first = getDemoWorkspace();
    first.projects[0]!.name = "Changed in one request";
    expect(getDemoWorkspace().projects[0]?.name).toBe("Fleet Reliability Program");
  });
});
