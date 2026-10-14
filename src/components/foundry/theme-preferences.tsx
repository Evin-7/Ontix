"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemePreferences() {
  const { theme, setTheme } = useTheme();
  return <div className="mt-[18px] flex flex-wrap gap-[7px]" role="group" aria-label="Color theme">
    {options.map(({ value, label, Icon }) => <button key={value} type="button" aria-pressed={theme === value} className="flex min-h-[37px] items-center gap-[7px] rounded-[7px] border border-border bg-surface px-[11px] text-[10px] text-muted aria-pressed:border-primary/40 aria-pressed:bg-primary-subtle aria-pressed:font-semibold aria-pressed:text-primary" onClick={() => setTheme(value)}>
      <Icon size={17} aria-hidden="true" />{label}
    </button>)}
  </div>;
}
