import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDataProviderMode, ProviderNotReadyError, requireNeonDemoProvider } from "@/server/providers/provider-mode";

describe("data provider mode", () => {
  beforeEach(() => vi.stubEnv("DATA_PROVIDER", ""));
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to the Neon demo provider and accepts the legacy local value", () => {
    expect(getDataProviderMode()).toBe("neon-demo");
    vi.stubEnv("DATA_PROVIDER", "local");
    expect(getDataProviderMode()).toBe("neon-demo");
  });

  it("fails closed when Foundry is selected", () => {
    vi.stubEnv("DATA_PROVIDER", "foundry");
    expect(getDataProviderMode()).toBe("foundry");
    expect(() => requireNeonDemoProvider()).toThrow(ProviderNotReadyError);
  });

  it("rejects unsupported provider names", () => {
    vi.stubEnv("DATA_PROVIDER", "unknown");
    expect(() => getDataProviderMode()).toThrow(ProviderNotReadyError);
  });
});
