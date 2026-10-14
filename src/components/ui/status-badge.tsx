import type { HTMLAttributes } from "react";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const statusTones: Record<string, StatusTone> = {
  ACTIVE: "success",
  APPROVED: "success",
  COMPLETED: "success",
  RESOLVED: "success",
  IN_PROGRESS: "info",
  OPEN: "info",
  PLANNING: "info",
  PENDING: "warning",
  WAITING_APPROVAL: "warning",
  AT_RISK: "warning",
  ON_HOLD: "warning",
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
  REJECTED: "danger",
  CLOSED: "neutral",
  ARCHIVED: "neutral",
  ESCALATED: "danger",
};

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-border bg-surface-muted text-muted",
  info: "border-info/20 bg-info/10 text-info",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-error/20 bg-error/10 text-error",
};

function formatStatus(status: string) {
  return status
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export type StatusBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  status: string;
  label?: string;
  tone?: StatusTone;
};

export function StatusBadge({ status, label, tone, className, ...props }: StatusBadgeProps) {
  const normalized = status.trim().toUpperCase();
  const resolvedTone = tone ?? statusTones[normalized] ?? "neutral";

  return (
    <span
      {...props}
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        toneClasses[resolvedTone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-tone={resolvedTone}
    >
      {label ?? formatStatus(status)}
    </span>
  );
}
