import { getDataProviderMode } from "@/server/providers/provider-mode";
import { OntixLogo } from "@/components/branding/ontix-logo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function FoundryProviderSetup() {
  return (
    <main className="provider-setup-page">
      <section className="provider-setup-card">
        <OntixLogo size="medium" />
        <span className="eyebrow">FOUNDRY PROVIDER · SETUP REQUIRED</span>
        <h1>Foundry is not connected</h1>
        <p>
          Ontix does not have an authorized Foundry enrollment or a generated
          Ontology SDK configured. The request stopped here; it did not read or
          write Neon records as a Foundry fallback.
        </p>
        <ol>
          <li>
            Create an account through Palantir’s{" "}
            <a href="https://build.palantir.com/" target="_blank" rel="noreferrer">
              AIP Developer Tier
            </a>
            .
          </li>
          <li>
            Create a backend service application in Developer Console and
            generate an OSDK for your Ontology.
          </li>
          <li>
            Configure the generated SDK and confidential OAuth credentials
            server-side, then finish the Foundry adapter before selecting this
            mode.
          </li>
        </ol>
        <p className="provider-setup-note">
          Set <code>DATA_PROVIDER=neon-demo</code> to return to the separate Neon
          Local Demo provider.
        </p>
      </section>
    </main>
  );
}

export default async function HomePage() {
  if (getDataProviderMode() === "foundry") return <FoundryProviderSetup />;

  // Keep the Neon auth/database module graph out of the Foundry setup path.
  const NeonHome = (await import("./neon-home")).default;
  return <NeonHome />;
}
