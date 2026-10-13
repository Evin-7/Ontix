"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const subscribe = () => () => undefined;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const isDark = mounted && resolvedTheme === "dark";
  const Icon = !mounted ? Monitor : isDark ? Sun : Moon;
  const label = !mounted
    ? "Color theme"
    : isDark
      ? "Switch to light theme"
      : "Switch to dark theme";

  return (
    <button
      type="button"
      className="ui-theme-toggle inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Icon size={18} aria-hidden="true" />
      <span className="ui-theme-toggle__label">Theme</span>
    </button>
  );
}
