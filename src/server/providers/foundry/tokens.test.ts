import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { exchangeFoundryCodeForTokens, FoundryTokenError } from "./tokens";

describe("Foundry OAuth token failure diagnostics", () => {
  beforeEach(() => {
    vi.stubEnv("FOUNDRY_STACK_URL", "https://ontix.usw-23.palantirfoundry.com");
    vi.stubEnv("FOUNDRY_CLIENT_ID", "public-client-id");
    vi.stubEnv("FOUNDRY_REDIRECT_URI", "https://ontixx.vercel.app/api/foundry/oauth/callback");
    vi.stubEnv("ONTIX_APPLICATION_URL", "https://ontixx.vercel.app");
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("exposes only an allow-listed OAuth error code", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { error: "invalid_grant", error_description: "sensitive provider detail" },
      { status: 400 },
    )));

    const error = await exchangeFoundryCodeForTokens({ code: "private-code", verifier: "private-verifier" })
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(FoundryTokenError);
    expect(error).toMatchObject({ failureCode: "invalid_grant" });
    expect((error as Error).message).not.toContain("sensitive provider detail");
    expect((error as Error).message).not.toContain("private-code");
  });

  it("maps unknown provider errors to other", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { error: "provider-specific-private-error" },
      { status: 400 },
    )));

    const error = await exchangeFoundryCodeForTokens({ code: "private-code", verifier: "private-verifier" })
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(FoundryTokenError);
    expect(error).toMatchObject({ failureCode: "other" });
    expect((error as Error).message).not.toContain("provider-specific-private-error");
  });
});
