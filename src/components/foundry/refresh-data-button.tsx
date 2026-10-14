"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshDataButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button variant="outline" size="sm" loading={pending} onClick={() => startTransition(() => router.refresh())} aria-label={pending ? "Refreshing data" : "Refresh data"} loadingLabel="Refreshing…">
    {!pending && <RefreshCw size={15} aria-hidden="true" />}Refresh
  </Button>;
}
