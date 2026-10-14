import "server-only";

import { Redis } from "@upstash/redis";

const LOGIN_EVENTS_KEY = "ontix:auth:login-events:v1";
const LOGIN_EVENTS_TTL_SECONDS = 90 * 24 * 60 * 60;
const MAX_LOGIN_EVENTS = 500;

export type LoginEventSource = "demo" | "foundry";
export type LoginEventLocation = { country: string; region: string | null } | null;

export type LoginEvent = {
  source: LoginEventSource;
  createdAt: number;
  location: LoginEventLocation;
};

const APPEND_LOGIN_EVENT_SCRIPT = `
redis.call('LPUSH', KEYS[1], ARGV[1])
redis.call('LTRIM', KEYS[1], 0, tonumber(ARGV[2]) - 1)
local existing = redis.call('LRANGE', KEYS[1], 0, -1)
redis.call('DEL', KEYS[1])
local cutoff = tonumber(ARGV[4])
for i = #existing, 1, -1 do
  local value = existing[i]
  local ok, event = pcall(cjson.decode, value)
  local createdAt = nil
  if ok and type(event) == 'table' then createdAt = tonumber(event.createdAt) end
  if createdAt and createdAt >= cutoff then redis.call('RPUSH', KEYS[1], value) end
end
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
return 1
`;

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
    redis = Redis.fromEnv({ readYourWrites: true });
    return redis;
  } catch {
    throw new Error("Login event storage is unavailable.");
  }
}

function parseLoginEvent(value: unknown): LoginEvent | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Partial<LoginEvent>;
  if ((record.source !== "demo" && record.source !== "foundry") || typeof record.createdAt !== "number" || !Number.isSafeInteger(record.createdAt) || record.createdAt <= 0 || record.createdAt > Date.now() + 5 * 60_000) {
    return null;
  }
  return { source: record.source, createdAt: record.createdAt, location: parseLoginEventLocation(record.location) };
}

function parseLoginEventLocation(value: unknown): LoginEventLocation {
  if (!value || typeof value !== "object") return null;
  const location = value as { country?: unknown; region?: unknown };
  const country = typeof location.country === "string" ? location.country.toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(country)) return null;
  const rawRegion = typeof location.region === "string" ? location.region.toUpperCase() : "";
  const region = /^[A-Z0-9]{1,3}$/.test(rawRegion) ? rawRegion : null;
  return { country, region };
}

export function readLoginEventLocation(headers: Headers): LoginEventLocation {
  const country = headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(country)) return null;
  const rawRegion = headers.get("x-vercel-ip-country-region")?.trim().toUpperCase() ?? "";
  const region = /^[A-Z0-9]{1,3}$/.test(rawRegion) ? rawRegion : null;
  return { country, region };
}

export async function recordLoginEvent(source: LoginEventSource, location: LoginEventLocation) {
  const event: LoginEvent = { source, createdAt: Date.now(), location: parseLoginEventLocation(location) };
  await getRedis().eval(APPEND_LOGIN_EVENT_SCRIPT, [LOGIN_EVENTS_KEY], [
    JSON.stringify(event),
    String(MAX_LOGIN_EVENTS),
    String(LOGIN_EVENTS_TTL_SECONDS),
    String(event.createdAt - LOGIN_EVENTS_TTL_SECONDS * 1000),
  ]);
}

export async function getRecentLoginEvents(limit = 20): Promise<LoginEvent[]> {
  const boundedLimit = Math.max(1, Math.min(Math.floor(limit), MAX_LOGIN_EVENTS));
  const values = await getRedis().lrange<unknown>(LOGIN_EVENTS_KEY, 0, boundedLimit - 1);
  return values.map(parseLoginEvent).filter((event): event is LoginEvent => event !== null);
}
