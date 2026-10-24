import "server-only";

import { createHash, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { demoSessionCookieName, isDemoSessionStoreConfigured, readDemoSession, type DemoSession } from "./session-store";

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
// Public credentials for the fictional, read-only workspace. Environment
// variables can replace this pair for deployments that want private access.
const BUILT_IN_DEMO_USERNAME = "ontix-demo-9307c64bea87@example.com";
const BUILT_IN_DEMO_PASSWORD_HASH = "scrypt-v1:16384:8:1:rgyqIndDMSlRLdysrRUN8A:FHZBKmpe8vZx6ZQwdgqnPlMDD4HKB-yqqK5Ls82tTux2jgYQLUjL0zBwz0Qzxw8QSjnj5crNE9wByVjxS0p_oA";

function derivePasswordKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, {
      N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION, maxmem: SCRYPT_MAX_MEMORY,
    }, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
}

type PasswordHash = { salt: Buffer; key: Buffer };

function parsePasswordHash(value: string | undefined): PasswordHash | null {
  if (!value) return null;
  // Use a dotenv-safe delimiter: Next.js expands `$` references in env files.
  const [version, cost, blockSize, parallelization, saltText, keyText, extra] = value.split(":");
  if (version !== "scrypt-v1" || cost !== String(SCRYPT_COST) || blockSize !== String(SCRYPT_BLOCK_SIZE) || parallelization !== String(SCRYPT_PARALLELIZATION) || !saltText || !keyText || extra !== undefined) return null;
  const salt = Buffer.from(saltText, "base64url");
  const key = Buffer.from(keyText, "base64url");
  if (salt.length < 16 || salt.length > 64 || key.length !== SCRYPT_KEY_LENGTH || salt.toString("base64url") !== saltText || key.toString("base64url") !== keyText) return null;
  return { salt, key };
}

export function isDemoAuthenticationConfigured() {
  const { username, passwordHash } = getDemoCredentials();
  return Boolean(username && username.length >= 3 && username.length <= 254 && passwordHash && isDemoSessionStoreConfigured());
}

export async function verifyDemoCredentials(usernameInput: string, passwordInput: string) {
  const { username: configuredUsername, passwordHash } = getDemoCredentials();
  if (!configuredUsername || !passwordHash || usernameInput.length > 254 || passwordInput.length < 12 || passwordInput.length > 128) return false;

  const expectedUsername = createHash("sha256").update(configuredUsername.toLowerCase()).digest();
  const submittedUsername = createHash("sha256").update(usernameInput.trim().toLowerCase()).digest();
  const submittedKey = await derivePasswordKey(passwordInput, passwordHash.salt);
  const usernameMatches = timingSafeEqual(expectedUsername, submittedUsername);
  const passwordMatches = timingSafeEqual(passwordHash.key, submittedKey);
  return usernameMatches && passwordMatches;
}

function getDemoCredentials() {
  const username = (process.env.ONTIX_WORKSPACE_USERNAME ?? process.env.ONTIX_DEMO_USERNAME)?.trim();
  const passwordHash = parsePasswordHash(process.env.ONTIX_WORKSPACE_PASSWORD_HASH ?? process.env.ONTIX_DEMO_PASSWORD_HASH);
  if (username && username.length >= 3 && username.length <= 254 && passwordHash) return { username, passwordHash };
  return { username: BUILT_IN_DEMO_USERNAME, passwordHash: parsePasswordHash(BUILT_IN_DEMO_PASSWORD_HASH) };
}

export async function getCurrentDemoSession(): Promise<{ cookiePresent: boolean; session: DemoSession | null }> {
  const cookieStore = await cookies();
  const id = cookieStore.get(demoSessionCookieName())?.value;
  if (!id) return { cookiePresent: false, session: null };
  return { cookiePresent: true, session: await readDemoSession(id) };
}

export async function hasDemoSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.has(demoSessionCookieName());
}
