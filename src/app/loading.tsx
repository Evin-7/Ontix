import { Activity } from "lucide-react";

export default function Loading() {
  return (
    <main className="route-state" aria-busy="true" aria-live="polite">
      <section className="route-state-card loading-card">
        <div className="route-state-brand">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-word">ONTIX</span>
        </div>
        <span className="route-state-icon loading-mark" aria-hidden="true"><Activity size={24} /></span>
        <h1>Preparing your workspace</h1>
        <p>Your operations data is loading securely.</p>
        <div className="route-skeletons" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="sr-only">Loading Ontix operations workspace</span>
      </section>
    </main>
  );
}
