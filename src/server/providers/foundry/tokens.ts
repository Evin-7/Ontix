import "server-only";

import { getFoundryOAuthConfig } from "./config";
import { decryptFoundryToken, encryptFoundryToken, isLegacyFoundryToken } from "./crypto";

export class FoundryTokenError extends Error {
  readonly failureCode: FoundryOAuthFailureCode;
  readonly httpStatus?: number;
  readonly responseType?: "json" | "html" | "text" | "other";
  readonly providerDetail?: FoundryProviderDetail;

  constructor(
    message = "The Foundry connection needs to be reconnected.",
    failureCode: FoundryOAuthFailureCode = "other",
    httpStatus?: number,
    responseType?: "json" | "html" | "text" | "other",
    providerDetail?: FoundryProviderDetail,
  ) {
    super(message);
    this.name = "FoundryTokenError";
    this.failureCode = failureCode;
    this.httpStatus = httpStatus;
    this.responseType = responseType;
    this.providerDetail = providerDetail;
  }
}

export type FoundryProviderDetail =
  | "description-missing"
  | "redirect-uri"
  | "pkce"
  | "authorization-code"
  | "offline-access"
  | "scope"
  | "client"
  | "organization"
  | "application-access"
  | "user-permission"
  | "network-policy"
  | "other-description";

export type FoundryOAuthFailureCode =
  | "invalid_grant"
  | "invalid_client"
  | "invalid_request"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "invalid_scope"
  | "provider-error-other"
  | "token-service-unavailable"
  | "token-payload-invalid"
  | "access-token-missing"
  | "refresh-token-missing"
  | "expiration-invalid"
  | "token-type-invalid"
  | `provider-${string}`
  | "other";

export type ParsedTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
};

type TokenEndpointFailure = {
  ok: false;
  error: FoundryOAuthFailureCode;
  httpStatus: number;
  responseType: "json" | "html" | "text" | "other";
  providerDetail: FoundryProviderDetail;
};
type TokenEndpointResult = { ok: true; tokens: ParsedTokenResponse } | TokenEndpointFailure;

const OAUTH_FAILURE_CODES: readonly FoundryOAuthFailureCode[] = [
  "invalid_grant",
  "invalid_client",
  "invalid_request",
  "unauthorized_client",
  "unsupported_grant_type",
  "invalid_scope",
];

function safeOAuthFailureCode(value: unknown): FoundryOAuthFailureCode {
  if (typeof value !== "string") return "provider-error-other";
  if (OAUTH_FAILURE_CODES.includes(value as FoundryOAuthFailureCode)) return value as FoundryOAuthFailureCode;
  if (/^[a-z][a-z0-9_-]{0,47}$/i.test(value)) return `provider-${value.toLowerCase()}`;
  return "provider-error-other";
}

function classifyProviderDetail(value: unknown): FoundryProviderDetail {
  if (typeof value !== "string" || !value.trim()) return "description-missing";
  const detail = value.slice(0, 1024).toLowerCase();
  if (/redirect[ _-]?uri|callback[ _-]?url/.test(detail)) return "redirect-uri";
  if (/code[ _-]?verifier|code[ _-]?challenge|pkce/.test(detail)) return "pkce";
  if (/authorization[ _-]?code|auth[ _-]?code/.test(detail)) return "authorization-code";
  if (/offline[ _-]?access|refresh[ _-]?token/.test(detail)) return "offline-access";
  if (/scope|operation/.test(detail)) return "scope";
  if (/client[ _-]?id|oauth[ _-]?client|public[ _-]?client/.test(detail)) return "client";
  if (/organi[sz]ation|enrollment/.test(detail)) return "organization";
  if (/application|third[ _-]?party[ _-]?app/.test(detail)) return "application-access";
  if (/user|permission|access[ _-]?denied/.test(detail)) return "user-permission";
  if (/network|ip[ _-]?address|allowlist|origin/.test(detail)) return "network-policy";
  return "other-description";
}

function safeCorrelationId(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{8,128}$/.test(value) ? value : undefined;
}

