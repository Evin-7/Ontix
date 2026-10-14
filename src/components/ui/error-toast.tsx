"use client";

import { useEffect } from "react";
import { notify } from "@/lib/notifications";

export function ErrorToast({ message, clearQueryParams = [] }: { message?: string; clearQueryParams?: string[] }) {
  const queryParamKey = clearQueryParams.join("\u001f");

  useEffect(() => {
    if (!message) return;
    notify.error({ title: message });

    if (queryParamKey) {
      const url = new URL(window.location.href);
      queryParamKey.split("\u001f").forEach((key) => url.searchParams.delete(key));
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [message, queryParamKey]);

  return null;
}
