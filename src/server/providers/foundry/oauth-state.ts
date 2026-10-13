import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const STATE_COOKIE_TTL_SECONDS = 10 * 60;
const STATE_COOKIE_PREFIX = "ontix-foundry-oauth-v1.";

export type FoundryOAuthState = {
  state: string;
  verifier: string;
  authUserId: string;
  expiresAt: number;
};

function signingSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Foundry OAuth state signing is unavailable.");
  return secret;
}

export function createFoundryOAuthState(authUserId: string, now = Date.now()) {
  const state: FoundryOAuthState = {
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    authUserId,
    expiresAt: now + STATE_COOKIE_TTL_SECONDS * 1000,
  };
  const challenge = createHash("sha256").update(state.verifier).digest("base64url");
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = createHmac("sha256", signingSecret())
    .update(`${STATE_COOKIE_PREFIX}${payload}`)
    .digest("base64url");
  return {
    state,
    cookieValue: `${payload}.${signature}`,
    challenge,
    maxAge: STATE_COOKIE_TTL_SECONDS,
  };
}

export function readFoundryOAuthState(
  cookieValue: string | undefined,
  expectedState: string,
  expectedAuthUserId: string,
  now = Date.now(),
): FoundryOAuthState | null {
  if (!cookieValue || cookieValue.length > 4096 || !expectedState || expectedState.length > 256) return null;
  const [payload, suppliedSignature, ...extra] = cookieValue.split(".");
  if (!payload || !suppliedSignature || extra.length > 0) return null;

  let expectedSignature: Buffer;
  let actualSignature: Buffer;
  try {
    expectedSignature = createHmac("sha256", signingSecret())
      .update(`${STATE_COOKIE_PREFIX}${payload}`)
      .digest();
    actualSignature = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;

  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as FoundryOAuthState;
    if (
      typeof state.state !== "string" || state.state !== expectedState ||
      typeof state.verifier !== "string" || state.verifier.length < 43 || state.verifier.length > 128 ||
      typeof state.authUserId !== "string" || state.authUserId !== expectedAuthUserId ||
      typeof state.expiresAt !== "number" || state.expiresAt <= now
    ) return null;
    return state;
  } catch {
    return null;
  }
}

export function foundryOAuthStateCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-ontix-foundry-oauth"
    : "ontix-foundry-oauth";
}

export function foundryOAuthStateCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
