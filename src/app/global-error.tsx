"use client";

import "./globals.css";
import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OntixLogo } from "@/components/branding/ontix-logo";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <main className="route-state">
              <div className="route-state-top"><ThemeToggle /></div>
              <section className="route-state-card" role="alert">
                <div className="route-state-brand"><OntixLogo size="small" /></div>
                <span className="route-state-icon error-icon"><TriangleAlert size={24} /></span>
                <p className="route-state-kicker">APPLICATION ERROR</p>
                <h1>Something went wrong</h1>
                <p>We couldn’t display this page. Try again or return to your workspace.</p>
                <div className="route-state-actions">
                  <button className="button button-primary" onClick={reset}><RefreshCw size={16} /> Try again</button>
                  <Link className="button button-secondary" href="/">Return to dashboard</Link>
                </div>
              </section>
            </main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
