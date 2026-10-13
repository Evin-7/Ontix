import Link from "next/link";
import { House, LockKeyhole } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OntixLogo } from "@/components/branding/ontix-logo";

export default function AccessDeniedPage() {
  return (
    <main className="route-state">
      <div className="route-state-top"><ThemeToggle /></div>
      <section className="route-state-card">
        <div className="route-state-brand"><OntixLogo size="small" /></div>
        <span className="route-state-icon warning-icon"><LockKeyhole size={24} /></span>
        <p className="route-state-kicker">403 · ACCESS CONTROL</p>
        <h1>Access denied</h1>
        <p>Your account doesn’t have permission to open this workspace area. Contact your administrator if you think this is a mistake.</p>
        <div className="route-state-actions">
          <Link className="button button-primary" href="/"><House size={16} /> Return to dashboard</Link>
          <BackButton />
        </div>
      </section>
    </main>
  );
}
