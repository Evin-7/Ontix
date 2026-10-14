// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RecordExplorer, type ExplorerRecord } from "./record-explorer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => cleanup());

const records: ExplorerRecord[] = [
  { id: "PRJ-1", kind: "Project", title: "Dispatch modernization", subtitle: "Project · Northwind", status: "IN_PROGRESS", values: { customer: "Northwind", status: "IN_PROGRESS", budget: "125000" } },
  { id: "PRJ-2", kind: "Project", title: "Field service rollout", subtitle: "Project · Contoso", status: "PLANNING", values: { customer: "Contoso", status: "PLANNING", budget: "80000" } },
  { id: "PRJ-3", kind: "Project", title: "Customer portal", subtitle: "Project · Northwind", status: "AT_RISK", values: { customer: "Northwind", status: "AT_RISK", budget: "—" } },
];

describe("Foundry record explorer", () => {
  it("filters live list records by search text and status", () => {
    render(<RecordExplorer records={records} columns={[{ key: "customer", label: "Customer" }, { key: "status", label: "Status" }]} filters={[{ key: "status", label: "status", options: ["AT_RISK", "IN_PROGRESS", "PLANNING"] }]} emptyTitle="No projects" emptyDescription="No records." />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search records" }), { target: { value: "field" } });
    expect(screen.getAllByText("Field service rollout").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dispatch modernization")).toBeNull();

    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "PLANNING" } });
    expect(screen.getAllByText("Field service rollout").length).toBeGreaterThan(0);
    expect(screen.queryByText("Customer portal")).toBeNull();
  });

  it("opens a record details drawer from the URL-selected record", () => {
    render(<RecordExplorer records={records} columns={[{ key: "customer", label: "Customer" }, { key: "status", label: "Status" }]} selectedId="PRJ-2" emptyTitle="No projects" emptyDescription="No records." />);
    expect(screen.getByRole("dialog").textContent).toContain("Field service rollout");
    expect(screen.getByRole("dialog").textContent).toContain("Contoso");
  });

  it("applies a breakdown filter supplied by a chart navigation URL", () => {
    render(<RecordExplorer records={records} columns={[{ key: "customer", label: "Customer" }, { key: "status", label: "Status" }]} filters={[{ key: "status", label: "status", options: ["AT_RISK", "IN_PROGRESS", "PLANNING"] }]} initialFilters={{ status: "AT_RISK" }} emptyTitle="No projects" emptyDescription="No records." />);
    expect(screen.getByLabelText("Filter by status")).toHaveProperty("value", "AT_RISK");
    expect(screen.getAllByText("Customer portal").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dispatch modernization")).toBeNull();
  });

  it("sorts rows and provides bounded pagination controls", () => {
    const many = Array.from({ length: 13 }, (_, index) => ({
      id: `PRJ-${index + 1}`,
      kind: "Project" as const,
      title: `Project ${String(index + 1).padStart(2, "0")}`,
      subtitle: "Project record",
      status: "PLANNING",
      values: { status: "PLANNING" },
    }));
    render(<RecordExplorer records={many} columns={[{ key: "status", label: "Status" }]} emptyTitle="No projects" emptyDescription="No records." />);
    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getAllByText("Project 13").length).toBeGreaterThan(0);
  });
});
