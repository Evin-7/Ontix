// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "./data-table";
import { Button } from "./button";
import { StatusBadge } from "./status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { ToastProvider } from "../providers/toast-provider";
import { ThemeToggle } from "../layout/theme-toggle";
import { notify } from "../../lib/notifications";

const { setThemeMock } = vi.hoisted(() => ({ setThemeMock: vi.fn() }));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", resolvedTheme: "dark", setTheme: setThemeMock }),
}));

vi.mock("sonner", () => ({
  Toaster: ({ position, theme }: { position: string; theme: string }) => <div data-testid="sonner-toaster" data-position={position} data-theme={theme} />,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { toast } from "sonner";

afterEach(() => cleanup());

type Row = { id: string; name: string };
const columns: DataTableColumn<Row>[] = [
  { id: "name", label: "Name", header: "Name", sortValue: (row) => row.name, cell: (row) => row.name },
];
const rows: Row[] = [
  { id: "1", name: "Beta" },
  { id: "2", name: "Alpha" },
  { id: "3", name: "Gamma" },
];

describe("shared design system", () => {
  it("sorts and paginates accessible tables", () => {
    render(<DataTable caption="Projects" columns={columns} rows={rows} getRowId={(row) => row.id} pageSize={2} />);

    fireEvent.click(screen.getByRole("button", { name: "Sort by Name ascending" }));
    expect(Array.from(document.querySelectorAll("tbody tr td")).map((cell) => cell.textContent)).toEqual(["Alpha", "Beta"]);

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(screen.getByText("Gamma")).toBeTruthy();
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
  });

  it("shows the reusable empty state when a table has no records", () => {
    render(<DataTable caption="Customers" columns={columns} rows={[]} getRowId={(row) => row.id} emptyTitle="No customers" emptyDescription="Add a customer to begin." />);
    expect(screen.getByRole("status").textContent).toContain("No customers");
  });

  it("uses semantic status tones and disables a busy button", () => {
    const { rerender } = render(<><StatusBadge status="CRITICAL" /><Button loading>Save changes</Button></>);
    expect(screen.getByText("Critical").getAttribute("data-tone")).toBe("danger");
    expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(true);
    rerender(<><StatusBadge status="APPROVED" /><Button disabled>Save changes</Button></>);
    expect(screen.getByText("Approved").getAttribute("data-tone")).toBe("success");
  });

  it("mounts the global toaster in the bottom-right and theme-matches it", () => {
    render(<ToastProvider><main>Workspace</main></ToastProvider>);
    const toaster = screen.getByTestId("sonner-toaster");
    expect(toaster.getAttribute("data-position")).toBe("bottom-right");
    expect(toaster.getAttribute("data-theme")).toBe("dark");
  });

  it("lets the user switch a persisted dark theme back to light", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(setThemeMock).toHaveBeenCalledWith("light");
  });

  it("closes accessible dialogs with Escape", () => {
    function DialogHarness() {
      const [open, setOpen] = useState(false);
      return <><Button onClick={() => setOpen(true)}>Open modal</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Accessible modal</DialogTitle><DialogDescription>Keyboard-safe dialog.</DialogDescription></DialogContent></Dialog></>;
    }
    render(<DialogHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
    expect(screen.getByRole("dialog").textContent).toContain("Accessible modal");
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps a destructive confirmation modal accessible and cancellable", () => {
    function ConfirmationHarness() {
      const [open, setOpen] = useState(false);
      return <><Button onClick={() => setOpen(true)}>Archive</Button><AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive project?</AlertDialogTitle><AlertDialogDescription>Project history will be kept.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Archive project</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
    }
    render(<ConfirmationHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Project history will be kept.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("deduplicates identical errors and keeps them visible long enough to read", () => {
    notify.error({ title: "Unable to save changes", description: "Try again." });
    notify.error({ title: "Unable to save changes", description: "Try again." });
    expect(toast.error).toHaveBeenCalledTimes(2);
    const firstOptions = vi.mocked(toast.error).mock.calls[0]?.[1];
    const secondOptions = vi.mocked(toast.error).mock.calls[1]?.[1];
    expect(firstOptions?.id).toBe(secondOptions?.id);
    expect(firstOptions?.duration).toBe(7_500);
    expect(firstOptions?.closeButton).toBe(true);
  });
});
