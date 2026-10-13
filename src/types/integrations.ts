export type FoundryIntegrationStatus = {
  currentProvider: "neon-demo" | "foundry";
  connectionStatus: "connected" | "not-connected";
  oauthReady: boolean;
  oauthAccountLinked: boolean;
  oauthConnectedAt: string | null;
  hostname: string | null;
  objectTypes: string[] | null;
  actions: string[] | null;
  lastSuccessfulConnectionCheck: string | null;
  configurationIssues: string[];
};
