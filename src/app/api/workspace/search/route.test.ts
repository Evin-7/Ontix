import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { currentDemo } = vi.hoisted(() => ({ currentDemo: vi.fn() }));
vi.mock("@/server/providers/demo/auth", () => ({ getCurrentDemoSession: currentDemo }));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

describe("workspace search route", () => {
  it("requires a workspace session", async () => {
    currentDemo.mockResolvedValue({ cookiePresent: false, session: null });
    const response = await GET(new Request("https://ontix.test/api/workspace/search?q=fleet"));
    expect(response.status).toBe(401);
  });

  it("searches only the fictional workspace records", async () => {
    currentDemo.mockResolvedValue({ cookiePresent: true, session: { expiresAt: Date.now() + 60_000 } });
    const response = await GET(new Request("https://ontix.test/api/workspace/search?q=fleet"));
    const payload = await response.json() as { results: Array<{ type: string; title: string; href: string }> };

    expect(response.status).toBe(200);
    expect(payload.results).toContainEqual(expect.objectContaining({ type: "Projects", title: "Fleet Reliability Program", href: "/projects?record=PRJ-2001" }));
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
