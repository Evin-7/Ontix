import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/providers/foundry/workflows", () => ({
  assignFoundryCase: vi.fn(),
  resolveFoundryCase: vi.fn(),
  updateFoundryProjectStatus: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { assignFoundryCase, resolveFoundryCase, updateFoundryProjectStatus } from "@/server/providers/foundry/workflows";
import { POST } from "./route";

const origin = "https://ontixx.vercel.app";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/foundry/workflows`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("Foundry workflow Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assignFoundryCase).mockResolvedValue({ ok: true });
    vi.mocked(resolveFoundryCase).mockResolvedValue({ ok: true });
    vi.mocked(updateFoundryProjectStatus).mockResolvedValue({ ok: true });
  });

  it("requires a same-origin browser request", async () => {
    const response = await POST(request({ action: "resolve-case", caseId: "CASE-1" }, { origin: "https://attacker.example" }));

    expect(response.status).toBe(403);
    expect(assignFoundryCase).not.toHaveBeenCalled();
    expect(resolveFoundryCase).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects malformed action input before calling Foundry", async () => {
    const response = await POST(request({ action: "update-project-status", projectId: "PRJ-1", status: "ARCHIVED" }));

    expect(response.status).toBe(400);
    expect(updateFoundryProjectStatus).not.toHaveBeenCalled();
  });

  it("dispatches a project workflow update, revalidates the dashboard, and returns success", async () => {
    const response = await POST(request({ action: "update-project-status", projectId: "PRJ-2002", status: "IN_PROGRESS" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(updateFoundryProjectStatus).toHaveBeenCalledWith({ projectId: "PRJ-2002", status: "IN_PROGRESS" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("maps Foundry action permission errors to 403 without revalidating or redirecting", async () => {
    vi.mocked(updateFoundryProjectStatus).mockResolvedValueOnce({
      ok: false,
      code: "action_denied",
      error: "Foundry denied this action. Check your access to the Ontology action.",
    });

    const response = await POST(request({ action: "update-project-status", projectId: "PRJ-2002", status: "AT_RISK" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, code: "action_denied" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an expired-session response without revalidating the dashboard", async () => {
    vi.mocked(updateFoundryProjectStatus).mockResolvedValueOnce({
      ok: false,
      code: "authorization_expired",
      error: "Your Foundry authorization expired. Sign in again, then retry.",
    });

    const response = await POST(request({ action: "update-project-status", projectId: "PRJ-2002", status: "AT_RISK" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, code: "authorization_expired" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("keeps recoverable provider failures scoped to the requested action", async () => {
    vi.mocked(updateFoundryProjectStatus).mockResolvedValueOnce({
      ok: false,
      code: "provider_error",
      error: "Foundry could not complete this change. Refresh the data and try again.",
    });

    const response = await POST(request({ action: "update-project-status", projectId: "PRJ-2002", status: "AT_RISK" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false, code: "provider_error" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("keeps the project workflow route in Mumbai under the Vercel Hobby region setting", () => {
    const deploymentConfig = JSON.parse(readFileSync(new URL("../../../../../vercel.json", import.meta.url), "utf8")) as { regions?: string[] };
    expect(deploymentConfig.regions).toEqual(["bom1"]);
  });
});
