"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[Ontix] Workspace module failed", { digest: error.digest });
  }, [error.digest]);
  return (
    <section className="workspace-error" role="alert">
      <span className="workspace-error-icon"><AlertTriangle size={19} aria-hidden="true" /></span>
      <p className="eyebrow">FOUNDRY CONNECTION</p>
      <h1>This workspace view is temporarily unavailable</h1>
      <p>Ontix could not read this module from Foundry. Your session has not been signed out. Try again in a moment.</p>
      <div><Button onClick={() => { reset(); router.refresh(); }}><RefreshCw size={15} aria-hidden="true" /> Retry</Button></div>
    </section>
  );
}
