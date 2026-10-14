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
    vi.restoreAllMocks();
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

  it("maps provider error identifiers safely with status and response type", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { error: "request_denied", error_description: "sensitive provider detail" },
      { status: 400 },
    )));

    const error = await exchangeFoundryCodeForTokens({ code: "private-code", verifier: "private-verifier" })
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(FoundryTokenError);
    expect(error).toMatchObject({ failureCode: "provider-request_denied", httpStatus: 400, responseType: "json" });
    expect(error).toMatchObject({ providerDetail: "other-description" });
    expect((error as Error).message).not.toContain("sensitive provider detail");
  });

  it("classifies a provider redirect error without logging its raw description", async () => {
    const description = "Redirect URI is denied for private-code";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { error: "permission_denied", error_description: description },
      { status: 403 },
    )));

    const error = await exchangeFoundryCodeForTokens({ code: "private-code", verifier: "private-verifier" })
      .catch((value: unknown) => value);

    expect(error).toMatchObject({ failureCode: "provider-permission_denied", providerDetail: "redirect-uri" });
    expect((error as Error).message).not.toContain(description);
  });

  it("reports the production request shape without exposing OAuth values", async () => {
    const verifier = "v".repeat(43);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.fn(async (_url: URL, init?: RequestInit) => {
      const sent = new URLSearchParams(String(init?.body));
      expect(sent.get("code") === "private-code").toBe(true);
      expect(sent.get("code_verifier") === verifier).toBe(true);
      expect(new Headers(init?.headers).get("authorization")).toBeNull();
      return Response.json({ error: "permission_denied", errorInstanceId: "123e4567-e89b-12d3-a456-426614174000" }, { status: 403 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    await exchangeFoundryCodeForTokens({ code: "private-code", verifier }).catch(() => {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("[Foundry token request] Rejected", expect.objectContaining({
      endpointMatchesStack: true,
      formContentType: true,
      authorizationHeaderPresent: false,
      requiredParametersUnique: true,
      serializationPreserved: true,
      clientMatchesConfiguration: true,
      redirectMatchesConfiguration: true,
      redirectMatchesApplicationOrigin: true,
      codePresent: true,
      verifierSyntaxValid: true,
      providerResponseFields: ["error", "errorInstanceId"],
      providerCorrelationId: "123e4567-e89b-12d3-a456-426614174000",
    }));
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private-code");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(verifier);
  });
});
