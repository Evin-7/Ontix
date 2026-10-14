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

      <section className="flex items-center gap-[15px] rounded-xl border border-[color-mix(in_srgb,var(--warning)_28%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_4%,var(--surface))] p-5 max-[820px]:flex-wrap max-[820px]:items-start" aria-labelledby="foundry-integration-title">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface))] text-warning"><PlugZap size={21} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold tracking-[.11em] text-muted">PALANTIR FOUNDRY · OSDK</span>
          <h2 className="mt-[5px] mb-[3px] text-[17px] font-semibold tracking-[-.02em] text-foreground" id="foundry-integration-title">{connected ? "Foundry connection verified" : accountLinked ? "Foundry account linked" : "Foundry is not connected"}</h2>
          <p className="m-0 text-xs leading-[1.5] text-muted">{connected ? "The server completed an authenticated OSDK request to the configured Foundry enrollment." : accountLinked ? "Your Foundry user authorized Ontix. Live OSDK access is still being verified, so Foundry data is not shown as connected." : "Connect with your Foundry user to authorize Ontix. No Foundry data is shown until a live OSDK request succeeds."}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-[7px] rounded-full border px-[9px] py-1.5 text-[11px] font-semibold ${connected ? "border-[color-mix(in_srgb,var(--success)_30%,var(--border))] text-success" : "border-[color-mix(in_srgb,var(--warning)_30%,var(--border))] text-warning"} bg-surface max-[820px]:ml-[59px]`}><i className="size-[7px] rounded-full bg-current" aria-hidden="true" />{connected ? "OSDK verified" : accountLinked ? "OSDK pending" : "Not connected"}</span>
      </section>

      <div className="mt-[14px] grid grid-cols-2 gap-[14px] max-[820px]:grid-cols-1">
        <section className="min-w-0 rounded-xl border border-border bg-surface p-[18px] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-[9px] text-primary"><Network size={17} aria-hidden="true" /><h2 className="m-0 text-sm font-semibold text-foreground">Connection</h2></div>
          <dl className="mt-[14px] grid gap-0">
            <div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-border py-2.5 max-[520px]:grid-cols-[minmax(100px,.65fr)_minmax(0,1.35fr)]"><dt className="text-[11px] text-muted">Active provider</dt><dd className="m-0 [overflow-wrap:anywhere] text-[11px] font-medium text-foreground">{status.currentProvider === "neon-demo" ? "Neon Local Demo" : "Foundry (setup incomplete)"}</dd></div>
            <div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-border py-2.5"><dt className="text-[11px] text-muted">Foundry hostname</dt><dd className="m-0 [overflow-wrap:anywhere] font-mono text-[10px] text-foreground">{status.hostname ?? "Not configured"}</dd></div>
            <div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-border py-2.5"><dt className="text-[11px] text-muted">Foundry user</dt><dd className="m-0 [overflow-wrap:anywhere] text-[11px] font-medium text-foreground">{accountLinked ? `Linked${status.oauthConnectedAt ? ` · ${new Date(status.oauthConnectedAt).toLocaleString()}` : ""}` : "Not linked"}</dd></div>
            <div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-border py-2.5"><dt className="text-[11px] text-muted">Last successful check</dt><dd className="m-0 [overflow-wrap:anywhere] text-[11px] font-medium text-foreground">{status.lastSuccessfulConnectionCheck ? new Date(status.lastSuccessfulConnectionCheck).toLocaleString() : "No successful check recorded"}</dd></div>
          </dl>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface p-[18px] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-[9px] text-primary"><CircleSlash2 size={17} aria-hidden="true" /><h2 className="m-0 text-sm font-semibold text-foreground">Ontology resources</h2></div>
          <dl className="mt-[14px] grid gap-0">
            <div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-border py-2.5 max-[520px]:grid-cols-[minmax(100px,.65fr)_minmax(0,1.35fr)]"><dt className="text-[11px] text-muted">Object types</dt><dd className="m-0 [overflow-wrap:anywhere] text-[11px] font-medium text-foreground">{verification?.ok ? Object.keys(verification.objects).join(", ") : status.objectTypes?.join(", ") ?? "Not loaded · needs a live OSDK request"}</dd></div>
            <div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-border py-2.5"><dt className="text-[11px] text-muted">Actions</dt><dd className="m-0 [overflow-wrap:anywhere] text-[11px] font-medium text-foreground">{status.actions?.join(", ") ?? "Not loaded · permissions not verified"}</dd></div>
            <div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-border py-2.5"><dt className="text-[11px] text-muted">Relationships</dt><dd className="m-0 [overflow-wrap:anywhere] text-[11px] font-medium text-foreground">Not loaded · no live query has run</dd></div>
            {verification?.ok && <div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-border py-2.5"><dt className="text-[11px] text-muted">Sample rows returned</dt><dd className="m-0 [overflow-wrap:anywhere] text-[11px] font-medium text-foreground">{Object.entries(verification.objects).map(([name, count]) => `${name}: ${count}`).join(" · ")}</dd></div>}
          </dl>
        </section>
      </div>

      <section className="mt-[14px] min-w-0 rounded-xl border border-border bg-surface p-[19px] shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-[9px] text-primary"><KeyRound size={17} aria-hidden="true" /><h2 className="m-0 text-sm font-semibold text-foreground">{accountLinked ? "Foundry authorization" : "Connect your Foundry user"}</h2></div>
        <div className="my-[14px] flex flex-wrap items-center gap-2">
          {status.oauthReady ? (
            <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-primary bg-primary px-3.5 text-[13px] font-semibold text-white shadow-sm transition active:translate-y-px hover:not-disabled:border-primary-hover hover:not-disabled:bg-primary-hover dark:text-[#0b1220]" href="/api/foundry/oauth/login">{accountLinked ? "Reconnect Foundry" : "Connect Foundry"}</a>
          ) : (
            <span className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-border bg-surface-muted px-3.5 text-[13px] font-medium text-muted">OAuth setup is incomplete</span>
          )}
          {accountLinked && <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3.5 text-[13px] font-semibold text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={verifyAccess} disabled={isChecking}>{isChecking ? "Checking Foundry…" : "Verify live OSDK access"}</button>}
          {accountLinked && <form action="/api/foundry/oauth/logout" method="post"><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3.5 text-[13px] font-semibold text-foreground transition hover:bg-surface-muted" type="submit">Disconnect Foundry</button></form>}
        </div>
        {verification?.ok && <p className="my-3 max-w-[850px] text-[11px] leading-[1.55] text-muted" role="status" aria-live="polite">
          {`All six object-type reads succeeded at ${new Date(verification.checkedAt).toLocaleString()}. The per-type values above show whether the one-row sample returned data; 0 means the query succeeded but returned no indexed rows.`}
        </p>}
        {accountLinked && <p className="my-3 max-w-[850px] text-[11px] leading-[1.55] text-muted">Disconnect removes the encrypted tokens from Ontix. To revoke Foundry consent too, remove Ontix Web Integration from your Foundry account’s authorized applications.</p>}
        <ul className="m-0 grid list-none gap-2 p-0">
          {(verification?.ok ? status.configurationIssues.filter((issue) => !issue.startsWith("No authenticated Foundry request")) : status.configurationIssues).map((issue) => (
            <li className="flex items-start gap-2 text-[11px] leading-[1.5] text-muted" key={issue}><AlertTriangle className="mt-px shrink-0 text-warning" size={15} aria-hidden="true" /><span>{issue}</span></li>
          ))}
        </ul>
        <div className="mt-4 flex items-start gap-2 rounded-[9px] border border-[color-mix(in_srgb,var(--info)_20%,var(--border))] bg-[color-mix(in_srgb,var(--info)_4%,var(--surface))] px-3 py-[11px] text-[11px] leading-[1.55] text-muted"><CheckCircle2 className="mt-px shrink-0 text-info" size={16} aria-hidden="true" /><span>{status.currentProvider === "neon-demo" ? "Neon is the active Local Demo provider. Its records and simulated relationship explorer are not Foundry Ontology data." : "Foundry is selected but not connected. Ontix stops here and does not use Neon business records as a fallback."}</span></div>
        <a className="mt-[14px] inline-flex items-center gap-[5px] text-[11px] font-semibold text-primary hover:text-primary-hover" href="https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients" target="_blank" rel="noreferrer">
          Palantir OAuth client guide <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </section>
    </>
  );
}
