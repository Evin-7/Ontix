import { describe, expect, it } from "vitest";
import { buildOverviewCharts, countBreakdown } from "./overview-metrics";

describe("overview metrics", () => {
  it("counts only supplied Foundry records and keeps unknown values visible", () => {
    expect(countBreakdown([{ status: "OPEN" }, { status: "OPEN" }, { status: "" }], (row) => row.status, { OPEN: "#000" })).toEqual([
      { value: "OPEN", label: "Open", count: 2, color: "#000" },
      { value: "UNKNOWN", label: "Unknown", count: 1, color: "#94a3b8" },
    ]);
  });

  it("builds clickable project, case, and approval breakdowns from real object fields", () => {
    const charts = buildOverviewCharts({
      projects: [{ status: "AT_RISK" }, { status: "COMPLETED" }],
      cases: [{ priority: "HIGH", status: "OPEN" }, { priority: "LOW", status: "RESOLVED" }],
      approvals: [{ status: "PENDING" }, { status: "APPROVED" }],
    });

    expect(charts.map(({ title }) => title)).toEqual(["Project status", "Case priority", "Case status", "Approval status"]);
    expect(charts[0]).toMatchObject({ href: "/projects", filterKey: "status" });
    expect(charts[0].data.find(({ value }) => value === "AT_RISK")).toMatchObject({ count: 1 });
    expect(charts[1]).toMatchObject({ href: "/cases", filterKey: "priority" });
    expect(charts[1].data.find(({ value }) => value === "HIGH")).toMatchObject({ count: 1 });
    expect(charts[2]).toMatchObject({ href: "/cases", filterKey: "status" });
    expect(charts[2].data.find(({ value }) => value === "OPEN")).toMatchObject({ count: 1 });
    expect(charts[3]).toMatchObject({ href: "/approvals", filterKey: "status" });
    expect(charts[3].data.find(({ value }) => value === "APPROVED")).toMatchObject({ count: 1 });
  });
});
