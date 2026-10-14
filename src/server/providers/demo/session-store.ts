import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";

const DEMO_SESSION_TTL_SECONDS = 60 * 60 * 8;
const RATE_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 8;
const SESSION_PREFIX = "ontix:demo:session:v1:";
const RATE_PREFIX = "ontix:demo:login-rate:v1:";
const RATE_LIMIT_SCRIPT = `
local attempts = redis.call('INCR', KEYS[1])
if attempts == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return attempts
`;

export type DemoSession = { expiresAt: number };

type StoredDemoSession = { version: 1; createdAt: number; expiresAt: number; mode: "demo" };

export class DemoSessionStoreError extends Error {
  constructor(readonly category: "configuration" | "connection" | "write" | "read" | "rate-limit") {
    super("Demo sign-in is temporarily unavailable.");
    this.name = "DemoSessionStoreError";
  }
}

let redis: Redis | undefined;

function getRedis() {
  if (redis) return redis;
  const urlValue = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  try {
    const url = new URL(urlValue ?? "");
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash || !token) throw new Error();
    redis = Redis.fromEnv({ readYourWrites: true });
    return redis;
  } catch {
    throw new DemoSessionStoreError("configuration");
  }
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function sessionKey(sessionId: string) {
  return `${SESSION_PREFIX}${digest(sessionId)}`;
}

export function demoSessionCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-ontix-demo" : "ontix-demo";
}

export function demoSessionCookieOptions(maxAge = DEMO_SESSION_TTL_SECONDS) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

export function isDemoSessionStoreConfigured() {
  const urlValue = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!urlValue || !token) return false;
  try {
    const url = new URL(urlValue);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function validSessionId(value: string | undefined): value is string {
  return Boolean(value && value.length <= 64 && /^[A-Za-z0-9_-]{40,64}$/.test(value));
}

export async function createDemoSession(): Promise<{ sessionId: string; expiresAt: number }> {
  const sessionId = randomBytes(32).toString("base64url");
  const now = Date.now();
  const value: StoredDemoSession = { version: 1, mode: "demo", createdAt: now, expiresAt: now + DEMO_SESSION_TTL_SECONDS * 1000 };
  try {
    const result = await getRedis().set(sessionKey(sessionId), JSON.stringify(value), { ex: DEMO_SESSION_TTL_SECONDS, nx: true });
    if (result !== "OK") throw new Error();
    return { sessionId, expiresAt: value.expiresAt };
  } catch {
    throw new DemoSessionStoreError("write");
  }
}

export async function readDemoSession(sessionId: string | undefined): Promise<DemoSession | null> {
  if (!validSessionId(sessionId)) return null;
  let value: unknown;
  try {
    value = await getRedis().get<unknown>(sessionKey(sessionId));
  } catch {
    throw new DemoSessionStoreError("read");
  }
  if (typeof value === "string") {
    try { value = JSON.parse(value) as unknown; } catch { return null; }
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<StoredDemoSession>;
  if (record.version !== 1 || record.mode !== "demo" || typeof record.expiresAt !== "number" || record.expiresAt <= Date.now()) return null;
  return { expiresAt: record.expiresAt };
}

export async function revokeDemoSession(sessionId: string | undefined) {
  if (!validSessionId(sessionId)) return;
  try {
    await getRedis().del(sessionKey(sessionId));
  } catch {
    throw new DemoSessionStoreError("connection");
  }
}

export async function allowDemoLoginAttempt(clientAddress: string) {
  const key = `${RATE_PREFIX}${digest(clientAddress.slice(0, 256) || "unknown")}`;
  try {
    const count = Number(await getRedis().eval(RATE_LIMIT_SCRIPT, [key], [String(RATE_WINDOW_SECONDS)]));
    if (!Number.isSafeInteger(count)) throw new Error();
    return { allowed: count <= MAX_LOGIN_ATTEMPTS, retryAfterSeconds: RATE_WINDOW_SECONDS };
  } catch {
    throw new DemoSessionStoreError("rate-limit");
  }
}
