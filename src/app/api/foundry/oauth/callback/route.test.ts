import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {}

  return {
    AuthenticationRequiredError,
    actorModuleLoaded: vi.fn(),
    cookieValues: new Map<string, string>(),
    cookies: vi.fn(),
    consumeStandaloneState: vi.fn(),
    establishSession: vi.fn(),
    exchangeCodeForTokens: vi.fn(),
    exchangeLegacyCode: vi.fn(),
    readLegacyState: vi.fn(),
    requireActor: vi.fn(),
  };
});

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/server/providers/foundry/config", () => ({
  getFoundryApplicationUrl: () => new URL("http://127.0.0.1:3000"),
}));
vi.mock("@/server/providers/foundry/oauth-state", () => ({
  foundryOAuthStateCookieName: () => "ontix-foundry-oauth",
  foundryOAuthStateCookieOptions: () => ({ httpOnly: true, path: "/" }),
  readFoundryOAuthState: mocks.readLegacyState,
}));
vi.mock("@/server/providers/foundry/standalone-auth", () => ({
  consumeStandaloneFoundryOAuthState: mocks.consumeStandaloneState,
  establishFoundrySession: mocks.establishSession,
  foundryOAuthStateCookieName: () => "ontix-foundry-auth-state",
  foundrySessionCookieName: () => "ontix-session",
}));
vi.mock("@/server/providers/foundry/session-store", () => ({
  foundryOAuthStateCookieOptions: () => ({ httpOnly: true, path: "/" }),
  foundrySessionCookieOptions: () => ({ httpOnly: true, path: "/" }),
}));
vi.mock("@/server/providers/foundry/tokens", () => ({
  exchangeFoundryAuthorizationCode: mocks.exchangeLegacyCode,
  exchangeFoundryCodeForTokens: mocks.exchangeCodeForTokens,
}));
vi.mock("@/lib/auth/dal", () => {
  mocks.actorModuleLoaded();
  return {
    AuthenticationRequiredError: mocks.AuthenticationRequiredError,
    requireActor: mocks.requireActor,
  };
});

describe("Foundry OAuth callback provider isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.cookieValues.clear();
    mocks.cookies.mockImplementation(async () => ({
      get: (name: string) => {
        const value = mocks.cookieValues.get(name);
        return value === undefined ? undefined : { value };
      },
    }));
  });

  it("handles standalone sign-in without loading the legacy actor module", async () => {
    mocks.cookieValues.set("ontix-foundry-auth-state", "standalone-state");
    mocks.consumeStandaloneState.mockResolvedValue({ verifier: "pkce-verifier" });
    mocks.exchangeCodeForTokens.mockResolvedValue({ accessToken: "access-token", refreshToken: "refresh-token" });
    mocks.establishSession.mockResolvedValue({ sessionId: "opaque-session-id" });

    const { GET } = await import("./route");
    expect(mocks.actorModuleLoaded).not.toHaveBeenCalled();

    const response = await GET(new Request(
      "http://127.0.0.1:3000/api/foundry/oauth/callback?code=auth-code&state=standalone-state",
    ));

    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/?foundry=signed-in");
    expect(mocks.actorModuleLoaded).not.toHaveBeenCalled();
    expect(mocks.requireActor).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForTokens).toHaveBeenCalledWith({ code: "auth-code", verifier: "pkce-verifier" });
  });

  it("retains the legacy linked-account callback path", async () => {
    mocks.cookieValues.set("ontix-foundry-oauth", "legacy-cookie-state");
    mocks.requireActor.mockResolvedValue({ authUserId: "local-user-1" });
    mocks.readLegacyState.mockReturnValue({ verifier: "legacy-verifier" });

    const { GET } = await import("./route");
    const response = await GET(new Request(
      "http://127.0.0.1:3000/api/foundry/oauth/callback?code=legacy-code&state=legacy-state",
    ));

    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/?foundry=linked");
    expect(mocks.actorModuleLoaded).toHaveBeenCalledOnce();
    expect(mocks.exchangeLegacyCode).toHaveBeenCalledWith({
      code: "legacy-code",
      verifier: "legacy-verifier",
      authUserId: "local-user-1",
    });
  });
});
