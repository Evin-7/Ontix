import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const LEGACY_TOKEN_AAD = Buffer.from("ontix-foundry-oauth-token:v1", "utf8");

export type FoundryTokenKind = "access" | "refresh" | "state";

function tokenAad(authUserId: string, kind: FoundryTokenKind) {
  if (!authUserId || authUserId.length > 512) throw new Error("Foundry token data is unavailable.");
  return Buffer.from(`ontix-foundry-oauth-token:v2:${kind}:${Buffer.from(authUserId, "utf8").toString("base64url")}`, "utf8");
}

function tokenKey() {
  const encoded = process.env.FOUNDRY_TOKEN_ENCRYPTION_KEY?.trim();
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("Foundry token encryption is not configured.");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("Foundry token encryption is not configured.");
  return key;
}

export function encryptFoundryToken(token: string, authUserId: string, kind: FoundryTokenKind) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  cipher.setAAD(tokenAad(authUserId, kind));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v2", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptFoundryToken(encrypted: string, authUserId: string, kind: FoundryTokenKind) {
  const [version, ivText, tagText, ciphertextText, ...extra] = encrypted.split(".");
  if ((version !== "v1" && version !== "v2") || !ivText || !tagText || ciphertextText === undefined || extra.length) {
    throw new Error("Foundry token data is unavailable.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivText, "base64url"));
    decipher.setAAD(version === "v1" ? LEGACY_TOKEN_AAD : tokenAad(authUserId, kind));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Foundry token data is unavailable.");
  }
}

export function isLegacyFoundryToken(encrypted: string) {
  return encrypted.startsWith("v1.");
}
