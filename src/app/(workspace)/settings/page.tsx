import { redirect } from "next/navigation";
import { History, KeyRound, Palette, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ThemePreferences } from "@/components/foundry/theme-preferences";
import { getOntixDashboardSession } from "@/server/providers/ontix/dashboard-context";
import { getFoundryOAuthConfig } from "@/server/providers/foundry/config";
import { getRecentLoginEvents, type LoginEventLocation } from "@/server/providers/ontix/login-events";

function formatLoginLocation(location: LoginEventLocation) {
  if (!location) return "Unavailable";
  const country = new Intl.DisplayNames(["en"], { type: "region" }).of(location.country) ?? location.country;
  return location.region ? `${country} · ${location.region}` : country;
}

export default async function SettingsPage() {
  const current = await getOntixDashboardSession();
  if (!current) redirect("/");
  const isDemo = current.mode === "demo";
  const config = isDemo ? null : getFoundryOAuthConfig();
  const writesProjects = !isDemo && ["ADMINISTRATOR", "MANAGER"].includes(current.session.role);
  const writesCases = !isDemo && ["ADMINISTRATOR", "MANAGER", "DEVELOPER"].includes(current.session.role);
  let loginEvents = null;
  if (!isDemo && ["ADMINISTRATOR", "MANAGER"].includes(current.session.role)) {
    try {
      loginEvents = await getRecentLoginEvents();
    } catch {
      console.error("[Settings] Sign-in history could not be loaded.");
    }
  }

  return <div className="grid gap-5 max-[760px]:gap-4">
    <PageHeader className="!mb-0 max-[760px]:!items-start [&>div>p]:text-[9px] [&>div>p]:tracking-[.14em] [&>div>p]:text-primary [&>div>h1]:text-[clamp(27px,2.6vw,35px)] [&>div>h1]:font-semibold [&>div>h1]:tracking-[-.045em]" eyebrow="WORKSPACE PREFERENCES" title="Settings" />
    <div className="grid grid-cols-2 items-stretch gap-[13px] max-[760px]:grid-cols-1 max-[760px]:gap-2.5">
      <section className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)] max-[760px]:p-4">
        <div className="flex min-w-0 items-center gap-[11px] max-[760px]:flex-wrap"><span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary"><ShieldCheck size={18} /></span><div className="min-w-0 flex-1"><h2 className="m-0 text-[13px] font-semibold">Profile & access</h2></div></div>
        <dl className="mt-[17px] grid gap-0"><div className="flex min-w-0 justify-between gap-3 border-t border-border py-[11px] max-[390px]:items-start max-[390px]:flex-col max-[390px]:gap-[5px]"><dt className="text-[10px] text-muted">Identity</dt><dd className="m-0 max-w-[65%] text-right text-[10px] text-foreground [overflow-wrap:anywhere] max-[390px]:max-w-none max-[390px]:text-left">{isDemo ? "Workspace visitor" : "Authenticated Foundry user"}</dd></div><div className="flex min-w-0 justify-between gap-3 border-t border-border py-[11px] max-[390px]:items-start max-[390px]:flex-col max-[390px]:gap-[5px]"><dt className="text-[10px] text-muted">Ontix role</dt><dd className="m-0 max-w-[65%] text-right text-[10px] text-foreground [overflow-wrap:anywhere] max-[390px]:max-w-none max-[390px]:text-left"><span className="rounded-[5px] bg-primary-subtle px-[7px] py-1 text-[9px] font-semibold text-primary capitalize">{isDemo ? "SAMPLE · READ ONLY" : current.session.role.replaceAll("_", " ")}</span></dd></div><div className="flex min-w-0 justify-between gap-3 border-t border-border py-[11px] max-[390px]:items-start max-[390px]:flex-col max-[390px]:gap-[5px]"><dt className="text-[10px] text-muted">Session expires</dt><dd className="m-0 max-w-[65%] text-right text-[10px] text-foreground [overflow-wrap:anywhere] max-[390px]:max-w-none max-[390px]:text-left">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(current.session.expiresAt))}</dd></div></dl>
      </section>
      <section className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)] max-[760px]:p-4">
        <div className="flex min-w-0 items-center gap-[11px] max-[760px]:flex-wrap"><span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary"><Palette size={18} /></span><div className="min-w-0 flex-1"><h2 className="m-0 text-[13px] font-semibold">Appearance</h2></div></div>
        <ThemePreferences />
      </section>
      {!isDemo && <section className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)] max-[760px]:p-4">
        <div className="flex min-w-0 items-center gap-[11px] max-[760px]:flex-wrap"><span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary"><Server size={18} /></span><div className="min-w-0 flex-1"><h2 className="m-0 text-[13px] font-semibold">Foundry connection</h2></div><span className="inline-flex shrink-0 items-center gap-[7px] text-[9px] font-semibold text-success max-[760px]:ml-11"><i className="size-1.5 rounded-full bg-success" /> Connected</span></div>
        <dl className="mt-[17px] grid gap-0"><div className="flex min-w-0 justify-between gap-3 border-t border-border py-[11px] max-[390px]:items-start max-[390px]:flex-col max-[390px]:gap-[5px]"><dt className="text-[10px] text-muted">Foundry instance</dt><dd className="m-0 max-w-[65%] text-right text-[10px] text-foreground [overflow-wrap:anywhere] max-[390px]:max-w-none max-[390px]:text-left">{config?.stackUrl.hostname}</dd></div><div className="flex min-w-0 justify-between gap-3 border-t border-border py-[11px] max-[390px]:items-start max-[390px]:flex-col max-[390px]:gap-[5px]"><dt className="text-[10px] text-muted">Business data source</dt><dd className="m-0 max-w-[65%] text-right text-[10px] text-foreground [overflow-wrap:anywhere] max-[390px]:max-w-none max-[390px]:text-left">Foundry Ontology · queried per module</dd></div><div className="flex min-w-0 justify-between gap-3 border-t border-border py-[11px] max-[390px]:items-start max-[390px]:flex-col max-[390px]:gap-[5px]"><dt className="text-[10px] text-muted">Configured object types</dt><dd className="m-0 max-w-[65%] text-right text-[10px] text-foreground [overflow-wrap:anywhere] max-[390px]:max-w-none max-[390px]:text-left">Customer, Project, Employee, Team, Operational Case, Approval Request</dd></div></dl>
      </section>}
      <section className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)] max-[760px]:p-4">
        <div className="flex min-w-0 items-center gap-[11px] max-[760px]:flex-wrap"><span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary"><KeyRound size={18} /></span><div className="min-w-0 flex-1"><h2 className="m-0 text-[13px] font-semibold">Capabilities</h2></div></div>
        <ul className="mt-[17px] grid list-none gap-0 p-0"><li className="flex justify-between gap-2.5 border-t border-border py-2.5 text-[10px] text-muted"><span>{isDemo ? "Browse fictional workspace records" : "Read visible Ontology records"}</span><strong className="text-right text-[9px] font-medium text-foreground">Available</strong></li><li className="flex justify-between gap-2.5 border-t border-border py-2.5 text-[10px] text-muted"><span>Update project status</span><strong className="text-right text-[9px] font-medium text-foreground">{writesProjects ? "Role permits" : "Read only"}</strong></li><li className="flex justify-between gap-2.5 border-t border-border py-2.5 text-[10px] text-muted"><span>Assign or resolve cases</span><strong className="text-right text-[9px] font-medium text-foreground">{writesCases ? "Role permits" : "Read only"}</strong></li><li className="flex justify-between gap-2.5 border-t border-border py-2.5 text-[10px] text-muted"><span>Approval decisions</span><strong className="text-right text-[9px] font-medium text-foreground">Read only</strong></li></ul>
      </section>
      {loginEvents && <section className="col-span-full min-w-0 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)] max-[760px]:col-span-1">
        <div className="flex min-w-0 items-center gap-[11px] max-[760px]:flex-wrap"><span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary"><History size={18} /></span><div className="min-w-0 flex-1"><h2 className="m-0 text-[13px] font-semibold">Recent sign-ins</h2></div><span className="ml-auto text-[10px] text-muted">90 days</span></div>
        {loginEvents.length === 0 ? <p className="mt-[18px] mb-0 text-[11px] text-muted">No sign-ins recorded yet.</p> : <div className="mt-[15px] max-h-[520px] overflow-y-auto" role="table" aria-label="Recent sign-ins">
          <div className="grid grid-cols-[minmax(140px,1fr)_minmax(120px,auto)_minmax(190px,auto)] items-center gap-4 pb-[9px] text-[10px] font-semibold text-muted max-[500px]:grid-cols-[minmax(0,1fr)_auto] max-[500px]:gap-2"><span role="columnheader">Sign-in</span><span className="max-[500px]:hidden" role="columnheader">Location</span><span className="text-right" role="columnheader">Time</span></div>
          {loginEvents.map((event, index) => <div className="grid grid-cols-[minmax(140px,1fr)_minmax(120px,auto)_minmax(190px,auto)] items-center gap-4 border-t border-border py-[11px] text-[11px] max-[500px]:grid-cols-[minmax(0,1fr)_auto] max-[500px]:gap-2" role="row" key={`${event.createdAt}-${event.source}-${index}`}>
            <span className="font-medium text-foreground" role="cell">{event.source === "demo" ? "Workspace" : "Palantir"}<span className="mt-1 hidden text-[10px] font-normal text-muted max-[500px]:block">{formatLoginLocation(event.location)}</span></span>
            <span className="text-muted max-[500px]:hidden" role="cell">{formatLoginLocation(event.location)}</span>
            <time className="text-right tabular-nums text-muted max-[500px]:text-[10px]" role="cell" dateTime={new Date(event.createdAt).toISOString()}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(event.createdAt))} IST</time>
          </div>)}
        </div>}
      </section>}
    </div>
  </div>;
}
