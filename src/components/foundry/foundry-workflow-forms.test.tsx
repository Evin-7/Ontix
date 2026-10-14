// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const { refreshMock, successMock, errorMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: successMock, error: errorMock } }));

import { toast } from "sonner";
import { FoundryCaseDetailActions, FoundryProjectStatusDialog, FoundryProjectStatusForm } from "./foundry-workflow-forms";
import { notificationCopy, workflowErrorMessage } from "@/lib/notification-copy";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Foundry workflow form recovery", () => {
  it("keeps the selected workflow value and the dashboard in place after an action denial", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, code: "action_denied", error: "Foundry denied this action." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<FoundryProjectStatusForm projectId="PRJ-2002" projectName="Regional Dispatch Optimization" initialStatus="PLANNING" />);

    const select = screen.getByRole("combobox", { name: "New status for Regional Dispatch Optimization" }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "IN_PROGRESS" } });
    await act(async () => {
      fireEvent.submit(select.closest("form")!);
      await Promise.resolve();
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You don’t have permission to make this change.", expect.any(Object)));
    expect(select.value).toBe("IN_PROGRESS");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/foundry/workflows", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ action: "update-project-status", projectId: "PRJ-2002", status: "IN_PROGRESS" }),
    }));
  });

  it("shows a clear success message and refreshes after the server confirms an update", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<FoundryProjectStatusForm projectId="PRJ-2002" projectName="Regional Dispatch Optimization" initialStatus="PLANNING" />);

    const select = screen.getByRole("combobox", { name: "New status for Regional Dispatch Optimization" });
    fireEvent.change(select, { target: { value: "IN_PROGRESS" } });
    await act(async () => {
      fireEvent.submit(select.closest("form")!);
      await Promise.resolve();
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(notificationCopy.projectStatusUpdated, expect.any(Object)));
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(toast).toBeDefined();
  });

  it("keeps the selected value and mounted dashboard after a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    render(<FoundryProjectStatusForm projectId="PRJ-2002" projectName="Regional Dispatch Optimization" initialStatus="PLANNING" />);

    const select = screen.getByRole("combobox", { name: "New status for Regional Dispatch Optimization" }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "AT_RISK" } });
    await act(async () => {
      fireEvent.submit(select.closest("form")!);
      await Promise.resolve();
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Unable to update the project status. Please try again.", expect.any(Object)));
    expect(select.value).toBe("AT_RISK");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("keeps the project status drawer open with the selected value after a Foundry permission denial", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, code: "action_denied", error: "Foundry denied this action." }),
    }));
    render(<FoundryProjectStatusDialog projectId="PRJ-1" projectName="Dispatch modernization" initialStatus="PLANNING" />);
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    const select = screen.getByRole("combobox", { name: "New status" }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "IN_PROGRESS" } });
    await act(async () => {
      fireEvent.submit(select.closest("form")!);
      await Promise.resolve();
    });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You don’t have permission to make this change.", expect.any(Object)));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(select.value).toBe("IN_PROGRESS");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows a pending Save spinner and prevents a duplicate workflow submission", async () => {
    let complete!: (response: { ok: boolean; json: () => Promise<{ ok: boolean }> }) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { complete = resolve; })));
    render(<FoundryProjectStatusDialog projectId="PRJ-1" projectName="Dispatch modernization" initialStatus="PLANNING" />);
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    const form = screen.getByRole("combobox", { name: "New status" }).closest("form")!;
    await act(async () => { fireEvent.submit(form); await Promise.resolve(); });
    const saveButton = screen.getByRole("button", { name: "Saving…" });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { complete({ ok: true, json: async () => ({ ok: true }) }); });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(notificationCopy.projectStatusUpdated, expect.any(Object)));
  });

  it("shows pending states for case assignment and resolution without duplicate actions", async () => {
    let complete!: (response: { ok: boolean; json: () => Promise<{ ok: boolean }> }) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { complete = resolve; })));
    render(<FoundryCaseDetailActions caseId="CASE-1" caseTitle="Test case" assignedEmployeeId="EMP-1" employees={[{ id: "EMP-1", name: "Jordan Lee" }]} canResolve />);

    fireEvent.click(screen.getByRole("button", { name: "Assign case" }));
    const assignmentForm = screen.getByRole("combobox", { name: "Assigned employee" }).closest("form")!;
    await act(async () => { fireEvent.submit(assignmentForm); await Promise.resolve(); });
    expect((screen.getByRole("button", { name: "Assigning…" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { complete({ ok: true, json: async () => ({ ok: true }) }); });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(notificationCopy.caseAssigned, expect.any(Object)));

    fireEvent.click(screen.getByRole("button", { name: "Resolve case" }));
    await act(async () => { fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Resolve case" })); await Promise.resolve(); });
    expect((screen.getByRole("button", { name: "Resolving…" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { complete({ ok: true, json: async () => ({ ok: true }) }); });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(notificationCopy.caseResolved, expect.any(Object)));
  });
});

describe("notification wording", () => {
  it("keeps common workflow failures concise and free of backend details", () => {
    expect(workflowErrorMessage("action_denied", "resolve-case")).toBe("You don’t have permission to make this change.");
    expect(workflowErrorMessage("conflict", "assign-case")).toBe("This item has changed. Refresh and try again.");
    expect(workflowErrorMessage("provider_error", "update-project-status")).toBe("Unable to update the project status. Please try again.");
  });
});
