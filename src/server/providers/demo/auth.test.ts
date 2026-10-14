import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { isDemoAuthenticationConfigured, verifyDemoCredentials } from "./auth";

const salt = Buffer.from("0123456789abcdef");
const password = "A9s!qR4vZ7nP2xK8tC5mY3bD";
const key = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt-v1:16384:8:1:${salt.toString("base64url")}:${key.toString("base64url")}`;

describe("demo authentication", () => {
  beforeEach(() => {
    vi.stubEnv("ONTIX_DEMO_USERNAME", "ontix-recruiter");
    vi.stubEnv("ONTIX_DEMO_PASSWORD_HASH", passwordHash);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "private-test-token");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("accepts only the one configured account with its scrypt password", async () => {
    expect(isDemoAuthenticationConfigured()).toBe(true);
    await expect(verifyDemoCredentials("ONTIX-RECRUITER", password)).resolves.toBe(true);
    await expect(verifyDemoCredentials("someone-else", password)).resolves.toBe(false);
    await expect(verifyDemoCredentials("ontix-recruiter", "incorrect-password-value")).resolves.toBe(false);
  });

  it("fails closed for an invalid hash or missing session storage", () => {
    vi.stubEnv("ONTIX_DEMO_PASSWORD_HASH", "plaintext-password-is-not-accepted");
    expect(isDemoAuthenticationConfigured()).toBe(false);
    vi.stubEnv("ONTIX_DEMO_PASSWORD_HASH", passwordHash);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(isDemoAuthenticationConfigured()).toBe(false);
  });
});
