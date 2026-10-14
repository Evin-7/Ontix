import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getFoundryOAuthConfig } from "./config";
import { configuredFoundryRoleGroups, getCurrentFoundryGroupIds, resolveFoundryRole, FoundryGroupAuthorizationError } from "./groups";
import {
  consumeFoundryOAuthState,
  createFoundrySession,
  foundryOAuthStateCookieName,
  foundrySessionCookieName,
  getFoundrySessionAccessToken,
  isFoundrySessionStoreConfigured,
  readFoundrySession,
  revokeFoundrySession,
  storeFoundryOAuthState,
  verifyFoundrySessionStoreConnection,
  type FoundrySessionSummary,
} from "./session-store";
import type { ParsedTokenResponse } from "./tokens";

export class FoundryStandaloneAuthConfigurationError extends Error {
  readonly failureCode: "missing-config" | "invalid-config" | "invalid-encryption-key";

  constructor(failureCode: "missing-config" | "invalid-config" | "invalid-encryption-key" = "missing-config") {
    const message = "Foundry sign-in is not ready on this server.";
    super(message);
    this.name = "FoundryStandaloneAuthConfigurationError";
    this.failureCode = failureCode;
  }
}

const STANDALONE_OAUTH_STATE_PREFIX = "ontix1_";

export function isStandaloneFoundryOAuthState(state: string) {
  return state.startsWith(STANDALONE_OAUTH_STATE_PREFIX);
}

export function assertFoundryStandaloneAuthConfigured() {
  const appUrl = process.env.ONTIX_APPLICATION_URL?.trim() || process.env.BETTER_AUTH_URL?.trim();
  if (!process.env.FOUNDRY_STACK_URL?.trim() || !process.env.FOUNDRY_CLIENT_ID?.trim() ||
      !process.env.FOUNDRY_REDIRECT_URI?.trim() || (process.env.NODE_ENV === "production" && !appUrl)) {
    throw new FoundryStandaloneAuthConfigurationError("missing-config");
  }
  try {
    getFoundryOAuthConfig();
  } catch {
    throw new FoundryStandaloneAuthConfigurationError("invalid-config");
  }

  const encoded = process.env.FOUNDRY_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
  if (!encoded) throw new FoundryStandaloneAuthConfigurationError("missing-config");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || Buffer.from(encoded, "base64").length !== 32) {
    throw new FoundryStandaloneAuthConfigurationError("invalid-encryption-key");
  }

  if (!process.env.UPSTASH_REDIS_REST_URL?.trim() || !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
    throw new FoundryStandaloneAuthConfigurationError("missing-config");
  }
  if (!isFoundrySessionStoreConfigured()) throw new FoundryStandaloneAuthConfigurationError("invalid-config");

  let roleGroups;
  try {
    roleGroups = configuredFoundryRoleGroups();
  } catch {
    throw new FoundryStandaloneAuthConfigurationError("invalid-config");
  }
  if (roleGroups.length === 0) throw new FoundryStandaloneAuthConfigurationError("missing-config");
}

export async function createStandaloneFoundryOAuthState() {
  assertFoundryStandaloneAuthConfigured();
  await verifyFoundrySessionStoreConnection();
  // Mark this flow so the callback never mistakes it for the legacy,
  // Prisma-backed account-link flow if the browser omits an OAuth cookie.
  const state = `${STANDALONE_OAUTH_STATE_PREFIX}${randomBytes(32).toString("base64url")}`;
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier, "utf8").digest("base64url");
  await storeFoundryOAuthState(state, verifier);
  return { state, challenge, maxAge: 10 * 60 };
}

export async function consumeStandaloneFoundryOAuthState(cookieState: string | undefined, expectedState: string) {
  if (!cookieState || !expectedState || cookieState !== expectedState || expectedState.length > 256) return null;
  return consumeFoundryOAuthState(expectedState);
}

export async function establishFoundrySession(tokens: ParsedTokenResponse) {
  const groupIds = await getCurrentFoundryGroupIds(tokens.accessToken);
  const role = resolveFoundryRole(groupIds);
  if (!role) throw new FoundryGroupAuthorizationError();
  return createFoundrySession(tokens, groupIds);
}

export async function getCurrentFoundrySession(): Promise<{
  session: FoundrySessionSummary & { role: string };
  accessToken: string;
} | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(foundrySessionCookieName())?.value;
  const stored = await readFoundrySession(sessionId);
  if (!stored) return null;

  const accessToken = await getFoundrySessionAccessToken(sessionId);
  if (!accessToken) return null;
  const groupIds = await getCurrentFoundryGroupIds(accessToken);
  const role = resolveFoundryRole(groupIds);
  if (!role) {
    await revokeFoundrySession(sessionId);
    return null;
  }
  return {
    session: { role, expiresAt: stored.expiresAt, groupIds },
    accessToken,
  };
}

export async function endCurrentFoundrySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(foundrySessionCookieName())?.value;
  await revokeFoundrySession(sessionId);
}

export { foundryOAuthStateCookieName, foundrySessionCookieName };
