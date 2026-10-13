import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { FoundryConfigurationError, getFoundryApplicationUrl, getFoundryOAuthConfig } from "./config";

describe("Foundry application origin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the configured canonical origin rather than request headers", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ONTIX_APPLICATION_URL", "https://ontix.example.test");
    expect(getFoundryApplicationUrl().origin).toBe("https://ontix.example.test");
  });

  it("keeps the legacy application URL as a fallback while the demo migration is incomplete", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ONTIX_APPLICATION_URL", "");
    vi.stubEnv("BETTER_AUTH_URL", "https://legacy.example.test");
    expect(getFoundryApplicationUrl().origin).toBe("https://legacy.example.test");
  });

  it("uses a loopback default in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ONTIX_APPLICATION_URL", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
    expect(getFoundryApplicationUrl().origin).toBe("http://127.0.0.1:3000");
  });

  it("requires a secure canonical production origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ONTIX_APPLICATION_URL", "");
    vi.stubEnv("BETTER_AUTH_URL", "http://ontix.example.test");
    expect(() => getFoundryApplicationUrl()).toThrow(FoundryConfigurationError);
  });

  it("rejects a registered callback on a different origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ONTIX_APPLICATION_URL", "https://ontix.example.test");
    vi.stubEnv("FOUNDRY_STACK_URL", "https://ontix.usw-23.palantirfoundry.com");
    vi.stubEnv("FOUNDRY_CLIENT_ID", "public-client-id");
    vi.stubEnv("FOUNDRY_REDIRECT_URI", "https://attacker.example.test/api/foundry/oauth/callback");
    expect(() => getFoundryOAuthConfig()).toThrow(FoundryConfigurationError);
  });
});
