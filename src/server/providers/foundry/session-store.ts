import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import { decryptFoundryToken, encryptFoundryToken } from "./crypto";
import { FoundryTokenError, refreshFoundryTokens, type ParsedTokenResponse } from "./tokens";

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const STATE_TTL_SECONDS = 10 * 60;
const REFRESH_LOCK_MS = 30_000;
const SESSION_COOKIE_MAX = 128;
const SESSION_PREFIX = "ontix:foundry:session:v1:";
const STATE_PREFIX = "ontix:foundry:oauth-state:v1:";
const LOCK_PREFIX = "ontix:foundry:refresh-lock:v1:";

type StoredSession = {
  version: 1;
  generation: number;
  createdAt: number;
  expiresAt: number;
  accessTokenExpiresAt: number;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  groupIds: string[];
};

type StoredOAuthState = {
  version: 1;
  expiresAt: number;
  encryptedVerifier: string;
};

export type FoundrySessionSummary = {
  expiresAt: number;
  groupIds: readonly string[];
};

export class FoundrySessionStoreConfigurationError extends Error {
  constructor(message = "Foundry sign-in storage is not configured on this server.") {
    super(message);
    this.name = "FoundrySessionStoreConfigurationError";
  }
}

export class FoundrySessionStoreError extends Error {
  constructor(message = "Foundry sign-in could not be completed. Try again later.") {
    super(message);
    this.name = "FoundrySessionStoreError";
  }
}

let redis: Redis | undefined;

function getRedis() {
  if (redis) return redis;
  const urlValue = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  try {
    const url = new URL(urlValue ?? "");
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash || !token) {
      throw new Error();
    }
  } catch {
    throw new FoundrySessionStoreConfigurationError();
  }
  try {
    redis = Redis.fromEnv({ readYourWrites: true });
    return redis;
  } catch {
    throw new FoundrySessionStoreConfigurationError();
  }
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function sessionKey(sessionId: string) {
  return `${SESSION_PREFIX}${digest(sessionId)}`;
}

function stateKey(state: string) {
  return `${STATE_PREFIX}${digest(state)}`;
}

function sessionContext(sessionId: string) {
  return `session:${digest(sessionId)}`;
}

function stateContext(state: string) {
  return `state:${digest(state)}`;
}

function parseJson<T>(value: unknown): T | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" ? value as T : null;
}

function isSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredSession>;
  return record.version === 1 && Number.isSafeInteger(record.generation) &&
    typeof record.createdAt === "number" && typeof record.expiresAt === "number" &&
    typeof record.accessTokenExpiresAt === "number" &&
    typeof record.encryptedAccessToken === "string" && typeof record.encryptedRefreshToken === "string" &&
    Array.isArray(record.groupIds) && record.groupIds.every((id) => typeof id === "string");
}

function validSessionId(sessionId: string | undefined): sessionId is string {
  return Boolean(sessionId && sessionId.length <= SESSION_COOKIE_MAX && /^[A-Za-z0-9_-]{40,64}$/.test(sessionId));
}

async function loadStoredSession(sessionId: string) {
  const value = await getRedis().get<unknown>(sessionKey(sessionId));
  const session = parseJson<StoredSession>(value);
  if (!isSession(session) || session.expiresAt <= Date.now()) return null;
  return session;
}

export async function storeFoundryOAuthState(state: string, verifier: string) {
  const now = Date.now();
  const value: StoredOAuthState = {
    version: 1,
    expiresAt: now + STATE_TTL_SECONDS * 1000,
    encryptedVerifier: encryptFoundryToken(verifier, stateContext(state), "state"),
  };
  const result = await getRedis().set(stateKey(state), JSON.stringify(value), { ex: STATE_TTL_SECONDS, nx: true });
  if (result !== "OK") throw new FoundrySessionStoreError();
}

export async function consumeFoundryOAuthState(state: string): Promise<{ verifier: string } | null> {
  let value: unknown;
  try {
    value = await getRedis().getdel<unknown>(stateKey(state));
  } catch {
    throw new FoundrySessionStoreError();
  }
  const stored = parseJson<StoredOAuthState>(value);
  if (!stored || stored.version !== 1 || typeof stored.expiresAt !== "number" ||
      stored.expiresAt <= Date.now() || typeof stored.encryptedVerifier !== "string") return null;
  try {
    return { verifier: decryptFoundryToken(stored.encryptedVerifier, stateContext(state), "state") };
  } catch {
    return null;
  }
}

export async function createFoundrySession(tokens: ParsedTokenResponse, groupIds: readonly string[]) {
  const sessionId = randomBytes(32).toString("base64url");
  const now = Date.now();
  const value: StoredSession = {
    version: 1,
    generation: 0,
    createdAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
    accessTokenExpiresAt: now + tokens.expiresIn * 1000,
    encryptedAccessToken: encryptFoundryToken(tokens.accessToken, sessionContext(sessionId), "access"),
    encryptedRefreshToken: encryptFoundryToken(tokens.refreshToken, sessionContext(sessionId), "refresh"),
    groupIds: [...new Set(groupIds)],
  };
  const result = await getRedis().set(sessionKey(sessionId), JSON.stringify(value), { ex: SESSION_TTL_SECONDS, nx: true });
  if (result !== "OK") throw new FoundrySessionStoreError();
  return { sessionId, expiresAt: value.expiresAt };
}

export async function readFoundrySession(sessionId: string | undefined): Promise<FoundrySessionSummary | null> {
  if (!validSessionId(sessionId)) return null;
  let session: StoredSession | null;
  try {
    session = await loadStoredSession(sessionId);
  } catch {
    throw new FoundrySessionStoreError();
  }
  if (!session) return null;
  return { expiresAt: session.expiresAt, groupIds: session.groupIds };
}

