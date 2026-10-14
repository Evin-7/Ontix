import "server-only";

import {
  ApprovalRequest,
  Customer,
  Employee,
  OperationalCase,
  Project,
  Team,
} from "@ontix-web-integration/sdk";
import { createFoundryClientWithTokenProvider } from "./client";

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

type Page<T> = { data: T[]; nextPageToken: string | undefined; totalCount: string };
type CustomerRecord = { id: string; name?: string | null; industry?: string | null; status?: string | null; createdAt?: unknown };
type ProjectRecord = { id: string; customerId?: string | null; name?: string | null; status?: string | null; budget?: number | null; startDate?: unknown };
type EmployeeRecord = { id: string; name?: string | null; email?: string | null; teamId?: string | null; role?: string | null };
type TeamRecord = { id: string; name?: string | null; department?: string | null };
type CaseRecord = { id: string; projectId?: string | null; title?: string | null; priority?: string | null; status?: string | null; assignedEmployeeId?: string | null };
type ApprovalRecord = { id: string; caseId?: string | null; requestedBy?: string | null; status?: string | null; createdAt?: unknown };

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

export type FoundryWorkspaceModule = "overview" | "projects" | "cases" | "customers" | "employees" | "teams" | "approvals";
type Collection = "customers" | "projects" | "employees" | "teams" | "cases" | "approvals";
type CollectedPage = { data: unknown[]; totalCount: number; hasMore: boolean };

function pageAs<T>(page: CollectedPage | undefined) {
  return { ...(page ?? { totalCount: 0, hasMore: false }), data: (page?.data ?? []) as T[] };
}

const MODULE_COLLECTIONS: Record<FoundryWorkspaceModule, readonly Collection[]> = {
  overview: ["customers", "projects", "employees", "teams", "cases", "approvals"],
  projects: ["customers", "projects"],
  cases: ["projects", "employees", "cases", "approvals"],
  customers: ["customers", "projects"],
  employees: ["employees", "teams"],
  teams: ["teams", "employees"],
  approvals: ["approvals", "cases"],
};

export async function getFoundryWorkspaceWithToken(accessToken: string, module: FoundryWorkspaceModule = "overview") {
  const client = createFoundryClientWithTokenProvider(async () => accessToken);
  const queries: Record<Collection, () => Promise<CollectedPage>> = {
    customers: async () => readBoundedFoundryPages((args) => client(Customer).fetchPage(args)),
    projects: async () => readBoundedFoundryPages((args) => client(Project).fetchPage(args)),
    employees: async () => readBoundedFoundryPages((args) => client(Employee).fetchPage(args)),
    teams: async () => readBoundedFoundryPages((args) => client(Team).fetchPage(args)),
    cases: async () => readBoundedFoundryPages((args) => client(OperationalCase).fetchPage(args)),
    approvals: async () => readBoundedFoundryPages((args) => client(ApprovalRequest).fetchPage(args)),
  };
  const selected = await Promise.all(MODULE_COLLECTIONS[module].map(async (key) => [key, await queries[key]()] as const));
  const pages = Object.fromEntries(selected) as Partial<Record<Collection, CollectedPage>>;
  const customerPage = pageAs<CustomerRecord>(pages.customers);
  const projectPage = pageAs<ProjectRecord>(pages.projects);
  const employeePage = pageAs<EmployeeRecord>(pages.employees);
  const teamPage = pageAs<TeamRecord>(pages.teams);
  const casePage = pageAs<CaseRecord>(pages.cases);
  const approvalPage = pageAs<ApprovalRecord>(pages.approvals);

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
