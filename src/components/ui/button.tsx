import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  children?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-hover",
  secondary: "border border-border bg-surface-muted text-foreground hover:bg-border",
  outline: "border border-border bg-surface text-foreground hover:bg-surface-muted",
  ghost: "bg-transparent text-muted hover:bg-surface-muted hover:text-foreground",
  destructive: "bg-error text-white shadow-sm hover:bg-error/90",
  link: "h-auto min-h-0 bg-transparent px-0 text-primary underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-2 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
  icon: "size-10 p-0",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  disabled,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "ui-button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent font-medium transition-colors active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading ? "true" : undefined}
    >
      {loading && <LoaderCircle className="ui-button__spinner animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
