// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { refreshMock, successMock, errorMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: successMock, error: errorMock } }));

import { toast } from "sonner";
import { FoundryProjectStatusForm } from "./foundry-workflow-forms";

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

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Foundry denied this action."));
    expect(select.value).toBe("IN_PROGRESS");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/foundry/workflows", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ action: "update-project-status", projectId: "PRJ-2002", status: "IN_PROGRESS" }),
    }));
  });

  it("toasts success and refreshes the Foundry dashboard after a saved update", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<FoundryProjectStatusForm projectId="PRJ-2002" projectName="Regional Dispatch Optimization" initialStatus="PLANNING" />);

    const select = screen.getByRole("combobox", { name: "New status for Regional Dispatch Optimization" });
    fireEvent.change(select, { target: { value: "IN_PROGRESS" } });
    await act(async () => {
      fireEvent.submit(select.closest("form")!);
      await Promise.resolve();
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Foundry saved the project workflow change."));
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

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("network unavailable"));
    expect(select.value).toBe("AT_RISK");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });
});
