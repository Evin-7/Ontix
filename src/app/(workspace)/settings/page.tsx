import { redirect } from "next/navigation";
import { KeyRound, Palette, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ThemePreferences } from "@/components/foundry/theme-preferences";
import { getOntixDashboardSession } from "@/server/providers/ontix/dashboard-context";
import { getFoundryOAuthConfig } from "@/server/providers/foundry/config";

export default async function SettingsPage() {
  const current = await getOntixDashboardSession();
  if (!current) redirect("/");
  const isDemo = current.mode === "demo";
  const config = isDemo ? null : getFoundryOAuthConfig();
  const writesProjects = !isDemo && ["ADMINISTRATOR", "MANAGER"].includes(current.session.role);
  const writesCases = !isDemo && ["ADMINISTRATOR", "MANAGER", "DEVELOPER"].includes(current.session.role);

  return <div className="foundry-module-page">
    <PageHeader eyebrow="WORKSPACE PREFERENCES" title="Settings" description={isDemo ? "Demo workspace settings and appearance." : "Review your Ontix access, appearance, and live Foundry connection."} />
    <div className="foundry-settings-grid">
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><ShieldCheck size={18} /></span><div><h2>Profile & access</h2><p>{isDemo ? "This workspace uses fictional sample records and is read only." : "Role is mapped from your current Foundry group membership."}</p></div></div>
        <dl className="foundry-settings-details"><div><dt>Identity</dt><dd>{isDemo ? "Demo visitor" : "Authenticated Foundry user"}</dd></div><div><dt>Ontix role</dt><dd><span className="foundry-role-chip">{isDemo ? "DEMO · READ ONLY" : current.session.role.replaceAll("_", " ")}</span></dd></div><div><dt>Session expires</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(current.session.expiresAt))}</dd></div></dl>
      </section>
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><Palette size={18} /></span><div><h2>Appearance</h2><p>Choose a theme for this browser. System follows device settings.</p></div></div>
        <ThemePreferences />
      </section>
      {!isDemo && <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><Server size={18} /></span><div><h2>Foundry connection</h2><p>Connection details are checked server-side and do not expose credentials.</p></div><span className="foundry-settings-status"><i /> Connected</span></div>
        <dl className="foundry-settings-details"><div><dt>Foundry instance</dt><dd>{config?.stackUrl.hostname}</dd></div><div><dt>Business data source</dt><dd>Foundry Ontology · queried per module</dd></div><div><dt>Configured object types</dt><dd>Customer, Project, Employee, Team, Operational Case, Approval Request</dd></div></dl>
      </section>}
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><KeyRound size={18} /></span><div><h2>Capabilities</h2><p>{isDemo ? "Demo accounts can explore sample records only." : "Ontix role gates which actions the interface offers. Foundry remains authoritative for action permissions."}</p></div></div>
        <ul className="foundry-capability-list"><li><span>{isDemo ? "Explore fictional workspace records" : "Read visible Ontology records"}</span><strong>Available</strong></li><li><span>Update project status</span><strong>{writesProjects ? "Role permits" : "Read only"}</strong></li><li><span>Assign or resolve cases</span><strong>{writesCases ? "Role permits" : "Read only"}</strong></li><li><span>Approval decisions</span><strong>Read only</strong></li></ul>
      </section>
      <section className="foundry-settings-card foundry-security-card">
        <div className="foundry-settings-card-heading"><span><ShieldCheck size={18} /></span><div><h2>Security</h2><p>{isDemo ? "Demo access is separate from Foundry authentication." : "Access tokens and session encryption keys remain on the server."}</p></div></div>
        <p className="foundry-security-copy">{isDemo ? "Your demo session is stored server-side and expires automatically." : "Your session uses encrypted server-side storage. Sign out to revoke this Ontix session."}</p>
        <form action={isDemo ? "/api/demo/sign-out" : "/api/foundry/sign-out"} method="post"><button className="foundry-security-signout" type="submit">Sign out of Ontix</button></form>
      </section>
    </div>
  </div>;
}
