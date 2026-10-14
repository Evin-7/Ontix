import type { ReactNode } from "react";

export type PageHeaderProps = Readonly<{
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function PageHeader({ title, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={["mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end", className].filter(Boolean).join(" ")}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
