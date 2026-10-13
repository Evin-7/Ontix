import { CircleDashed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";

export type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}>;

export function EmptyState({
  title,
  description,
  icon: Icon = CircleDashed,
  action,
  className,
}: EmptyStateProps) {
  const titleId = useId();

  return (
    <section
      className={[
        "ui-empty-state flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-6 text-center",
        className,
      ].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
      role="status"
    >
      <span className="ui-empty-state__icon mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-primary-subtle text-primary" aria-hidden="true">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <h2 className="ui-empty-state__title text-sm font-semibold text-foreground" id={titleId}>{title}</h2>
      <p className="ui-empty-state__description mt-1 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action && <div className="ui-empty-state__action mt-4">{action}</div>}
    </section>
  );
}
