import { randomBytes, randomInt, scryptSync } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const username = process.env.ONTIX_WORKSPACE_USERNAME?.trim() || "ontix-workspace";
if (!/^[A-Za-z0-9._@+-]{3,254}$/.test(username)) throw new Error("ONTIX_WORKSPACE_USERNAME must be 3–254 safe characters.");

async function generateEasyToTypePassword() {
  const candidates = new Set();
  for (const path of ["/usr/share/dict/words", "/usr/share/dict/web2"]) {
    try {
      const contents = await readFile(path, "utf8");
      for (const word of contents.split(/\s+/)) {
        const normalized = word.toLowerCase();
        if (/^[a-z]{4,8}$/.test(normalized)) candidates.add(normalized);
      }
    } catch {}
  }
  const words = [...candidates];
  if (words.length < 10_000) throw new Error("A system word list is required to generate a memorable temporary password.");
  return Array.from({ length: 5 }, () => words[randomInt(words.length)]).join("-");
}

const password = await generateEasyToTypePassword();
const salt = randomBytes(16);
const key = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt-v1:16384:8:1:${salt.toString("base64url")}:${key.toString("base64url")}`;

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
envText = setEnvValue(envText, "ONTIX_WORKSPACE_USERNAME", username);
envText = setEnvValue(envText, "ONTIX_WORKSPACE_PASSWORD_HASH", passwordHash);
await writeFile(envPath, envText, { mode: 0o600 });
await chmod(envPath, 0o600);

const credentialDirectory = join(homedir(), ".config", "ontix");
const credentialPath = join(credentialDirectory, "workspace-credentials.txt");
await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });
await chmod(credentialDirectory, 0o700);
await writeFile(credentialPath, `Ontix workspace access\nUsername: ${username}\nPassword: ${password}\n\nKeep this file private. Rotate credentials with npm run workspace:credentials. Update ONTIX_WORKSPACE_PASSWORD_HASH in the hosting environment and redeploy after rotation.\n`, { mode: 0o600 });
await chmod(credentialPath, 0o600);

console.log(`Configured read-only workspace access for ${username}. Password saved locally to ${credentialPath} with owner-only permissions.`);
