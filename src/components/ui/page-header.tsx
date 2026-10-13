import type { ReactNode } from "react";

export type PageHeaderProps = Readonly<{
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={["ui-page-header mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end", className].filter(Boolean).join(" ")}>
      <div className="ui-page-header__copy min-w-0">
        {eyebrow && <p className="ui-page-header__eyebrow mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>}
        <h1 className="ui-page-header__title text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="ui-page-header__description mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="ui-page-header__actions flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