function parseTokenResponse(value: unknown): { tokens: ParsedTokenResponse } | { failureCode: FoundryOAuthFailureCode } {
  if (!value || typeof value !== "object") return { failureCode: "token-payload-invalid" };
  const record = value as Record<string, unknown>;
  const accessToken = record.access_token;
  const refreshToken = record.refresh_token;
  const expiresRaw = record.expires_in;
  const expiresIn = typeof expiresRaw === "string" ? Number(expiresRaw) : expiresRaw;
  const tokenType = record.token_type;
  if (typeof accessToken !== "string" || accessToken.length < 8 || accessToken.length > 16_384) {
    return { failureCode: "access-token-missing" };
  }
  if (typeof refreshToken !== "string" || refreshToken.length < 8 || refreshToken.length > 16_384) {
    return { failureCode: "refresh-token-missing" };
  }
  if (typeof expiresIn !== "number" || !Number.isSafeInteger(expiresIn) || expiresIn < 30 || expiresIn > 31_536_000) {
    return { failureCode: "expiration-invalid" };
  }
  if (typeof tokenType === "string" && tokenType.toLowerCase() !== "bearer") {
    return { failureCode: "token-type-invalid" };
  }
  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn,
      scope: typeof record.scope === "string" ? record.scope.slice(0, 2048) : "",
    },
  };
}

async function requestToken(body: URLSearchParams): Promise<TokenEndpointResult> {
  const { stackUrl, clientId, redirectUri, applicationUrl } = getFoundryOAuthConfig();
  const endpoint = new URL("/multipass/api/oauth2/token", stackUrl);
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", accept: "application/json" });
  const encodedBody = body.toString();
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: encodedBody,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new FoundryTokenError("Foundry token service is unavailable. Try reconnecting later.", "token-service-unavailable");
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const responseType = contentType.includes("json")
    ? "json"
    : contentType.includes("html")
      ? "html"
      : contentType.startsWith("text/")
        ? "text"
        : "other";
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
    const providerCode = record?.error ?? record?.error_code ?? record?.errorCode ?? record?.code;
    const providerDescription = record?.error_description ?? record?.description ?? record?.message;
    if (body.get("grant_type") === "authorization_code") {
      // Log the serialized request's shape, never its code, verifier, token, or raw provider message.
      const encodedParameters = new URLSearchParams(encodedBody);
      const requiredParameters = ["client_id", "grant_type", "code", "code_verifier", "redirect_uri"];
      const providerCorrelationId = safeCorrelationId(
        record?.errorInstanceId ?? record?.error_instance_id ??
        response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id"),
      );
      console.error("[Foundry token request] Rejected", {
        method: "POST",
        endpointMatchesStack: endpoint.origin === stackUrl.origin && endpoint.pathname === "/multipass/api/oauth2/token",
        formContentType: headers.get("content-type") === "application/x-www-form-urlencoded",
        authorizationHeaderPresent: headers.has("authorization"),
        parameterNames: [...encodedParameters.keys()].sort(),
        requiredParametersUnique: requiredParameters.every((name) => encodedParameters.getAll(name).length === 1),
        serializationPreserved: requiredParameters.every((name) => encodedParameters.get(name) === body.get(name)),
        clientMatchesConfiguration: encodedParameters.get("client_id") === clientId,
        redirectMatchesConfiguration: encodedParameters.get("redirect_uri") === redirectUri,
        redirectMatchesApplicationOrigin: encodedParameters.get("redirect_uri") ===
          new URL("/api/foundry/oauth/callback", applicationUrl).toString(),
        codePresent: Boolean(encodedParameters.get("code")),
        verifierSyntaxValid: /^[A-Za-z0-9_-]{43,128}$/.test(encodedParameters.get("code_verifier") ?? ""),
        providerResponseFields: record ? Object.keys(record).filter((name) => /^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(name)).sort() : [],
        ...(providerCorrelationId ? { providerCorrelationId } : {}),
      });
    }
    return {
      ok: false,
      error: safeOAuthFailureCode(providerCode),
      httpStatus: response.status,
      responseType,
      providerDetail: classifyProviderDetail(providerDescription),
    };
  }
  const parsed = parseTokenResponse(payload);
  if (!("tokens" in parsed)) {
    throw new FoundryTokenError("Foundry returned an invalid OAuth response. Try reconnecting.", parsed.failureCode, response.status, responseType);
  }
  return { ok: true, tokens: parsed.tokens };
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
  if (!result.ok) throw new FoundryTokenError(
    "Foundry authorization was not completed. Reconnect and try again.",
    result.error,
    result.httpStatus,
    result.responseType,
    result.providerDetail,
  );
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
