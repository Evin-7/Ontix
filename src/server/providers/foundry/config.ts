import "server-only";

export const FOUNDRY_OAUTH_SCOPES = [
  "api:use-ontologies-read",
  "api:use-ontologies-write",
  "offline_access",
] as const;

export class FoundryConfigurationError extends Error {
  constructor(message = "Foundry OAuth is not configured on this server.") {
    super(message);
    this.name = "FoundryConfigurationError";
  }
}

export type FoundryOAuthConfig = {
  stackUrl: URL;
  clientId: string;
  redirectUri: string;
  applicationUrl: URL;
};

export function getFoundryApplicationUrl() {
  const value = process.env.ONTIX_APPLICATION_URL?.trim() || process.env.BETTER_AUTH_URL?.trim();
  try {
    if (process.env.NODE_ENV === "production" && !value) throw new Error();
    const url = new URL(value || "http://127.0.0.1:3000");
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    if (process.env.NODE_ENV === "production") {
      if (url.protocol !== "https:") throw new Error();
    } else if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    ) {
      throw new Error();
    }
    return new URL(url.origin);
  } catch {
    throw new FoundryConfigurationError("Set ONTIX_APPLICATION_URL to the canonical Ontix application origin.");
  }
}

export function getFoundryOAuthConfig(): FoundryOAuthConfig {
  const stackValue = process.env.FOUNDRY_STACK_URL?.trim();
  const clientId = process.env.FOUNDRY_CLIENT_ID?.trim();
  const callback = process.env.FOUNDRY_REDIRECT_URI?.trim();
  let stackUrl: URL;
  let redirectUrl: URL;
  let applicationUrl: URL;

  try {
    if (!stackValue) throw new Error();
    stackUrl = new URL(stackValue);
    if (
      stackUrl.protocol !== "https:" ||
      !stackUrl.hostname.endsWith(".palantirfoundry.com") ||
      stackUrl.username || stackUrl.password || stackUrl.search || stackUrl.hash || stackUrl.pathname !== "/"
    ) throw new Error();
  } catch {
    throw new FoundryConfigurationError("Set FOUNDRY_STACK_URL to the HTTPS origin for your Foundry enrollment.");
  }

  if (!clientId || clientId.length > 512) {
    throw new FoundryConfigurationError("Set FOUNDRY_CLIENT_ID to the public OAuth client ID from Developer Console.");
  }

  try {
    applicationUrl = getFoundryApplicationUrl();
    redirectUrl = new URL(callback || "/api/foundry/oauth/callback", applicationUrl);
    if (
      redirectUrl.origin !== applicationUrl.origin ||
      redirectUrl.pathname !== "/api/foundry/oauth/callback" ||
      redirectUrl.search || redirectUrl.hash
    ) throw new Error();
    if (process.env.NODE_ENV === "production") {
      if (redirectUrl.protocol !== "https:") throw new Error();
    } else if (
      redirectUrl.protocol !== "https:" &&
      !(redirectUrl.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(redirectUrl.hostname))
    ) {
      throw new Error();
    }
  } catch {
    throw new FoundryConfigurationError("Set FOUNDRY_REDIRECT_URI to the registered Ontix OAuth callback URL.");
  }

  return { stackUrl, clientId, redirectUri: redirectUrl.toString(), applicationUrl };
}

export function isFoundryOAuthConfigured() {
  try {
    getFoundryOAuthConfig();
    const keyValue = process.env.FOUNDRY_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
    const key = Buffer.from(keyValue, "base64");
    return key.length === 32 && Boolean(process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32);
  } catch {
    return false;
  }
}
