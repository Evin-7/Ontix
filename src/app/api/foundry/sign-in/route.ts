import { NextResponse } from "next/server";
import { FOUNDRY_OAUTH_SCOPES, getFoundryApplicationUrl, getFoundryOAuthConfig } from "@/server/providers/foundry/config";
import {
  assertFoundryStandaloneAuthConfigured,
  createStandaloneFoundryOAuthState,
  foundryOAuthStateCookieName,
} from "@/server/providers/foundry/standalone-auth";
import { foundryOAuthStateCookieOptions } from "@/server/providers/foundry/session-store";

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
  } catch {
    let applicationUrl: URL;
    try {
      applicationUrl = getFoundryApplicationUrl();
    } catch {
      return new Response("Foundry sign-in is not configured.", { status: 500, headers: { "cache-control": "no-store" } });
    }
    const response = NextResponse.redirect(new URL("/?foundry=setup-required", applicationUrl));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
}
