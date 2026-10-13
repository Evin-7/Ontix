import type { ComponentProps } from "react";
import { useFormFieldContext } from "./form-field";

function mergedDescribedBy(existing: string | undefined, field: string | undefined) {
  return [existing, field].filter(Boolean).join(" ") || undefined;
}

export type InputProps = ComponentProps<"input">;

export function Input({ className, id, required, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }: InputProps) {
  const field = useFormFieldContext();

  return (
    <input
      {...props}
      id={id ?? field?.controlId}
      required={required ?? (field?.required || undefined)}
      aria-describedby={mergedDescribedBy(describedBy, field?.describedBy)}
      aria-invalid={invalid ?? (field?.invalid || undefined)}
      className={[
        "ui-input min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error",
        field?.invalid && "ui-input--error",
        className,
      ].filter(Boolean).join(" ")}
    />
  );
}

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, id, required, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }: TextareaProps) {
  const field = useFormFieldContext();

  return (
    <textarea
      {...props}
      id={id ?? field?.controlId}
      required={required ?? (field?.required || undefined)}
      aria-describedby={mergedDescribedBy(describedBy, field?.describedBy)}
      aria-invalid={invalid ?? (field?.invalid || undefined)}
      className={[
        "ui-textarea min-h-24 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error",
        field?.invalid && "ui-textarea--error",
        className,
      ].filter(Boolean).join(" ")}
    />
  );
}
