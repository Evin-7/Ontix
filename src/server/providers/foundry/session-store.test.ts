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

  async getdel(key: string) {
    const value = this.values.get(key);
    this.values.delete(key);
    return value === undefined ? null : JSON.parse(value) as unknown;
  }

  async eval(script: string, keys: string[], args: string[]) {
    if (script.includes("cjson.decode")) {
      const [sessionKey, lockKey] = keys;
      const [lockId, expectedGeneration, nextSession] = args;
      if (this.values.get(lockKey) !== lockId) return 0;
      const current = this.values.get(sessionKey);
      if (!current || Number((JSON.parse(current) as { generation: number }).generation) !== Number(expectedGeneration)) {
        this.values.delete(lockKey);
        return 0;
      }
      this.values.set(sessionKey, nextSession);
      this.values.delete(lockKey);
      return 1;
    }
    if (keys.length === 1) {
      if (this.values.get(keys[0]) === args[0]) this.values.delete(keys[0]);
      return 1;
    }
    for (const key of keys) this.values.delete(key);
    return 1;
  }
}

const memoryRedis = new MemoryRedis();
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => memoryRedis } }));

import {
  consumeFoundryOAuthState,
  createFoundrySession,
  getFoundrySessionAccessToken,
  readFoundrySession,
  revokeFoundrySession,
  storeFoundryOAuthState,
} from "./session-store";

describe("Foundry shared session storage", () => {
  beforeEach(() => {
    memoryRedis.values.clear();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "private-test-token");
    vi.stubEnv("FOUNDRY_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 11).toString("base64"));
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("FOUNDRY_STACK_URL", "https://ontix.usw-23.palantirfoundry.com");
    vi.stubEnv("FOUNDRY_CLIENT_ID", "public-client-id");
    vi.stubEnv("FOUNDRY_REDIRECT_URI", "http://127.0.0.1:3000/api/foundry/oauth/callback");
    vi.stubEnv("BETTER_AUTH_URL", "http://127.0.0.1:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stores encrypted PKCE state once and consumes it only once", async () => {
    await storeFoundryOAuthState("test-state-value", "pkce-verifier-test-value");
    const [record] = [...memoryRedis.values.values()];
    expect(record).not.toContain("pkce-verifier-test-value");
    expect(await consumeFoundryOAuthState("test-state-value")).toEqual({ verifier: "pkce-verifier-test-value" });
    expect(await consumeFoundryOAuthState("test-state-value")).toBeNull();
  });

  it("stores only a digest-keyed session with encrypted tokens and retrieves the access token server-side", async () => {
    const created = await createFoundrySession({
      accessToken: "access-token-private-example",
      refreshToken: "refresh-token-private-example",
      expiresIn: 3600,
      scope: "offline_access",
    }, ["foundry-group-1"]);
    const entries = [...memoryRedis.values.entries()];
    expect(entries).toHaveLength(1);
    expect(entries[0][0]).not.toContain(created.sessionId);
    expect(entries[0][1]).not.toContain("access-token-private-example");
    expect(entries[0][1]).not.toContain("refresh-token-private-example");
    expect(await readFoundrySession(created.sessionId)).toMatchObject({ groupIds: ["foundry-group-1"] });
    expect(await getFoundrySessionAccessToken(created.sessionId)).toBe("access-token-private-example");
  });

  it("removes the session and refresh lock on local logout", async () => {
    const created = await createFoundrySession({
      accessToken: "access-token-private-example",
      refreshToken: "refresh-token-private-example",
      expiresIn: 3600,
      scope: "offline_access",
    }, ["foundry-group-1"]);
    expect(memoryRedis.values.size).toBe(1);
    await revokeFoundrySession(created.sessionId);
    expect(memoryRedis.values.size).toBe(0);
    expect(await readFoundrySession(created.sessionId)).toBeNull();
  });

  it("serializes rotating refresh tokens and persists the replacement before returning", async () => {
    const created = await createFoundrySession({
      accessToken: "access-token-expired-example",
      refreshToken: "refresh-token-original-example",
      expiresIn: 3600,
      scope: "offline_access",
    }, ["foundry-group-1"]);
    const [sessionKey, serialized] = [...memoryRedis.values.entries()][0];
    const stored = JSON.parse(serialized) as { accessTokenExpiresAt: number; generation: number };
    stored.accessTokenExpiresAt = Date.now() - 1;
    memoryRedis.values.set(sessionKey, JSON.stringify(stored));
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("refresh-token-original-example");
      return Response.json({
        access_token: "access-token-rotated-example",
        refresh_token: "refresh-token-rotated-example",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "offline_access",
      });
    });
    vi.stubGlobal("fetch", fetch);

    const values = await Promise.all([
      getFoundrySessionAccessToken(created.sessionId),
      getFoundrySessionAccessToken(created.sessionId),
    ]);

    expect(values).toEqual(["access-token-rotated-example", "access-token-rotated-example"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const refreshed = JSON.parse(memoryRedis.values.get(sessionKey)!) as { generation: number; encryptedRefreshToken: string };
    expect(refreshed.generation).toBe(1);
    expect(refreshed.encryptedRefreshToken).not.toContain("refresh-token-rotated-example");
  });
});
