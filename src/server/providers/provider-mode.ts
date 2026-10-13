import "server-only";

export type DataProviderMode = "neon-demo" | "foundry";

export class ProviderNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderNotReadyError";
  }
}

export function getDataProviderMode(): DataProviderMode {
  const configured = process.env.DATA_PROVIDER?.trim();
  if (!configured || configured === "local") return "neon-demo";
  if (configured === "neon-demo" || configured === "foundry") return configured;
  throw new ProviderNotReadyError(
    `Unsupported DATA_PROVIDER value "${configured}". Use "neon-demo" or "foundry".`,
  );
}

export function requireNeonDemoProvider() {
  if (getDataProviderMode() === "foundry") {
    throw new ProviderNotReadyError(
      "The Foundry provider is not connected. Ontix has no authorized Foundry enrollment or generated Ontology SDK configured, so it stopped without falling back to Neon. Set DATA_PROVIDER=neon-demo to use the Neon demo provider.",
    );
  }
}
