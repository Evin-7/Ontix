import "server-only";

import { getFoundryOAuthConfig } from "./config";
import { decryptFoundryToken, encryptFoundryToken, isLegacyFoundryToken } from "./crypto";

export class FoundryTokenError extends Error {
  constructor(message = "The Foundry connection needs to be reconnected.") {
    super(message);
    this.name = "FoundryTokenError";
  }
}

export type ParsedTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
};

type TokenEndpointFailure = { ok: false; error: string | null };
type TokenEndpointResult = { ok: true; tokens: ParsedTokenResponse } | TokenEndpointFailure;

function parseTokenResponse(value: unknown): ParsedTokenResponse | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const accessToken = record.access_token;
  const refreshToken = record.refresh_token;
  const expiresRaw = record.expires_in;
  const expiresIn = typeof expiresRaw === "string" ? Number(expiresRaw) : expiresRaw;
  const tokenType = record.token_type;
  if (
    typeof accessToken !== "string" || accessToken.length < 8 || accessToken.length > 16_384 ||
    typeof refreshToken !== "string" || refreshToken.length < 8 || refreshToken.length > 16_384 ||
    typeof expiresIn !== "number" || !Number.isSafeInteger(expiresIn) || expiresIn < 30 || expiresIn > 31_536_000 ||
    (typeof tokenType === "string" && tokenType.toLowerCase() !== "bearer")
  ) return null;
  return {
    accessToken,
    refreshToken,
    expiresIn,
    scope: typeof record.scope === "string" ? record.scope.slice(0, 2048) : "",
  };
}

async function requestToken(body: URLSearchParams): Promise<TokenEndpointResult> {
  const { stackUrl } = getFoundryOAuthConfig();
  const endpoint = new URL("/multipass/api/oauth2/token", stackUrl);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new FoundryTokenError("Foundry token service is unavailable. Try reconnecting later.");
  }
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const error = payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).error === "string"
      ? String((payload as Record<string, unknown>).error)
      : null;
    return { ok: false, error };
  }
  const tokens = parseTokenResponse(payload);
  if (!tokens) throw new FoundryTokenError("Foundry returned an invalid OAuth response. Try reconnecting.");
  return { ok: true, tokens };
}

export async function exchangeFoundryCodeForTokens(input: { code: string; verifier: string }): Promise<ParsedTokenResponse> {
  const { clientId, redirectUri } = getFoundryOAuthConfig();
  const result = await requestToken(new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.verifier,
    redirect_uri: redirectUri,
  }));
  if (!result.ok) throw new FoundryTokenError("Foundry authorization was not completed. Reconnect and try again.");
  return result.tokens;
}

export async function refreshFoundryTokens(refreshToken: string): Promise<TokenEndpointResult> {
  const { clientId, redirectUri } = getFoundryOAuthConfig();
  return requestToken(new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    redirect_uri: redirectUri,
  }));
}

export async function exchangeFoundryAuthorizationCode(input: { code: string; verifier: string; authUserId: string }) {
  const tokens = await exchangeFoundryCodeForTokens(input);
  const { prisma } = await import("@/server/db/prisma");
  await prisma.foundryConnection.upsert({
    where: { authUserId: input.authUserId },
    create: {
      authUserId: input.authUserId,
      encryptedAccessToken: encryptFoundryToken(tokens.accessToken, input.authUserId, "access"),
      encryptedRefreshToken: encryptFoundryToken(tokens.refreshToken, input.authUserId, "refresh"),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      scope: tokens.scope,
      connectedAt: new Date(),
      revokedAt: null,
    },
    update: {
      encryptedAccessToken: encryptFoundryToken(tokens.accessToken, input.authUserId, "access"),
      encryptedRefreshToken: encryptFoundryToken(tokens.refreshToken, input.authUserId, "refresh"),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      scope: tokens.scope,
      connectedAt: new Date(),
      revokedAt: null,
    },
  });
}

export async function getFoundryConnectionSummary(authUserId: string) {
  const { prisma } = await import("@/server/db/prisma");
  const connection = await prisma.foundryConnection.findUnique({
    where: { authUserId },
    select: { connectedAt: true, revokedAt: true },
  });
  return {
    oauthAccountLinked: Boolean(connection && !connection.revokedAt),
    oauthConnectedAt: connection && !connection.revokedAt ? connection.connectedAt.toISOString() : null,
  };
}

export async function disconnectFoundryAccount(authUserId: string) {
  const { prisma } = await import("@/server/db/prisma");
  await prisma.foundryConnection.deleteMany({ where: { authUserId } });
}

export async function getFoundryAccessToken(authUserId: string): Promise<string | null> {
  const { prisma } = await import("@/server/db/prisma");
  const connection = await prisma.foundryConnection.findUnique({ where: { authUserId } });
  if (!connection || connection.revokedAt) return null;
  if (connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    const accessToken = decryptFoundryToken(connection.encryptedAccessToken, authUserId, "access");
    if (isLegacyFoundryToken(connection.encryptedAccessToken)) {
      await prisma.foundryConnection.updateMany({
        where: { id: connection.id, encryptedAccessToken: connection.encryptedAccessToken, revokedAt: null },
        data: { encryptedAccessToken: encryptFoundryToken(accessToken, authUserId, "access") },
      });
    }
    return accessToken;
  }
  if (!connection.encryptedRefreshToken) {
    await prisma.foundryConnection.updateMany({
      where: { id: connection.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  // Row-level locking prevents concurrent requests from reusing a rotating
  // refresh token. The token endpoint has a strict timeout to bound the lock.
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "foundry_connections" WHERE "id" = ${connection.id} FOR UPDATE`;
    const latest = await tx.foundryConnection.findUnique({ where: { id: connection.id } });
    if (!latest || latest.revokedAt) return null;
    if (latest.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
      const accessToken = decryptFoundryToken(latest.encryptedAccessToken, authUserId, "access");
      if (isLegacyFoundryToken(latest.encryptedAccessToken)) {
        await tx.foundryConnection.update({
          where: { id: latest.id },
          data: { encryptedAccessToken: encryptFoundryToken(accessToken, authUserId, "access") },
        });
      }
      return accessToken;
    }
    if (!latest.encryptedRefreshToken) {
      await tx.foundryConnection.update({ where: { id: latest.id }, data: { revokedAt: new Date() } });
      return null;
    }

    const result = await refreshFoundryTokens(
      decryptFoundryToken(latest.encryptedRefreshToken, authUserId, "refresh"),
    );
    if (!result.ok) {
      if (result.error === "invalid_grant") {
        await tx.foundryConnection.update({
          where: { id: latest.id },
          data: { encryptedAccessToken: "", encryptedRefreshToken: null, revokedAt: new Date() },
        });
        return null;
      }
      throw new FoundryTokenError("Foundry could not refresh the session. Try reconnecting later.");
    }
    await tx.foundryConnection.update({
      where: { id: latest.id },
      data: {
        encryptedAccessToken: encryptFoundryToken(result.tokens.accessToken, authUserId, "access"),
        encryptedRefreshToken: encryptFoundryToken(result.tokens.refreshToken, authUserId, "refresh"),
        accessTokenExpiresAt: new Date(Date.now() + result.tokens.expiresIn * 1000),
        scope: result.tokens.scope || latest.scope,
        revokedAt: null,
      },
    });
    return result.tokens.accessToken;
  });
}
