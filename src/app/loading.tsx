import { OntixLogo } from "@/components/branding/ontix-logo";

export default function Loading() {
  return (
    <main className="route-state" aria-busy="true" aria-live="polite">
      <section className="route-state-card loading-card">
        <OntixLogo size="medium" className="loading-brand" />
        <h1>Preparing your workspace</h1>
        <p>Checking your secure Foundry session.</p>
        <div className="loading-indicator" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="sr-only">Loading Ontix operations workspace</span>
      </section>
    </main>
  );
}
