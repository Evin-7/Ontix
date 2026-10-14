import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

class MemoryRedis {
  values = new Map<string, string>();

  async set(key: string, value: string, options?: { nx?: boolean }) {
    if (options?.nx && this.values.has(key)) return null;
    this.values.set(key, value);
    return "OK";
  }

  async get(key: string) {
    const value = this.values.get(key);
    return value === undefined ? null : JSON.parse(value) as unknown;
  }

  async del(key: string) {
    return Number(this.values.delete(key));
  }

  async eval(_script: string, keys: string[], args: string[]) {
    const count = Number(this.values.get(keys[0]) ?? "0") + 1;
    this.values.set(keys[0], String(count));
    expect(args[0]).toBe("900");
    return count;
  }
}

const memoryRedis = new MemoryRedis();
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => memoryRedis } }));

import {
  allowDemoLoginAttempt,
  createDemoSession,
  demoSessionCookieName,
  demoSessionCookieOptions,
  readDemoSession,
  revokeDemoSession,
} from "./session-store";

describe("demo session store", () => {
  beforeEach(() => {
    memoryRedis.values.clear();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "private-test-token");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("stores a separate opaque demo session and revokes it on sign-out", async () => {
    const created = await createDemoSession();
    const [key, value] = [...memoryRedis.values.entries()][0] ?? [];

    expect(key).toMatch(/^ontix:demo:session:v1:/);
    expect(key).not.toContain(created.sessionId);
    expect(value).not.toContain("Foundry");
    expect(await readDemoSession(created.sessionId)).toEqual({ expiresAt: created.expiresAt });
    await revokeDemoSession(created.sessionId);
    expect(await readDemoSession(created.sessionId)).toBeNull();
  });

  it("uses a distinct cookie with HttpOnly, SameSite, and production Secure attributes", () => {
    expect(demoSessionCookieName()).toBe("ontix-demo");
    expect(demoSessionCookieOptions()).toMatchObject({ httpOnly: true, secure: false, sameSite: "lax", path: "/" });
    vi.stubEnv("NODE_ENV", "production");
    expect(demoSessionCookieName()).toBe("__Host-ontix-demo");
    expect(demoSessionCookieOptions()).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });

  it("rate limits repeated sign-in attempts by a hashed client address", async () => {
    const results = await Promise.all(Array.from({ length: 9 }, () => allowDemoLoginAttempt("203.0.113.10")));
    expect(results.slice(0, 8).every((result) => result.allowed)).toBe(true);
    expect(results[8]).toEqual({ allowed: false, retryAfterSeconds: 900 });
    expect([...memoryRedis.values.keys()].every((key) => !key.includes("203.0.113.10"))).toBe(true);
  });
});
