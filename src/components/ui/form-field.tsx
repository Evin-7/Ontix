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
      <div className={["grid gap-1.5", className].filter(Boolean).join(" ")}>
        <label className="text-sm font-medium text-foreground" htmlFor={controlId}>
          {label}
          {required && <span className="ml-1 text-error" aria-hidden="true">*</span>}
        </label>
        {children}
        {hint && <p className="text-xs leading-5 text-muted" id={hintId}>{hint}</p>}
      </div>
    </FormFieldContext.Provider>
  );
}
