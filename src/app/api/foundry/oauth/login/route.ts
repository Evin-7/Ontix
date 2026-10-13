import { NextResponse } from "next/server";
import { requireActor, AuthenticationRequiredError } from "@/lib/auth/dal";
import { FOUNDRY_OAUTH_SCOPES, getFoundryApplicationUrl, getFoundryOAuthConfig, isFoundryOAuthConfigured } from "@/server/providers/foundry/config";
import {
  createFoundryOAuthState,
  foundryOAuthStateCookieName,
  foundryOAuthStateCookieOptions,
} from "@/server/providers/foundry/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectNoStore(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  void request;
  let applicationUrl: URL;
  try {
    applicationUrl = getFoundryApplicationUrl();
  } catch {
    return new Response("Foundry sign-in is not configured.", { status: 500, headers: { "cache-control": "no-store" } });
  }

  let actor;
  try {
    actor = await requireActor();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return redirectNoStore(new URL("/login", applicationUrl));
    }
    return redirectNoStore(new URL("/?foundry=unavailable", applicationUrl));
  }

  try {
    const config = getFoundryOAuthConfig();
    if (!isFoundryOAuthConfigured()) {
      return redirectNoStore(new URL("/?foundry=setup-required", applicationUrl));
    }
    const stateData = createFoundryOAuthState(actor.authUserId);
    const authorizeUrl = new URL("/multipass/api/oauth2/authorize", config.stackUrl);
    authorizeUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: FOUNDRY_OAUTH_SCOPES.join(" "),
      state: stateData.state.state,
      code_challenge: stateData.challenge,
      code_challenge_method: "S256",
    }).toString();

    const response = redirectNoStore(authorizeUrl);
    response.cookies.set(
      foundryOAuthStateCookieName(),
      stateData.cookieValue,
      foundryOAuthStateCookieOptions(stateData.maxAge),
    );
    return response;
  } catch {
    return redirectNoStore(new URL("/?foundry=setup-required", applicationUrl));
  }
}
