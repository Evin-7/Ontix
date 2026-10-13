import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decryptFoundryToken, encryptFoundryToken } from "./crypto";

describe("Foundry OAuth token encryption", () => {
  beforeEach(() => vi.stubEnv("FOUNDRY_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64")));
  afterEach(() => vi.unstubAllEnvs());

  it("encrypts tokens with authenticated encryption and random nonces", () => {
    const first = encryptFoundryToken("access-token-example", "user-1", "access");
    const second = encryptFoundryToken("access-token-example", "user-1", "access");
    expect(first).not.toBe(second);
    expect(first).not.toContain("access-token-example");
    expect(decryptFoundryToken(first, "user-1", "access")).toBe("access-token-example");
  });

  it("rejects modified or malformed ciphertext", () => {
    const encrypted = encryptFoundryToken("access-token-example", "user-1", "access");
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    const modifiedCiphertext = `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;
    expect(() => decryptFoundryToken(`${version}.${iv}.${tag}.${modifiedCiphertext}`, "user-1", "access")).toThrow("Foundry token data is unavailable.");
    expect(() => decryptFoundryToken("not-an-encrypted-token", "user-1", "access")).toThrow("Foundry token data is unavailable.");
  });

  it("binds ciphertext to the owning account and token kind", () => {
    const encrypted = encryptFoundryToken("refresh-token-example", "user-1", "refresh");
    expect(() => decryptFoundryToken(encrypted, "user-2", "refresh")).toThrow("Foundry token data is unavailable.");
    expect(() => decryptFoundryToken(encrypted, "user-1", "access")).toThrow("Foundry token data is unavailable.");
  });

  it("encrypts one-use PKCE verifier state with a distinct context", () => {
    const encrypted = encryptFoundryToken("pkce-verifier-example", "state:sha256-digest", "state");
    expect(decryptFoundryToken(encrypted, "state:sha256-digest", "state")).toBe("pkce-verifier-example");
    expect(() => decryptFoundryToken(encrypted, "state:another-digest", "state")).toThrow("Foundry token data is unavailable.");
    expect(() => decryptFoundryToken(encrypted, "state:sha256-digest", "refresh")).toThrow("Foundry token data is unavailable.");
  });
});
