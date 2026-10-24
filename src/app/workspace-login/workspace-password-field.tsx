"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function WorkspacePasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        className="min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface py-0 pl-[11px] pr-[46px] text-sm text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-primary/15"
        id="workspace-password"
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        required
        minLength={12}
        maxLength={128}
      />
      <button
        className="absolute top-1/2 right-[7px] grid size-[34px] -translate-y-1/2 place-items-center rounded-[7px] border-0 bg-transparent text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-offset-1"
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
      </button>
    </div>
  );
}
