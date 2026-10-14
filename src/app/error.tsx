"use client";

import { Database, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OntixLogo } from "@/components/branding/ontix-logo";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="route-state">
      <div className="route-state-top"><ThemeToggle /></div>
      <section className="route-state-card" role="alert">
        <div className="route-state-brand"><OntixLogo size="small" /></div>
        <span className="route-state-icon error-icon"><Database size={24} /></span>
        <p className="route-state-kicker">SERVICE STATUS</p>
        <h1>We couldn’t load this workspace</h1>
        <p>Your session is still active. Try again, or contact your administrator if the problem continues.</p>
        <div className="route-state-actions">
          <button className="button button-primary" onClick={reset}>
            <RefreshCw size={16} /> Try again
          </button>
          <Link className="button button-secondary" href="/login">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
