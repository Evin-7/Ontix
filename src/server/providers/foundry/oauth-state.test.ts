import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFoundryOAuthState, readFoundryOAuthState } from "./oauth-state";

describe("Foundry OAuth state", () => {
  beforeEach(() => vi.stubEnv("BETTER_AUTH_SECRET", "test-auth-secret-that-is-long-enough-123456"));
  afterEach(() => vi.unstubAllEnvs());

  it("creates a signed state cookie and S256 challenge bound to the local user", () => {
    const created = createFoundryOAuthState("auth-user-1", 1_000);
    expect(created.challenge).toBe(createHash("sha256").update(created.state.verifier).digest("base64url"));
    expect(readFoundryOAuthState(created.cookieValue, created.state.state, "auth-user-1", 2_000)).toEqual(created.state);
    expect(readFoundryOAuthState(created.cookieValue, created.state.state, "auth-user-2", 2_000)).toBeNull();
    expect(readFoundryOAuthState(created.cookieValue, "attacker-state", "auth-user-1", 2_000)).toBeNull();
  });

  it("rejects tampered and expired state cookies", () => {
    const created = createFoundryOAuthState("auth-user-1", 1_000);
    const [payload, signature] = created.cookieValue.split(".");
    const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    const tampered = `${payload}.${tamperedSignature}`;
    expect(readFoundryOAuthState(tampered, created.state.state, "auth-user-1", 2_000)).toBeNull();
    expect(readFoundryOAuthState(created.cookieValue, created.state.state, "auth-user-1", 601_001)).toBeNull();
  });
});
