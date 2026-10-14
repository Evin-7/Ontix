"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function DemoPasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="demo-password-field">
      <input
        id="demo-password"
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        required
        minLength={12}
        maxLength={128}
      />
      <button
        className="demo-password-toggle"
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
