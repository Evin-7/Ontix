import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getFoundryOAuthConfig } from "./config";
import { assertFoundryRoleGroupsConfigured, getCurrentFoundryGroupIds, resolveFoundryRole, FoundryGroupAuthorizationError } from "./groups";
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
  type FoundrySessionSummary,
} from "./session-store";
import type { ParsedTokenResponse } from "./tokens";

export class FoundryStandaloneAuthConfigurationError extends Error {
  constructor(message = "Foundry sign-in is not ready on this server.") {
    super(message);
    this.name = "FoundryStandaloneAuthConfigurationError";
  }
}

export function assertFoundryStandaloneAuthConfigured() {
  try {
    getFoundryOAuthConfig();
    const encoded = process.env.FOUNDRY_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error();
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32 || !isFoundrySessionStoreConfigured()) throw new Error();
    assertFoundryRoleGroupsConfigured();
  } catch {
    throw new FoundryStandaloneAuthConfigurationError();
  }
}

export async function createStandaloneFoundryOAuthState() {
  assertFoundryStandaloneAuthConfigured();
  const state = randomBytes(32).toString("base64url");
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
