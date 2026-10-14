import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  foundryOAuthStateCookieName,
  foundryOAuthStateCookieOptions,
  readFoundryOAuthState,
} from "@/server/providers/foundry/oauth-state";
import { getFoundryApplicationUrl } from "@/server/providers/foundry/config";
import { exchangeFoundryCodeForTokens, FoundryTokenError, type ParsedTokenResponse } from "@/server/providers/foundry/tokens";
import { FoundryGroupAuthorizationError, FoundryGroupServiceError } from "@/server/providers/foundry/groups";
import {
  consumeStandaloneFoundryOAuthState,
  establishFoundrySession,
  isStandaloneFoundryOAuthState,
  foundryOAuthStateCookieName as standaloneStateCookieName,
  foundrySessionCookieName,
} from "@/server/providers/foundry/standalone-auth";
import {
  FoundrySessionStoreError,
  foundryOAuthStateCookieOptions as standaloneStateCookieOptions,
  foundrySessionCookieOptions,
} from "@/server/providers/foundry/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectNoStore(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function redirectAndClear(applicationUrl: URL, result: string) {
  const response = redirectNoStore(new URL(`/?foundry=${result}`, applicationUrl));
  response.cookies.set(
    foundryOAuthStateCookieName(),
    "",
    { ...foundryOAuthStateCookieOptions(0), expires: new Date(0) },
  );
  return response;
}

function logStandaloneCallbackFailure(stage: string, category: string) {
  // Allow-listed labels only; never include request URLs, OAuth parameters, or exception text.
  console.error("[Foundry OAuth callback] Failed", { stage, category });
}

export async function GET(request: Request) {
  let applicationUrl: URL;
  try {
    applicationUrl = getFoundryApplicationUrl();
  } catch {
    return new Response("Foundry sign-in is not configured.", { status: 500, headers: { "cache-control": "no-store" } });
  }

  const url = new URL(request.url);
  const stateValue = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const cookiesStore = await cookies();

  const standaloneState = cookiesStore.get(standaloneStateCookieName())?.value;
  const cookieValue = cookiesStore.get(foundryOAuthStateCookieName())?.value;
  if (
    isStandaloneFoundryOAuthState(stateValue) ||
    (standaloneState && (standaloneState === stateValue || !cookieValue))
  ) {
    return handleStandaloneCallback({ url, applicationUrl, stateValue, code, stateCookie: standaloneState ?? "" });
  }

  // Keep the legacy Prisma-backed identity graph out of the standalone Foundry
  // callback path. Load it only when a legacy link-flow state cookie is used.
  const { AuthenticationRequiredError, requireActor } = await import("@/lib/auth/dal");
  let actor;
  try {
    actor = await requireActor();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return redirectNoStore(new URL("/login", applicationUrl));
    return redirectAndClear(applicationUrl, "failed");
  }

  const state = readFoundryOAuthState(cookieValue, stateValue, actor.authUserId);
  if (!state) {
    // Do not clear the cookie for an unverified callback: a cross-site request
    // with a fabricated state must not cancel a legitimate in-progress login.
    return redirectNoStore(new URL("/?foundry=failed", applicationUrl));
  }

  if (url.searchParams.get("error")) return redirectAndClear(applicationUrl, "denied");
  if (!code || code.length > 4096) return redirectAndClear(applicationUrl, "failed");

  try {
    const { exchangeFoundryAuthorizationCode } = await import("@/server/providers/foundry/tokens");
    await exchangeFoundryAuthorizationCode({ code, verifier: state.verifier, authUserId: actor.authUserId });
    return redirectAndClear(applicationUrl, "linked");
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return redirectNoStore(new URL("/login", applicationUrl));
    return redirectAndClear(applicationUrl, "failed");
  }
}

async function handleStandaloneCallback(input: {
  url: URL;
  applicationUrl: URL;
  stateValue: string;
  code: string;
  stateCookie: string;
}) {
  let verifiedState;
  try {
    verifiedState = await consumeStandaloneFoundryOAuthState(input.stateCookie, input.stateValue);
  } catch (error) {
    const category = error instanceof FoundrySessionStoreError ? error.failureCode : "unexpected-error";
    logStandaloneCallbackFailure("state-consume", category);
    return standaloneRedirect(input.applicationUrl, "failed");
  }
  if (!verifiedState) {
    // Leave a valid in-progress state intact if the callback contains a forged value.
    logStandaloneCallbackFailure("state-validation", "state-cookie-or-record-missing");
    return redirectNoStore(new URL("/?foundry=failed", input.applicationUrl));
  }

  if (input.url.searchParams.get("error")) {
    logStandaloneCallbackFailure("authorization", "provider-denied");
    return standaloneRedirect(input.applicationUrl, "denied");
  }
  if (!input.code || input.code.length > 4096) {
    logStandaloneCallbackFailure("callback-parameters", "authorization-code-missing-or-invalid");
    return standaloneRedirect(input.applicationUrl, "failed");
  }

  let tokens: ParsedTokenResponse;
  try {
    tokens = await exchangeFoundryCodeForTokens({ code: input.code, verifier: verifiedState.verifier });
  } catch (error) {
    logStandaloneCallbackFailure(
      "token-exchange",
      error instanceof FoundryTokenError
        ? `${error.failureCode}${error.httpStatus ? `-${error.httpStatus}` : ""}`
        : "unexpected-error",
    );
    return standaloneRedirect(input.applicationUrl, "failed");
  }

  try {
    const session = await establishFoundrySession(tokens);
    const response = redirectNoStore(new URL("/?foundry=signed-in", input.applicationUrl));
    response.cookies.set(foundrySessionCookieName(), session.sessionId, foundrySessionCookieOptions());
    response.cookies.set(standaloneStateCookieName(), "", { ...standaloneStateCookieOptions(), maxAge: 0, expires: new Date(0) });
    return response;
  } catch (error) {
    const groupDenied = error instanceof FoundryGroupAuthorizationError;
    const category = groupDenied
      ? "role-group-not-matched"
      : error instanceof FoundryGroupServiceError
        ? "group-membership-unavailable"
        : error instanceof FoundrySessionStoreError
          ? error.failureCode
          : "session-create-or-encryption-failed";
    logStandaloneCallbackFailure("session-establishment", category);
    return standaloneRedirect(input.applicationUrl, groupDenied ? "access-denied" : "failed");
  }
}

function standaloneRedirect(applicationUrl: URL, result: string) {
  const response = redirectNoStore(new URL(`/?foundry=${result}`, applicationUrl));
  response.cookies.set(standaloneStateCookieName(), "", {
    ...standaloneStateCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
