import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getFoundryIntegrationStatus } from "@/server/providers/foundry-status";

describe("Foundry integration status", () => {
  beforeEach(() => {
    vi.stubEnv("DATA_PROVIDER", "neon-demo");
    vi.stubEnv("FOUNDRY_STACK_URL", "");
    vi.stubEnv("FOUNDRY_CLIENT_ID", "");
    vi.stubEnv("FOUNDRY_REDIRECT_URI", "");
    vi.stubEnv("FOUNDRY_TOKEN_ENCRYPTION_KEY", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does not claim a connection based on configuration alone", () => {
    vi.stubEnv("FOUNDRY_STACK_URL", "https://ontix.usw-23.palantirfoundry.com");
    vi.stubEnv("FOUNDRY_CLIENT_ID", "example-client-id");

    const status = getFoundryIntegrationStatus();

    expect(status.currentProvider).toBe("neon-demo");
    expect(status.connectionStatus).toBe("not-connected");
    expect(status.hostname).toBe("ontix.usw-23.palantirfoundry.com");
    expect(status.objectTypes).toBeNull();
    expect(status.actions).toBeNull();
    expect(status.lastSuccessfulConnectionCheck).toBeNull();
    expect(status.configurationIssues).toContain("No authenticated Foundry request has succeeded; connection status remains Not connected.");
    expect(status.oauthAccountLinked).toBe(false);
  });

  it("rejects insecure or non-Foundry host URLs and reports missing setup", () => {
    vi.stubEnv("FOUNDRY_STACK_URL", "http://not-foundry.example.com");

    const status = getFoundryIntegrationStatus();

    expect(status.hostname).toBeNull();
    expect(status.configurationIssues).toEqual(expect.arrayContaining([
      "Set FOUNDRY_STACK_URL to the HTTPS hostname for your Foundry enrollment.",
      "Configure the public OAuth client ID from Developer Console.",
      "Configure a private 32-byte FOUNDRY_TOKEN_ENCRYPTION_KEY for encrypted token storage.",
      "Configure BETTER_AUTH_SECRET before linking a Foundry user to an Ontix account.",
    ]));
  });
});
