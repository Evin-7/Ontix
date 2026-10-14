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
  return <div className="foundry-theme-options" role="group" aria-label="Color theme">
    {options.map(({ value, label, Icon }) => <button key={value} type="button" aria-pressed={theme === value} className={theme === value ? "is-selected" : ""} onClick={() => setTheme(value)}>
      <Icon size={17} aria-hidden="true" />{label}
    </button>)}
  </div>;
}
