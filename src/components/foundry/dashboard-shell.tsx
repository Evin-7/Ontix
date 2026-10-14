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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [resultQuery, setResultQuery] = useState("");
  const [failedQuery, setFailedQuery] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!open || normalizedQuery.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPendingQuery(normalizedQuery);
      try {
        const response = await fetch(`/api/foundry/search?q=${encodeURIComponent(query.trim())}`, {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search unavailable");
        const payload = await response.json() as { results?: SearchResult[] };
        setResults(payload.results ?? []);
        setResultQuery(normalizedQuery);
        setFailedQuery("");
      } catch {
        if (!controller.signal.aborted) setFailedQuery(normalizedQuery);
      } finally {
        if (!controller.signal.aborted) setPendingQuery(null);
      }
    }, 280);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  const groups = useMemo(() => results.reduce<Record<string, SearchResult[]>>((all, result) => {
    (all[result.type] ??= []).push(result);
    return all;
  }, {}), [results]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const isCurrentPending = pendingQuery === normalizedQuery;
  const hasCurrentError = normalizedQuery.length >= 2 && failedQuery === normalizedQuery;
  const currentGroups = resultQuery === normalizedQuery ? groups : {};

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setQuery(""); }}>
      <DialogContent size="lg" className="foundry-search-dialog" aria-describedby="foundry-search-description">
        <DialogHeader>
          <DialogTitle>Search the workspace</DialogTitle>
          <DialogDescription id="foundry-search-description">Search records you can access in the Foundry Ontology.</DialogDescription>
        </DialogHeader>
        <label className="foundry-search-input-wrap">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search records</span>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, cases, people…" />
          <kbd>ESC</kbd>
        </label>
        <div className="foundry-search-results" aria-live="polite">
          {query.trim().length < 2 && <p className="foundry-search-hint">Type at least 2 characters to search Foundry records.</p>}
          {isCurrentPending && <p className="foundry-search-hint">Searching Foundry…</p>}
          {hasCurrentError && <p className="foundry-search-hint foundry-search-error">Search is temporarily unavailable. Your session is unchanged.</p>}
          {!isCurrentPending && !hasCurrentError && query.trim().length >= 2 && resultQuery === normalizedQuery && results.length === 0 && <p className="foundry-search-hint">No matching records are visible to this account.</p>}
          {!isCurrentPending && !hasCurrentError && Object.entries(currentGroups).map(([type, matches]) => (
            <section className="foundry-search-group" key={type}>
              <h3>{type}</h3>
              {matches.map((result) => <Link key={`${type}:${result.id}`} href={result.href as Route} onClick={() => onOpenChange(false)}>
                <span className="foundry-search-result-icon"><Search size={14} aria-hidden="true" /></span>
                <span><strong>{result.title}</strong><small>{result.subtitle}</small></span>
                <span className="foundry-search-result-id">{result.id}</span>
              </Link>)}
            </section>
          ))}
        </div>
        <div className="foundry-search-footer"><span><kbd>⌘</kbd> <kbd>K</kbd> to search</span><span>Results follow Foundry access</span></div>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardShell({ children, role }: { children: React.ReactNode; role: FoundryRole }) {
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
    <aside className={`foundry-sidebar ${collapsed && !mobile ? "is-collapsed" : ""} ${mobile ? "is-mobile" : ""}`} aria-label="Main navigation">
      <div className="foundry-sidebar-brand">
        <Link href="/overview" aria-label="Ontix overview" onClick={() => setMobileOpen(false)}>
          <OntixLogo variant={collapsed && !mobile ? "icon" : "full"} size="medium" />
        </Link>
        {mobile ? <button className="foundry-icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button> : <button className="foundry-collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronLeft size={16} className={collapsed ? "rotate-180" : ""} /></button>}
      </div>
      <div className="foundry-workspace-label"><span className="foundry-workspace-mark"><OntixLogo variant="icon" size="small" decorative /></span><span><strong>Ontix Operations</strong><small>Foundry workspace</small></span></div>
      <nav className="foundry-nav">
        {sections.map((section) => <div className="foundry-nav-section" key={section.title}>
          <p>{section.title}</p>
          {section.links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/overview" && pathname.startsWith(`${href}/`));
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} title={collapsed && !mobile ? label : undefined} className={`foundry-nav-link ${active ? "is-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
            </Link>;
          })}
        </div>)}
      </nav>
      <div className="foundry-sidebar-bottom">
        <div className="foundry-connection-card"><span className="connection-dot online" /><span><strong>Foundry connected</strong><small>Live Ontology access</small></span><ShieldCheck size={16} aria-label="Connected" /></div>
        <div className="foundry-profile"><span className="foundry-avatar">F</span><span><strong>Foundry user</strong><small>{role.replaceAll("_", " ").toLowerCase()}</small></span></div>
        <form action="/api/foundry/sign-out" method="post"><button className="foundry-signout" type="submit">Sign out</button></form>
      </div>
    </aside>
  );

  return (
    <div className={`foundry-app ${collapsed ? "sidebar-collapsed" : ""}`}>
      {sidebar()}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent size="sm" centered={false} showCloseButton={false} className="foundry-mobile-drawer" aria-label="Main navigation">
          <DialogTitle className="sr-only">Main navigation</DialogTitle>
          {sidebar(true)}
        </DialogContent>
      </Dialog>
      <div className="foundry-main-column">
        <header className="foundry-topbar">
          <div className="foundry-topbar-left">
            <button className="foundry-icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="foundry-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
          </div>
          <div className="foundry-topbar-actions">
            <button className="foundry-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search workspace">
              <Search size={16} aria-hidden="true" /><span>Search records</span><kbd><Command size={11} aria-hidden="true" /> K</kbd>
            </button>
            <span className="foundry-topbar-connection"><i /> <span>Foundry</span></span>
            <ThemeToggle />
            <Link className="foundry-topbar-avatar" href="/settings" aria-label="Account and settings">{role.slice(0, 1)}</Link>
          </div>
        </header>
        <main className="foundry-page-content">{children}</main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
