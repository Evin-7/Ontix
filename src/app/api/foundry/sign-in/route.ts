import { NextResponse } from "next/server";
import { FOUNDRY_OAUTH_SCOPES, getFoundryApplicationUrl, getFoundryOAuthConfig } from "@/server/providers/foundry/config";
import {
  assertFoundryStandaloneAuthConfigured,
  createStandaloneFoundryOAuthState,
  FoundryStandaloneAuthConfigurationError,
  foundryOAuthStateCookieName,
} from "@/server/providers/foundry/standalone-auth";
import {
  FoundrySessionStoreConfigurationError,
  FoundrySessionStoreError,
  foundryOAuthStateCookieOptions,
} from "@/server/providers/foundry/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    assertFoundryStandaloneAuthConfigured();
    const config = getFoundryOAuthConfig();
    const stateData = await createStandaloneFoundryOAuthState();
    const authorizeUrl = new URL("/multipass/api/oauth2/authorize", config.stackUrl);
    authorizeUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: FOUNDRY_OAUTH_SCOPES.join(" "),
      state: stateData.state,
      code_challenge: stateData.challenge,
      code_challenge_method: "S256",
    }).toString();

    const response = NextResponse.redirect(authorizeUrl);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(
      foundryOAuthStateCookieName(),
      stateData.state,
      foundryOAuthStateCookieOptions(stateData.maxAge),
    );
    return response;
  } catch (error) {
    const category = error instanceof FoundryStandaloneAuthConfigurationError
      ? error.failureCode
      : error instanceof FoundrySessionStoreConfigurationError
        ? "invalid-config"
      : error instanceof FoundrySessionStoreError
        ? error.failureCode
        : "unexpected";
    // Categories are an allow-listed diagnostic only. Never log exception text, URLs, tokens, or config values.
    console.error("[Foundry sign-in] Setup failed", { category });
    let applicationUrl: URL;
    try {
      applicationUrl = getFoundryApplicationUrl();
    } catch {
      return new Response("Foundry sign-in is not configured.", { status: 500, headers: { "cache-control": "no-store" } });
    }
    const redirect = new URL("/?foundry=setup-required", applicationUrl);
    redirect.searchParams.set("reason", category);
    const response = NextResponse.redirect(redirect);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
}
