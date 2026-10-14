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
      <p className="eyebrow">WORKSPACE STATUS</p>
      <h1>This workspace view is temporarily unavailable</h1>
      <p>We couldn’t load this view. Your session is still active. Try again in a moment.</p>
      <div><Button onClick={() => { reset(); router.refresh(); }}><RefreshCw size={15} aria-hidden="true" /> Retry</Button></div>
    </section>
  );
}
