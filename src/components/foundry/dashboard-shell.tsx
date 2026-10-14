"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, BriefcaseBusiness, CheckCheck, ChevronLeft, Command, ContactRound,
  LayoutDashboard, Menu, Search, Settings2, ShieldCheck, UsersRound, X,
} from "lucide-react";
import { OntixLogo } from "@/components/branding/ontix-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notify } from "@/lib/notifications";
type FoundryRole = "ADMINISTRATOR" | "MANAGER" | "DEVELOPER" | "ANALYST";

const sections = [
  { title: "WORKSPACE", links: [
    { href: "/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
    { href: "/cases", label: "Cases", icon: Activity },
    { href: "/customers", label: "Customers", icon: ContactRound },
  ] },
  { title: "ORGANIZATION", links: [
    { href: "/employees", label: "Employees", icon: UsersRound },
    { href: "/teams", label: "Teams", icon: UsersRound },
    { href: "/approvals", label: "Approvals", icon: CheckCheck },
  ] },
  { title: "SYSTEM", links: [
    { href: "/settings", label: "Settings", icon: Settings2 },
  ] },
] as const;

const titles: Record<string, string> = {
  "/overview": "Overview", "/projects": "Projects", "/cases": "Cases",
  "/customers": "Customers", "/employees": "Employees", "/teams": "Teams",
  "/approvals": "Approvals", "/settings": "Settings",
};

type SearchResult = { id: string; type: string; title: string; subtitle: string; href: string };

function GlobalSearch({ open, onOpenChange, isDemo }: { open: boolean; onOpenChange: (open: boolean) => void; isDemo: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [resultQuery, setResultQuery] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!open || normalizedQuery.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPendingQuery(normalizedQuery);
      try {
        const endpoint = isDemo ? "/api/demo/search" : "/api/foundry/search";
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(query.trim())}`, {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search unavailable");
        const payload = await response.json() as { results?: SearchResult[] };
        setResults(payload.results ?? []);
        setResultQuery(normalizedQuery);
      } catch {
        if (!controller.signal.aborted) notify.error({ title: "Search is temporarily unavailable. Your session is unchanged." });
      } finally {
        if (!controller.signal.aborted) setPendingQuery(null);
      }
    }, 280);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, isDemo]);

  const groups = useMemo(() => results.reduce<Record<string, SearchResult[]>>((all, result) => {
    (all[result.type] ??= []).push(result);
    return all;
  }, {}), [results]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const isCurrentPending = pendingQuery === normalizedQuery;
  const currentGroups = resultQuery === normalizedQuery ? groups : {};

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setQuery(""); }}>
      <DialogContent size="lg" className="!overflow-hidden !p-0 max-[760px]:!w-[calc(100vw-20px)]">
        <DialogHeader className="!m-0 !px-6 !pt-[22px] !pb-4 max-[760px]:!px-[17px] max-[760px]:!pt-[18px] max-[760px]:!pb-3">
          <DialogTitle>Search the workspace</DialogTitle>
        </DialogHeader>
        <label className="group mx-5 flex min-h-[46px] items-center gap-2.5 rounded-[9px] border border-border bg-surface-muted px-3 text-muted focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-subtle)] max-[760px]:mx-[13px]">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search records</span>
          <input autoFocus className="w-full border-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, cases, people…" />
          <kbd className="shrink-0 rounded border border-border bg-surface px-[5px] py-0.5 text-[9px] text-muted">ESC</kbd>
        </label>
        <div className="max-h-[min(58vh,490px)] overflow-y-auto px-5 pt-[11px] pb-4 max-[760px]:px-[13px]" aria-live="polite">
          {query.trim().length < 2 && <p className="m-0 px-[5px] py-[22px] text-center text-[11px] text-muted">Type at least 2 characters to search.</p>}
          {isCurrentPending && <p className="m-0 px-[5px] py-[22px] text-center text-[11px] text-muted">Searching…</p>}
          {!isCurrentPending && query.trim().length >= 2 && resultQuery === normalizedQuery && results.length === 0 && <p className="m-0 px-[5px] py-[22px] text-center text-[11px] text-muted">No matching records are visible to this account.</p>}
          {!isCurrentPending && Object.entries(currentGroups).map(([type, matches]) => (
            <section className="pt-2" key={type}>
              <h3 className="m-0 px-0.5 py-1 text-[9px] font-bold tracking-[.12em] text-muted uppercase">{type}</h3>
              {matches.map((result) => <Link className="flex min-w-0 items-center gap-[9px] rounded-[7px] px-1.5 py-2 hover:bg-surface-muted" key={`${type}:${result.id}`} href={result.href as Route} onClick={() => onOpenChange(false)}>
                <span className="grid size-[27px] shrink-0 place-items-center rounded-[7px] bg-primary-subtle text-primary"><Search size={14} aria-hidden="true" /></span>
                <span className="grid min-w-0 flex-1 gap-[3px]"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold">{result.title}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-muted">{result.subtitle}</small></span>
                <span className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[9px] text-muted">{result.id}</span>
              </Link>)}
            </section>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-[21px] py-[11px] text-[9px] text-muted max-[760px]:px-[14px]"><span className="flex items-center gap-1"><kbd className="rounded border border-border bg-surface px-[5px] py-0.5 text-[9px]">⌘</kbd> <kbd className="rounded border border-border bg-surface px-[5px] py-0.5 text-[9px]">K</kbd> to search</span><span>Results follow your access</span></div>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardShell({ children, role, mode }: { children: React.ReactNode; role: FoundryRole | "DEMO"; mode: "foundry" | "demo" }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const title = titles[pathname] ?? "Workspace";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const sidebar = (mobile = false) => (
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[var(--sidebar-width)] flex-col border-r border-border bg-surface px-[15px] pt-[22px] pb-[15px] transition-[width] duration-[180ms] ${mobile ? "!static !inset-auto !h-full !w-full !rounded-none !border-0 !px-[15px] !pt-5 !pb-[14px]" : "max-[760px]:hidden"} ${collapsed && !mobile ? "w-[76px] px-[10px]" : ""}`} aria-label="Main navigation">
      <div className={`flex min-h-[42px] items-center justify-between px-[5px] pl-[7px] ${collapsed && !mobile ? "justify-center !p-0" : ""}`}>
        <Link className="flex min-w-0 items-center" href="/overview" aria-label="Ontix overview" onClick={() => setMobileOpen(false)}>
          {collapsed && !mobile ? <OntixLogo className="w-8" variant="icon" size="medium" /> : mobile ? <OntixLogo className="w-[129px]" variant="full" size="medium" /> : <><OntixLogo className="w-[129px] max-[1100px]:hidden" variant="full" size="medium" /><OntixLogo className="hidden w-8 max-[1100px]:block" variant="icon" size="medium" /></>}
        </Link>
        {mobile ? <button className="inline-grid size-9 shrink-0 place-items-center rounded-lg border border-transparent bg-transparent text-muted hover:border-border hover:bg-surface-muted hover:text-foreground" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button> : <button className={`inline-grid size-9 shrink-0 place-items-center rounded-lg border border-transparent bg-transparent text-muted hover:border-border hover:bg-surface-muted hover:text-foreground ${collapsed ? "absolute top-[25px] -right-[13px] size-[26px] border-border bg-surface shadow-[var(--shadow-sm)] max-[1100px]:hidden" : "max-[1100px]:hidden"}`} onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronLeft size={16} className={`transition-transform duration-[180ms] ${collapsed ? "rotate-180" : ""}`} /></button>}
      </div>
      <div className={`my-[25px] mx-px mb-5 flex min-w-0 items-center gap-2.5 rounded-[10px] border border-border bg-surface-muted px-2.5 py-[11px] ${collapsed && !mobile ? "justify-center px-[3px] py-[9px]" : ""}`}><span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-primary text-white"><OntixLogo className="size-[23px] [&_g]:!text-white" variant="icon" size="small" decorative /></span><span className={`grid min-w-0 gap-[3px] ${collapsed && !mobile ? "hidden" : !mobile ? "max-[1100px]:hidden" : ""}`}><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold">Ontix Operations</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted capitalize">Enterprise workspace</small></span></div>
      <nav className="grid gap-[17px] overflow-y-auto px-[3px]">
        {sections.map((section) => <div className="grid gap-[3px]" key={section.title}>
          <p className={`m-0 mb-[5px] px-2.5 text-[9px] font-bold tracking-[.13em] text-muted ${collapsed && !mobile ? "hidden" : !mobile ? "max-[1100px]:hidden" : ""}`}>{section.title}</p>
          {section.links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/overview" && pathname.startsWith(`${href}/`));
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} title={collapsed && !mobile ? label : undefined} className={`flex min-h-[39px] min-w-0 items-center gap-[11px] rounded-lg border border-transparent px-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground ${active ? "bg-primary-subtle font-semibold text-primary" : ""} ${collapsed && !mobile ? "justify-center px-0" : !mobile ? "max-[1100px]:justify-center max-[1100px]:px-0" : ""}`}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span className={`overflow-hidden text-ellipsis whitespace-nowrap ${collapsed && !mobile ? "hidden" : !mobile ? "max-[1100px]:hidden" : ""}`}>{label}</span>
            </Link>;
          })}
        </div>)}
      </nav>
      <div className="mt-auto grid gap-[11px] pt-[15px]">
        <div className={`flex min-w-0 items-center gap-2 rounded-[9px] border border-border bg-surface-muted px-[9px] py-[11px] ${collapsed && !mobile ? "justify-center px-0" : !mobile ? "max-[1100px]:justify-center max-[1100px]:px-0" : ""}`}><span className="size-[7px] shrink-0 rounded-full bg-success" /><span className={`grid min-w-0 gap-[3px] ${collapsed && !mobile ? "hidden" : !mobile ? "max-[1100px]:hidden" : ""}`}><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold">{mode === "demo" ? "Demo Workspace" : "Foundry connected"}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-muted capitalize">{mode === "demo" ? "Fictional sample records" : "Live Ontology access"}</small></span>{mode === "foundry" && <ShieldCheck className={`${collapsed && !mobile ? "hidden" : !mobile ? "ml-auto shrink-0 text-success max-[1100px]:hidden" : "ml-auto shrink-0 text-success"}`} size={16} aria-label="Connected" />}</div>
        <div className={`flex min-w-0 items-center gap-[9px] px-1.5 pt-[7px] pb-px ${collapsed && !mobile ? "justify-center px-0" : !mobile ? "max-[1100px]:justify-center max-[1100px]:px-0" : ""}`}><span className="grid size-[31px] shrink-0 place-items-center rounded-full border border-primary/20 bg-primary-subtle text-xs font-bold text-primary uppercase">{mode === "demo" ? "D" : "F"}</span><span className={`grid min-w-0 gap-[3px] ${collapsed && !mobile ? "hidden" : !mobile ? "max-[1100px]:hidden" : ""}`}><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold">{mode === "demo" ? "Demo visitor" : "Foundry user"}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-muted capitalize">{mode === "demo" ? "Read only" : role.replaceAll("_", " ").toLowerCase()}</small></span></div>
        <form className={collapsed && !mobile ? "hidden" : !mobile ? "max-[1100px]:hidden" : ""} action={mode === "demo" ? "/api/demo/sign-out" : "/api/foundry/sign-out"} method="post"><button className="min-h-8 w-full rounded-[7px] border border-border bg-transparent px-[9px] text-left text-[10px] text-muted hover:bg-surface-muted hover:text-foreground" type="submit">Sign out</button></form>
      </div>
    </aside>
  );

  return (
    <div className={`min-h-dvh [--sidebar-width:258px] max-[1100px]:[--sidebar-width:76px] max-[760px]:[--sidebar-width:0px] ${collapsed ? "[--sidebar-width:76px]" : ""}`}>
      {sidebar()}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent size="sm" centered={false} showCloseButton={false} className="!top-0 !left-0 !h-dvh !max-h-dvh !w-[min(300px,86vw)] !max-w-none !translate-x-0 !translate-y-0 !overflow-hidden !rounded-r-[14px] !rounded-l-none !border-0 !p-0" aria-label="Main navigation">
          <DialogTitle className="sr-only">Main navigation</DialogTitle>
          {sidebar(true)}
        </DialogContent>
      </Dialog>
      <div className="min-h-dvh ml-[var(--sidebar-width)] transition-[margin-left] duration-[180ms] max-[760px]:ml-0">
        <header className="sticky top-0 z-[15] flex min-h-[66px] items-center justify-between gap-4 border-b border-border bg-background/95 px-[clamp(22px,3vw,42px)] backdrop-blur-[14px] max-[760px]:min-h-[60px] max-[760px]:px-[15px] max-[390px]:gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <button className="hidden size-[34px] shrink-0 place-items-center rounded-lg border border-transparent bg-transparent text-muted hover:border-border hover:bg-surface-muted hover:text-foreground max-[760px]:inline-grid" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="flex min-w-0 items-center gap-2.5 text-xs text-muted max-[390px]:gap-[7px] max-[390px]:text-[10px]"><span>Workspace</span><span className="text-border" aria-hidden="true">/</span><strong className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-foreground">{title}</strong></div>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 max-[760px]:gap-1.5 max-[390px]:gap-1">
            <button className="flex min-h-9 min-w-[194px] items-center gap-2 rounded-lg border border-border bg-surface px-[9px] text-left text-[11px] text-muted hover:text-foreground max-[760px]:size-[37px] max-[760px]:min-w-[37px] max-[760px]:justify-center max-[760px]:p-0 [&>span]:max-[760px]:hidden [&>kbd]:max-[760px]:hidden" onClick={() => setSearchOpen(true)} aria-label="Search workspace">
              <Search size={16} aria-hidden="true" /><span>Search records</span><kbd className="ml-auto inline-flex items-center gap-0.5 rounded border border-border bg-surface-muted px-[5px] py-0.5 text-[9px]"><Command size={11} aria-hidden="true" /> K</kbd>
            </button>
            <span className={`inline-flex items-center gap-1.5 text-[10px] text-muted max-[760px]:[&>span]:hidden ${mode === "demo" ? "font-semibold text-primary" : ""}`}><i className="size-[7px] rounded-full bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_13%,transparent)]" /> <span>{mode === "demo" ? "Demo workspace" : "Foundry"}</span></span>
            <ThemeToggle className="!h-9 !min-h-9 !gap-2 !rounded-lg !border-border !bg-surface !px-[9px] !text-[11px] !font-medium !text-muted !shadow-none max-[760px]:!min-w-0 max-[760px]:!justify-center" />
            <Link className="grid size-[30px] shrink-0 place-items-center rounded-full border border-primary/20 bg-primary-subtle text-xs font-bold text-primary uppercase max-[390px]:size-[27px]" href="/settings" aria-label="Account and settings">{role.slice(0, 1)}</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-[clamp(20px,3vw,42px)] pt-[31px] pb-[54px] max-[760px]:px-[15px] max-[760px]:pt-[23px] max-[760px]:pb-10">{children}</main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} isDemo={mode === "demo"} />
    </div>
  );
}
