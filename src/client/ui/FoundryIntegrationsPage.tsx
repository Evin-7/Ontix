"use client";

import { useState, useTransition } from "react";
import { verifyFoundryConnection } from "@/app/foundry-actions";
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleSlash2, KeyRound, Network, PlugZap } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { notify } from "@/lib/notifications";
import type { FoundryIntegrationStatus } from "@/types/integrations";

export function FoundryIntegrationsPage({ status }: { status: FoundryIntegrationStatus }) {
  const [verification, setVerification] = useState<Awaited<ReturnType<typeof verifyFoundryConnection>> | null>(null);
  const [isChecking, startTransition] = useTransition();
  const connected = status.connectionStatus === "connected" || verification?.ok === true;
  const accountLinked = status.oauthAccountLinked;

  function verifyAccess() {
    startTransition(async () => {
      const result = await verifyFoundryConnection();
      setVerification(result);
      if (!result.ok) notify.error({ title: result.error });
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="PLATFORM INTEGRATIONS"
        title="Integrations"
      />

      <section className="integration-hero panel" aria-labelledby="foundry-integration-title">
        <div className="integration-hero-mark"><PlugZap size={21} aria-hidden="true" /></div>
        <div className="integration-hero-copy">
          <span className="eyebrow">PALANTIR FOUNDRY · OSDK</span>
          <h2 id="foundry-integration-title">{connected ? "Foundry connection verified" : accountLinked ? "Foundry account linked" : "Foundry is not connected"}</h2>
          <p>{connected ? "The server completed an authenticated OSDK request to the configured Foundry enrollment." : accountLinked ? "Your Foundry user authorized Ontix. Live OSDK access is still being verified, so Foundry data is not shown as connected." : "Connect with your Foundry user to authorize Ontix. No Foundry data is shown until a live OSDK request succeeds."}</p>
        </div>
        <span className={`integration-status ${connected ? "connected" : ""}`}><i aria-hidden="true" />{connected ? "OSDK verified" : accountLinked ? "OSDK pending" : "Not connected"}</span>
      </section>

      <div className="integration-grid">
        <section className="panel integration-panel">
          <div className="integration-panel-heading"><Network size={17} aria-hidden="true" /><h2>Connection</h2></div>
          <dl className="integration-details">
            <div><dt>Active provider</dt><dd>{status.currentProvider === "neon-demo" ? "Neon Local Demo" : "Foundry (setup incomplete)"}</dd></div>
            <div><dt>Foundry hostname</dt><dd className="integration-mono">{status.hostname ?? "Not configured"}</dd></div>
            <div><dt>Foundry user</dt><dd>{accountLinked ? `Linked${status.oauthConnectedAt ? ` · ${new Date(status.oauthConnectedAt).toLocaleString()}` : ""}` : "Not linked"}</dd></div>
            <div><dt>Last successful check</dt><dd>{status.lastSuccessfulConnectionCheck ? new Date(status.lastSuccessfulConnectionCheck).toLocaleString() : "No successful check recorded"}</dd></div>
          </dl>
        </section>

        <section className="panel integration-panel">
          <div className="integration-panel-heading"><CircleSlash2 size={17} aria-hidden="true" /><h2>Ontology resources</h2></div>
          <dl className="integration-details">
            <div><dt>Object types</dt><dd>{verification?.ok ? Object.keys(verification.objects).join(", ") : status.objectTypes?.join(", ") ?? "Not loaded · needs a live OSDK request"}</dd></div>
            <div><dt>Actions</dt><dd>{status.actions?.join(", ") ?? "Not loaded · permissions not verified"}</dd></div>
            <div><dt>Relationships</dt><dd>Not loaded · no live query has run</dd></div>
            {verification?.ok && <div><dt>Sample rows returned</dt><dd>{Object.entries(verification.objects).map(([name, count]) => `${name}: ${count}`).join(" · ")}</dd></div>}
          </dl>
        </section>
      </div>

      <section className="panel integration-setup-panel">
        <div className="integration-panel-heading"><KeyRound size={17} aria-hidden="true" /><h2>{accountLinked ? "Foundry authorization" : "Connect your Foundry user"}</h2></div>
        <div className="integration-actions">
          {status.oauthReady ? (
            <a className="button button-primary" href="/api/foundry/oauth/login">{accountLinked ? "Reconnect Foundry" : "Connect Foundry"}</a>
          ) : (
            <span className="integration-connect-disabled">OAuth setup is incomplete</span>
          )}
          {accountLinked && <button className="button button-secondary" type="button" onClick={verifyAccess} disabled={isChecking}>{isChecking ? "Checking Foundry…" : "Verify live OSDK access"}</button>}
          {accountLinked && <form action="/api/foundry/oauth/logout" method="post"><button className="button button-secondary" type="submit">Disconnect Foundry</button></form>}
        </div>
        {verification?.ok && <p className="integration-note" role="status" aria-live="polite">
          {`All six object-type reads succeeded at ${new Date(verification.checkedAt).toLocaleString()}. The per-type values above show whether the one-row sample returned data; 0 means the query succeeded but returned no indexed rows.`}
        </p>}
        {accountLinked && <p className="integration-note">Disconnect removes the encrypted tokens from Ontix. To revoke Foundry consent too, remove Ontix Web Integration from your Foundry account’s authorized applications.</p>}
        <ul className="integration-issues">
          {(verification?.ok ? status.configurationIssues.filter((issue) => !issue.startsWith("No authenticated Foundry request")) : status.configurationIssues).map((issue) => (
            <li key={issue}><AlertTriangle size={15} aria-hidden="true" /><span>{issue}</span></li>
          ))}
        </ul>
        <div className="integration-evidence-note"><CheckCircle2 size={16} aria-hidden="true" /><span>{status.currentProvider === "neon-demo" ? "Neon is the active Local Demo provider. Its records and simulated relationship explorer are not Foundry Ontology data." : "Foundry is selected but not connected. Ontix stops here and does not use Neon business records as a fallback."}</span></div>
        <a className="integration-doc-link" href="https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients" target="_blank" rel="noreferrer">
          Palantir OAuth client guide <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </section>
    </>
  );
}
