import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./standalone-auth", () => ({ getCurrentFoundrySession: vi.fn(), getCurrentFoundryAccessToken: vi.fn() }));
vi.mock("./client", () => ({ createFoundryClientWithTokenProvider: vi.fn() }));

import { createFoundryClientWithTokenProvider } from "./client";
import { getCurrentFoundryAccessToken, getCurrentFoundrySession } from "./standalone-auth";
import { assignFoundryCase, resolveFoundryCase, updateFoundryProjectStatus } from "./workflows";

describe("Foundry Ontology workflow actions", () => {
  const fetchOne = vi.fn();
  const applyAction = vi.fn();
  const clientSurface = vi.fn(() => ({ fetchOne, applyAction }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentFoundrySession).mockResolvedValue({
      session: { role: "MANAGER", expiresAt: Date.now() + 60_000, groupIds: ["managers"] },
      accessToken: "server-side-test-token",
    });
    vi.mocked(getCurrentFoundryAccessToken).mockResolvedValue("server-side-test-token");
    vi.mocked(createFoundryClientWithTokenProvider).mockReturnValue(clientSurface as never);
    fetchOne.mockImplementation(async (id: string) => ({
      id,
      status: id.startsWith("CASE-") ? "OPEN" : "IN_PROGRESS",
    }));
    applyAction.mockResolvedValue(undefined);
  });

  it("rejects malformed IDs before reading a Foundry session", async () => {
    const result = await resolveFoundryCase({ caseId: "" });
    expect(result).toEqual({ ok: false, code: "invalid_input", error: "Choose a valid case." });
    expect(getCurrentFoundrySession).not.toHaveBeenCalled();
  });

  it("denies an analyst role before any OSDK action call", async () => {
    vi.mocked(getCurrentFoundrySession).mockResolvedValueOnce({
      session: { role: "ANALYST", expiresAt: Date.now() + 60_000, groupIds: ["analysts"] },
      accessToken: "server-side-test-token",
    });

    const result = await updateFoundryProjectStatus({ projectId: "PRJ-1", status: "COMPLETED" });

    expect(result.ok).toBe(false);
    expect(createFoundryClientWithTokenProvider).not.toHaveBeenCalled();
  });

  it("returns an unauthenticated result without calling an action when the session is absent", async () => {
    vi.mocked(getCurrentFoundrySession).mockResolvedValueOnce(null);

    const result = await updateFoundryProjectStatus({ projectId: "PRJ-1", status: "COMPLETED" });

    expect(result).toMatchObject({ ok: false, code: "unauthenticated" });
    expect(createFoundryClientWithTokenProvider).not.toHaveBeenCalled();
    expect(applyAction).not.toHaveBeenCalled();
  });

  it("treats an expired session as an authentication error without revoking or redirecting from the dashboard", async () => {
    vi.mocked(getCurrentFoundrySession).mockResolvedValueOnce(null);

    const result = await updateFoundryProjectStatus({ projectId: "PRJ-1", status: "COMPLETED" });

    expect(result).toMatchObject({ ok: false, code: "unauthenticated" });
    expect(getCurrentFoundryAccessToken).not.toHaveBeenCalled();
    expect(applyAction).not.toHaveBeenCalled();
  });

  it("only resolves eligible cases through the generated action", async () => {
    const result = await resolveFoundryCase({ caseId: "CASE-1" });

    expect(result).toEqual({ ok: true });
    expect(fetchOne).toHaveBeenCalledWith("CASE-1");
    expect(applyAction).toHaveBeenCalledWith({ operationalCase: { id: "CASE-1", status: "OPEN" }, status: "RESOLVED" });

    fetchOne.mockResolvedValueOnce({ id: "CASE-2", status: "WAITING_APPROVAL" });
    const blocked = await resolveFoundryCase({ caseId: "CASE-2" });
    expect(blocked.ok).toBe(false);
    expect(applyAction).toHaveBeenCalledTimes(1);
  });

  it("loads both Foundry records before submitting an assignment", async () => {
    const result = await assignFoundryCase({ caseId: "CASE-3", employeeId: "EMP-4" });

    expect(result).toEqual({ ok: true });
    expect(fetchOne).toHaveBeenNthCalledWith(1, "CASE-3");
    expect(fetchOne).toHaveBeenNthCalledWith(2, "EMP-4");
    expect(applyAction).toHaveBeenCalledWith({
      employee: { id: "EMP-4", status: "IN_PROGRESS" },
      operationalCase: { id: "CASE-3", status: "OPEN" },
    });
  });

  it("restricts project status to the values supported by the saved Ontology action", async () => {
    const rejected = await updateFoundryProjectStatus({ projectId: "PRJ-1", status: "ARCHIVED" });
    expect(rejected.ok).toBe(false);
    expect(getCurrentFoundrySession).not.toHaveBeenCalled();

    const accepted = await updateFoundryProjectStatus({ projectId: "PRJ-1", status: "AT_RISK" });
    expect(accepted).toEqual({ ok: true });
    expect(applyAction).toHaveBeenCalledWith({
      project: { id: "PRJ-1", status: "IN_PROGRESS" },
      status: "AT_RISK",
    });
  });

  it("uses the current refresh-aware session token provider for every OSDK request", async () => {
    await updateFoundryProjectStatus({ projectId: "PRJ-1", status: "AT_RISK" });
    vi.mocked(getCurrentFoundryAccessToken).mockResolvedValueOnce("rotated-server-token");

    const tokenProvider = vi.mocked(createFoundryClientWithTokenProvider).mock.calls.at(-1)?.[0];
    expect(tokenProvider).toBeTypeOf("function");
    await expect(tokenProvider?.()).resolves.toBe("rotated-server-token");
  });

  it("classifies a Foundry action permission denial without ending the session", async () => {
    applyAction.mockRejectedValueOnce(Object.assign(new Error("permission denied"), {
      status: 403,
      errorCode: "PERMISSION_DENIED",
      errorInstanceId: "req-12345678",
    }));

    const result = await updateFoundryProjectStatus({ projectId: "PRJ-1", status: "AT_RISK" });

    expect(result).toMatchObject({ ok: false, code: "action_denied" });
    expect(getCurrentFoundrySession).toHaveBeenCalledTimes(1);
    expect(applyAction).toHaveBeenCalledTimes(1);
  });

  it("keeps a recoverable provider failure scoped to the action", async () => {
    applyAction.mockRejectedValueOnce(new Error("temporary transport failure"));

    const result = await updateFoundryProjectStatus({ projectId: "PRJ-1", status: "AT_RISK" });

    expect(result).toMatchObject({ ok: false, code: "provider_error" });
    expect(getCurrentFoundrySession).toHaveBeenCalledTimes(1);
  });
});
