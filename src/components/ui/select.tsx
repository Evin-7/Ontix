import type { ComponentProps } from "react";
import { useFormFieldContext } from "./form-field";

export type SelectProps = ComponentProps<"select">;

export function Select({ className, id, required, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }: SelectProps) {
  const field = useFormFieldContext();
  const ariaDescribedBy = [describedBy, field?.describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <select
      {...props}
      id={id ?? field?.controlId}
      required={required ?? (field?.required || undefined)}
      aria-describedby={ariaDescribedBy}
      aria-invalid={invalid ?? (field?.invalid || undefined)}
      className={[
        "ui-select min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error",
        field?.invalid && "ui-select--error",
        className,
      ].filter(Boolean).join(" ")}
    />
  );
}
