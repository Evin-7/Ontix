"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

type FormFieldContextValue = Readonly<{
  controlId: string;
  invalid: boolean;
  required: boolean;
  describedBy?: string;
}>;

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export function useFormFieldContext() {
  return useContext(FormFieldContext);
}

export type FormFieldProps = Readonly<{
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}>;

export function FormField({
  label,
  hint,
  error,
  required = false,
  id,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const describedBy = hintId;

  return (
    <FormFieldContext.Provider value={{ controlId, invalid: Boolean(error), required, describedBy }}>
      <div className={["ui-field grid gap-1.5", error && "ui-field--error", className].filter(Boolean).join(" ")}>
        <label className="ui-field__label text-sm font-medium text-foreground" htmlFor={controlId}>
          {label}
          {required && <span className="ui-field__required ml-1 text-error" aria-hidden="true">*</span>}
        </label>
        {children}
        {hint && <p className="ui-field__hint text-xs leading-5 text-muted" id={hintId}>{hint}</p>}
      </div>
    </FormFieldContext.Provider>
  );
}
