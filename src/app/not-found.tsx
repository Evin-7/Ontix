import Link from "next/link";
import { House, SearchX } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OntixLogo } from "@/components/branding/ontix-logo";

export default function NotFound() {
  return (
    <main className="route-state">
      <div className="route-state-top"><ThemeToggle /></div>
      <section className="route-state-card">
        <div className="route-state-brand"><OntixLogo size="small" /></div>
        <span className="route-state-icon info-icon"><SearchX size={24} /></span>
        <p className="route-state-kicker">404 · NOT FOUND</p>
        <h1>Page not found</h1>
        <p>This address doesn’t point to a page in your Ontix workspace.</p>
        <div className="route-state-actions">
          <Link className="button button-primary" href="/"><House size={16} /> Go to dashboard</Link>
          <BackButton />
        </div>
      </section>
    </main>
  );
}
