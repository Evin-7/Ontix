// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { replaceMock, refreshMock, signInEmailMock, notifyErrorMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  signInEmailMock: vi.fn(),
  notifyErrorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock, refresh: refreshMock }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: signInEmailMock } } }));
vi.mock("@/lib/notifications", () => ({ notify: { error: notifyErrorMock } }));

import { LoginForm } from "./login-form";

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

function fillLoginForm() {
  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "user@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "not-a-real-password" } });
}

describe("login failure handling", () => {
  it("shows a safe inline message for rejected credentials without duplicating it in a toast", async () => {
    signInEmailMock.mockResolvedValue({ error: { status: 401 } });
    render(<LoginForm />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in to Ontix" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Sign in could not be completed");
    expect(notifyErrorMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in to Ontix" }).hasAttribute("disabled")).toBe(false);
  });

  it("clears pending state when the sign-in service cannot be reached", async () => {
    signInEmailMock.mockRejectedValue(new Error("internal connection details"));
    render(<LoginForm />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in to Ontix" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("service could not be reached");
    expect(screen.getByRole("button", { name: "Sign in to Ontix" }).hasAttribute("disabled")).toBe(false);
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it("navigates only after a successful server response", async () => {
    signInEmailMock.mockResolvedValue({ error: null });
    render(<LoginForm />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in to Ontix" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalledOnce();
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });
});
