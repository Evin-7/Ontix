import { randomBytes, scryptSync } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const username = process.env.ONTIX_DEMO_USERNAME?.trim() || "ontix-recruiter";
if (!/^[A-Za-z0-9._@+-]{3,254}$/.test(username)) throw new Error("ONTIX_DEMO_USERNAME must be 3–254 safe characters.");

const password = randomBytes(24).toString("base64url");
const salt = randomBytes(16);
const key = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt-v1$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;

const envPath = join(process.cwd(), ".env.local");
let envText = "";
try { envText = await readFile(envPath, "utf8"); } catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
function setEnvValue(text, name, value) {
  const line = `${name}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  return pattern.test(text) ? text.replace(pattern, line) : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;
}
envText = setEnvValue(envText, "ONTIX_DEMO_USERNAME", username);
envText = setEnvValue(envText, "ONTIX_DEMO_PASSWORD_HASH", passwordHash);
await writeFile(envPath, envText, { mode: 0o600 });
await chmod(envPath, 0o600);

const credentialDirectory = join(homedir(), ".config", "ontix");
const credentialPath = join(credentialDirectory, "demo-credentials.txt");
await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });
await chmod(credentialDirectory, 0o700);
await writeFile(credentialPath, `ONTIX recruiter demo\nUsername: ${username}\nPassword: ${password}\n\nKeep this file private. Rotate credentials with npm run demo:credentials. Update ONTIX_DEMO_PASSWORD_HASH in Vercel Production and redeploy after rotation.\n`, { mode: 0o600 });
await chmod(credentialPath, 0o600);

console.log(`Configured the demo login for ${username}. Password saved locally to ${credentialPath} with owner-only permissions.`);