const STORE_ROTATED_TOKENS_SCRIPT = `
local lockValue = redis.call('GET', KEYS[2])
if lockValue ~= ARGV[1] then return 0 end
local current = redis.call('GET', KEYS[1])
if not current then redis.call('DEL', KEYS[2]); return 0 end
local ok, parsed = pcall(cjson.decode, current)
if not ok or tonumber(parsed.generation) ~= tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[2]);
  return 0
end
redis.call('SET', KEYS[1], ARGV[3], 'PX', ARGV[4])
redis.call('DEL', KEYS[2])
return 1
`;

const RELEASE_REFRESH_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

const REVOKE_SESSION_SCRIPT = `
redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
return 1
`;

async function releaseLock(lockKey: string, lockId: string) {
  await getRedis().eval(RELEASE_REFRESH_LOCK_SCRIPT, [lockKey], [lockId]);
}

async function revokeSessionKeys(sessionId: string) {
  const key = sessionKey(sessionId);
  const lockKey = `${LOCK_PREFIX}${digest(sessionId)}`;
  await getRedis().eval(REVOKE_SESSION_SCRIPT, [key, lockKey], []);
}

function decryptAccessToken(sessionId: string, session: StoredSession) {
  return decryptFoundryToken(session.encryptedAccessToken, sessionContext(sessionId), "access");
}

export async function getFoundrySessionAccessToken(sessionId: string | undefined): Promise<string | null> {
  if (!validSessionId(sessionId)) return null;
  const redisClient = getRedis();
  const key = sessionKey(sessionId);
  const lockKey = `${LOCK_PREFIX}${digest(sessionId)}`;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    let current: StoredSession | null;
    try {
      current = await loadStoredSession(sessionId);
    } catch {
      throw new FoundrySessionStoreError();
    }
    if (!current) return null;
    if (current.accessTokenExpiresAt > Date.now() + 60_000) {
      try {
        return decryptAccessToken(sessionId, current);
      } catch {
        await revokeSessionKeys(sessionId).catch(() => undefined);
        return null;
      }
    }

    const lockId = randomBytes(18).toString("base64url");
    let acquired: string | null;
    try {
      acquired = await redisClient.set(lockKey, lockId, { nx: true, px: REFRESH_LOCK_MS });
    } catch {
      throw new FoundrySessionStoreError();
    }
    if (acquired !== "OK") {
      await new Promise((resolve) => setTimeout(resolve, 120 + attempt * 80));
      continue;
    }

    let lockConsumed = false;
    try {
      const latest = await loadStoredSession(sessionId);
      if (!latest) return null;
      if (latest.accessTokenExpiresAt > Date.now() + 60_000) return decryptAccessToken(sessionId, latest);
      if (latest.generation !== current.generation) continue;

      let refreshToken: string;
      try {
        refreshToken = decryptFoundryToken(latest.encryptedRefreshToken, sessionContext(sessionId), "refresh");
      } catch {
        await revokeSessionKeys(sessionId);
        return null;
      }
      const refreshed = await refreshFoundryTokens(refreshToken);
      if (!refreshed.ok) {
        if (refreshed.error === "invalid_grant") await revokeSessionKeys(sessionId);
        throw new FoundryTokenError("Foundry could not refresh the session. Please sign in again.");
      }

      const now = Date.now();
      const updated: StoredSession = {
        ...latest,
        generation: latest.generation + 1,
        accessTokenExpiresAt: now + refreshed.tokens.expiresIn * 1000,
        encryptedAccessToken: encryptFoundryToken(refreshed.tokens.accessToken, sessionContext(sessionId), "access"),
        encryptedRefreshToken: encryptFoundryToken(refreshed.tokens.refreshToken, sessionContext(sessionId), "refresh"),
      };
      const remainingTtlMs = Math.max(1, updated.expiresAt - now);
      const saved = await redisClient.eval<string[], number>(STORE_ROTATED_TOKENS_SCRIPT, [key, lockKey], [
        lockId,
        String(latest.generation),
        JSON.stringify(updated),
        String(remainingTtlMs),
      ]);
      lockConsumed = true;
      if (saved === 1) return refreshed.tokens.accessToken;

      const winner = await loadStoredSession(sessionId);
      if (!winner) return null;
      if (winner.generation > latest.generation && winner.accessTokenExpiresAt > Date.now() + 60_000) {
        return decryptAccessToken(sessionId, winner);
      }
      throw new FoundryTokenError("Foundry session changed during token refresh. Please sign in again.");
    } finally {
      if (!lockConsumed) await releaseLock(lockKey, lockId).catch(() => undefined);
    }
  }
  throw new FoundryTokenError("Foundry token refresh is busy. Please retry shortly.");
}

export async function revokeFoundrySession(sessionId: string | undefined) {
  if (!validSessionId(sessionId)) return;
  try {
    await revokeSessionKeys(sessionId);
  } catch {
    throw new FoundrySessionStoreError();
  }
}

export function foundrySessionCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-ontix-session" : "ontix-session";
}

export function foundrySessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function foundryOAuthStateCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-ontix-foundry-auth-state" : "ontix-foundry-auth-state";
}

export function foundryOAuthStateCookieOptions(maxAge = STATE_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function isFoundrySessionStoreConfigured() {
  const urlValue = process.env.UPSTASH_REDIS_REST_URL?.trim();
  if (!urlValue || !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) return false;
  try {
    const url = new URL(urlValue);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}
