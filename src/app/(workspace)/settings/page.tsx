import { redirect } from "next/navigation";
import { History, KeyRound, Palette, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ThemePreferences } from "@/components/foundry/theme-preferences";
import { getOntixDashboardSession } from "@/server/providers/ontix/dashboard-context";
import { getFoundryOAuthConfig } from "@/server/providers/foundry/config";
import { getRecentLoginEvents } from "@/server/providers/ontix/login-events";

export default async function SettingsPage() {
  const current = await getOntixDashboardSession();
  if (!current) redirect("/");
  const isDemo = current.mode === "demo";
  const config = isDemo ? null : getFoundryOAuthConfig();
  const writesProjects = !isDemo && ["ADMINISTRATOR", "MANAGER"].includes(current.session.role);
  const writesCases = !isDemo && ["ADMINISTRATOR", "MANAGER", "DEVELOPER"].includes(current.session.role);
  let loginEvents = null;
  if (!isDemo && current.session.role === "ADMINISTRATOR") {
    try {
      loginEvents = await getRecentLoginEvents();
    } catch {
      console.error("[Settings] Sign-in history could not be loaded.");
    }
  }

  return <div className="foundry-module-page">
    <PageHeader eyebrow="WORKSPACE PREFERENCES" title="Settings" />
    <div className="foundry-settings-grid">
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><ShieldCheck size={18} /></span><div><h2>Profile & access</h2></div></div>
        <dl className="foundry-settings-details"><div><dt>Identity</dt><dd>{isDemo ? "Demo visitor" : "Authenticated Foundry user"}</dd></div><div><dt>Ontix role</dt><dd><span className="foundry-role-chip">{isDemo ? "DEMO · READ ONLY" : current.session.role.replaceAll("_", " ")}</span></dd></div><div><dt>Session expires</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(current.session.expiresAt))}</dd></div></dl>
      </section>
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><Palette size={18} /></span><div><h2>Appearance</h2></div></div>
        <ThemePreferences />
      </section>
      {!isDemo && <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><Server size={18} /></span><div><h2>Foundry connection</h2></div><span className="foundry-settings-status"><i /> Connected</span></div>
        <dl className="foundry-settings-details"><div><dt>Foundry instance</dt><dd>{config?.stackUrl.hostname}</dd></div><div><dt>Business data source</dt><dd>Foundry Ontology · queried per module</dd></div><div><dt>Configured object types</dt><dd>Customer, Project, Employee, Team, Operational Case, Approval Request</dd></div></dl>
      </section>}
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><KeyRound size={18} /></span><div><h2>Capabilities</h2></div></div>
        <ul className="foundry-capability-list"><li><span>{isDemo ? "Explore fictional workspace records" : "Read visible Ontology records"}</span><strong>Available</strong></li><li><span>Update project status</span><strong>{writesProjects ? "Role permits" : "Read only"}</strong></li><li><span>Assign or resolve cases</span><strong>{writesCases ? "Role permits" : "Read only"}</strong></li><li><span>Approval decisions</span><strong>Read only</strong></li></ul>
      </section>
      <section className="foundry-settings-card foundry-security-card">
        <div className="foundry-settings-card-heading"><span><ShieldCheck size={18} /></span><div><h2>Security</h2></div></div>
        <form action={isDemo ? "/api/demo/sign-out" : "/api/foundry/sign-out"} method="post"><button className="foundry-security-signout" type="submit">Sign out of Ontix</button></form>
      </section>
      {loginEvents && <section className="foundry-settings-card foundry-login-activity-card">
        <div className="foundry-settings-card-heading"><span><History size={18} /></span><div><h2>Recent sign-ins</h2></div><span className="foundry-login-retention">90 days</span></div>
        {loginEvents.length === 0 ? <p className="foundry-login-empty">No sign-ins recorded yet.</p> : <div className="foundry-login-events" role="table" aria-label="Recent sign-ins">
          <div className="foundry-login-events-heading" role="row"><span role="columnheader">Sign-in</span><span role="columnheader">Time</span></div>
          {loginEvents.map((event, index) => <div className="foundry-login-event" role="row" key={`${event.createdAt}-${event.source}-${index}`}>
            <span className="foundry-login-event-source" role="cell">{event.source === "demo" ? "Demo workspace" : "Palantir"}</span>
            <time role="cell" dateTime={new Date(event.createdAt).toISOString()}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(event.createdAt))} IST</time>
          </div>)}
        </div>}
      </section>}
    </div>
  </div>;
}
