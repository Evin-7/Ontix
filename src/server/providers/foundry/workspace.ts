import "server-only";

import {
  ApprovalRequest,
  Customer,
  Employee,
  OperationalCase,
  Project,
  Team,
} from "@ontix-web-integration/sdk";
import type { Client } from "@osdk/client";
import { createFoundryClientWithTokenProvider } from "./client";

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

type Page<T> = { data: T[]; nextPageToken: string | undefined; totalCount: string };

export async function readBoundedFoundryPages<T>(fetchPage: (args: {
  $pageSize: number;
  $snapshot: true;
  $nextPageToken?: string;
}) => Promise<Page<T>>) {
  const data: T[] = [];
  let nextPageToken: string | undefined;
  let totalCount = 0;
  let pagesRead = 0;

  do {
    const page = await fetchPage({
      $pageSize: PAGE_SIZE,
      $snapshot: true,
      ...(nextPageToken ? { $nextPageToken: nextPageToken } : {}),
    });
    data.push(...page.data);
    nextPageToken = page.nextPageToken;
    totalCount = Number.parseInt(page.totalCount, 10) || data.length;
    pagesRead += 1;
  } while (nextPageToken && pagesRead < MAX_PAGES);

  return { data, totalCount, hasMore: Boolean(nextPageToken) };
}

export function normalizeFoundryDate(value: unknown): string | null {
  let candidate: unknown = value;
  if (candidate && typeof candidate === "object") {
    candidate = (candidate as Record<string, unknown>).timestamp;
  }
  if (candidate instanceof Date) return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
  if (typeof candidate !== "string" && typeof candidate !== "number") return null;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createWorkspaceQueries(client: Client) {
  return Promise.all([
    readBoundedFoundryPages((args) => client(Customer).fetchPage(args)),
    readBoundedFoundryPages((args) => client(Project).fetchPage(args)),
    readBoundedFoundryPages((args) => client(Employee).fetchPage(args)),
    readBoundedFoundryPages((args) => client(Team).fetchPage(args)),
    readBoundedFoundryPages((args) => client(OperationalCase).fetchPage(args)),
    readBoundedFoundryPages((args) => client(ApprovalRequest).fetchPage(args)),
  ]);
}

export async function getFoundryWorkspaceWithToken(accessToken: string) {
  const client = createFoundryClientWithTokenProvider(async () => accessToken);
  const [customerPage, projectPage, employeePage, teamPage, casePage, approvalPage] =
    await createWorkspaceQueries(client);

  const customers = customerPage.data.map((row) => ({
    id: row.id,
    name: row.name ?? "Unnamed customer",
    industry: row.industry ?? "Unspecified",
    status: row.status ?? "UNKNOWN",
    createdAt: normalizeFoundryDate(row.createdAt),
  }));
  const projects = projectPage.data.map((row) => ({
    id: row.id,
    customerId: row.customerId ?? null,
    name: row.name ?? "Unnamed project",
    status: row.status ?? "UNKNOWN",
    budget: row.budget ?? null,
    startDate: normalizeFoundryDate(row.startDate),
  }));
  const employees = employeePage.data.map((row) => ({
    id: row.id,
    name: row.name ?? "Unnamed employee",
    email: row.email ?? null,
    teamId: row.teamId ?? null,
    role: row.role ?? "Unspecified",
  }));
  const teams = teamPage.data.map((row) => ({
    id: row.id,
    name: row.name ?? "Unnamed team",
    department: row.department ?? "Unspecified",
  }));
  const cases = casePage.data.map((row) => ({
    id: row.id,
    projectId: row.projectId ?? null,
    title: row.title ?? "Untitled case",
    priority: row.priority ?? "UNKNOWN",
    status: row.status ?? "UNKNOWN",
    assignedEmployeeId: row.assignedEmployeeId ?? null,
  }));
  const approvals = approvalPage.data.map((row) => ({
    id: row.id,
    caseId: row.caseId ?? null,
    requestedBy: row.requestedBy ?? null,
    status: row.status ?? "UNKNOWN",
    createdAt: normalizeFoundryDate(row.createdAt),
  }));

  return {
    checkedAt: new Date().toISOString(),
    customers,
    projects,
    employees,
    teams,
    cases,
    approvals,
    totals: {
      customers: customerPage.totalCount,
      projects: projectPage.totalCount,
      employees: employeePage.totalCount,
      teams: teamPage.totalCount,
      cases: casePage.totalCount,
      approvals: approvalPage.totalCount,
    },
    hasMore: {
      customers: customerPage.hasMore,
      projects: projectPage.hasMore,
      employees: employeePage.hasMore,
      teams: teamPage.hasMore,
      cases: casePage.hasMore,
      approvals: approvalPage.hasMore,
    },
  };
}
