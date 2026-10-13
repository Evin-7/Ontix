import "server-only";

import { getDataProviderMode } from "@/server/providers/provider-mode";
import { isFoundryOAuthConfigured } from "@/server/providers/foundry/config";
import type { FoundryIntegrationStatus } from "@/types/integrations";

function getFoundryHostname(value: string | undefined) {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".palantirfoundry.com")) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

export function getFoundryIntegrationStatus(): FoundryIntegrationStatus {
  const hostname = getFoundryHostname(process.env.FOUNDRY_STACK_URL);
  const oauthReady = isFoundryOAuthConfigured();
  const configurationIssues = [
    ...(!hostname ? ["Set FOUNDRY_STACK_URL to the HTTPS hostname for your Foundry enrollment."] : []),
    ...(!process.env.FOUNDRY_CLIENT_ID?.trim() ? ["Configure the public OAuth client ID from Developer Console."] : []),
    ...(!process.env.FOUNDRY_TOKEN_ENCRYPTION_KEY?.trim() ? ["Configure a private 32-byte FOUNDRY_TOKEN_ENCRYPTION_KEY for encrypted token storage."] : []),
    ...(!process.env.BETTER_AUTH_SECRET?.trim() ? ["Configure BETTER_AUTH_SECRET before linking a Foundry user to an Ontix account."] : []),
    "No authenticated Foundry request has succeeded; connection status remains Not connected.",
  ];

  return {
    currentProvider: getDataProviderMode(),
    connectionStatus: "not-connected",
    oauthReady,
    oauthAccountLinked: false,
    oauthConnectedAt: null,
    hostname,
    objectTypes: null,
    actions: null,
    lastSuccessfulConnectionCheck: null,
    configurationIssues,
  };
}
