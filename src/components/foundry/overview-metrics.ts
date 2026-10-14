import type { OverviewChartSpec, OverviewChartValue } from "./overview-chart-types";

const projectStatusColors: Record<string, string> = {
  PLANNING: "#818cf8",
  IN_PROGRESS: "#4f46e5",
  AT_RISK: "#f59e0b",
  COMPLETED: "#14b8a6",
};

const priorityColors: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#10b981",
};

const caseStatusColors: Record<string, string> = {
  OPEN: "#3b82f6",
  IN_PROGRESS: "#6366f1",
  WAITING_APPROVAL: "#f59e0b",
  ESCALATED: "#ef4444",
  RESOLVED: "#10b981",
  CLOSED: "#64748b",
};

const approvalStatusColors: Record<string, string> = {
  PENDING: "#f59e0b",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  CANCELLED: "#64748b",
};

const fallbackColor = "#94a3b8";

function readableLabel(value: string) {
  return value.toLocaleLowerCase().split("_").map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1)).join(" ");
}

export function countBreakdown<T>(
  records: readonly T[],
  getValue: (record: T) => string,
  palette: Readonly<Record<string, string>>,
): OverviewChartValue[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = getValue(record)?.trim() || "UNKNOWN";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts]
    .map(([value, count]) => ({ value, label: readableLabel(value), count, color: palette[value] ?? fallbackColor }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function buildOverviewCharts(data: {
  projects: readonly { status: string }[];
  cases: readonly { priority: string; status: string }[];
  approvals: readonly { status: string }[];
}): OverviewChartSpec[] {
  return [
    { title: "Project status", href: "/projects", filterKey: "status", kind: "donut", data: countBreakdown(data.projects, (item) => item.status, projectStatusColors) },
    { title: "Case priority", href: "/cases", filterKey: "priority", kind: "bar", data: countBreakdown(data.cases, (item) => item.priority, priorityColors) },
    { title: "Case status", href: "/cases", filterKey: "status", kind: "bar", data: countBreakdown(data.cases, (item) => item.status, caseStatusColors) },
    { title: "Approval status", href: "/approvals", filterKey: "status", kind: "donut", data: countBreakdown(data.approvals, (item) => item.status, approvalStatusColors) },
  ];
}
