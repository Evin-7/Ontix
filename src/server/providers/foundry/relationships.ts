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

const LINK_PAGE_SIZE = 9;

export type FoundryRelationshipObjectType =
  | "Customer"
  | "Project"
  | "OperationalCase"
  | "Employee"
  | "Team"
  | "ApprovalRequest";

export type FoundryRelationship = {
  id: string;
  title: string;
  href: string;
};

export type FoundryRelationshipGroup = {
  label: string;
  targetType: FoundryRelationshipObjectType;
  records: FoundryRelationship[];
  hasMore: boolean;
};

function objectHref(type: FoundryRelationshipObjectType, id: string) {
  const path = {
    Customer: "/customers",
    Project: "/projects",
    OperationalCase: "/cases",
    Employee: "/employees",
    Team: "/teams",
    ApprovalRequest: "/approvals",
  }[type];
  return `${path}?record=${encodeURIComponent(id)}`;
}

function relation(
  type: FoundryRelationshipObjectType,
  record: { id: string; title?: string | null; name?: string | null },
): FoundryRelationship {
  return { id: record.id, title: record.title?.trim() || record.name?.trim() || record.id, href: objectHref(type, record.id) };
}

function singleGroup(
  label: string,
  targetType: FoundryRelationshipObjectType,
  record: { id: string; title?: string | null; name?: string | null } | undefined,
): FoundryRelationshipGroup {
  return { label, targetType, records: record ? [relation(targetType, record)] : [], hasMore: false };
}

async function manyGroup<T extends { id: string }>(
  label: string,
  targetType: FoundryRelationshipObjectType,
  fetchPage: (pageSize: number) => Promise<{ data: T[]; nextPageToken?: string }>,
  getTitle: (record: T) => string | null | undefined,
): Promise<FoundryRelationshipGroup> {
  const page = await fetchPage(LINK_PAGE_SIZE);
  return {
    label,
    targetType,
    records: page.data.slice(0, LINK_PAGE_SIZE - 1).map((record) => relation(targetType, { id: record.id, title: getTitle(record) })),
    hasMore: Boolean(page.nextPageToken) || page.data.length >= LINK_PAGE_SIZE,
  };
}

/**
 * Traverse generated Ontology links for one selected object. This is deliberately
 * a one-hop, bounded read so the drawer stays responsive and never loads an
 * unbounded relationship set into the browser.
 */
export async function readFoundryRelationships(
  accessToken: string,
  type: FoundryRelationshipObjectType,
  id: string,
): Promise<FoundryRelationshipGroup[]> {
  const client = createFoundryClientWithTokenProvider(async () => accessToken);

  switch (type) {
    case "Customer": {
      const customer = await client(Customer).fetchOne(id);
      return [await manyGroup("Projects", "Project", (pageSize) => customer.$link.projects.fetchPage({ $pageSize: pageSize }), (project) => project.name)];
    }
    case "Project": {
      const project = await client(Project).fetchOne(id);
      const customer = project.customerId ? await project.$link.customer.fetchOne() : undefined;
      const cases = await manyGroup("Operational cases", "OperationalCase", (pageSize) => project.$link.operationalCases.fetchPage({ $pageSize: pageSize }), (entry) => entry.title);
      return [singleGroup("Customer", "Customer", customer), cases];
    }
    case "OperationalCase": {
      const operationalCase = await client(OperationalCase).fetchOne(id);
      const [project, assignedEmployee, approvals] = await Promise.all([
        operationalCase.projectId ? operationalCase.$link.project.fetchOne() : undefined,
        operationalCase.assignedEmployeeId ? operationalCase.$link.assignedEmployee.fetchOne() : undefined,
        manyGroup("Approval requests", "ApprovalRequest", (pageSize) => operationalCase.$link.approvalRequests.fetchPage({ $pageSize: pageSize }), (approval) => approval.id),
      ]);
      return [singleGroup("Project", "Project", project), singleGroup("Assigned employee", "Employee", assignedEmployee), approvals];
    }
    case "Employee": {
      const employee = await client(Employee).fetchOne(id);
      const [team, cases] = await Promise.all([
        employee.teamId ? employee.$link.team.fetchOne() : undefined,
        manyGroup("Assigned cases", "OperationalCase", (pageSize) => employee.$link.assignedCases.fetchPage({ $pageSize: pageSize }), (entry) => entry.title),
      ]);
      return [singleGroup("Team", "Team", team), cases];
    }
    case "Team": {
      const team = await client(Team).fetchOne(id);
      return [await manyGroup("Employees", "Employee", (pageSize) => team.$link.employees.fetchPage({ $pageSize: pageSize }), (employee) => employee.name)];
    }
    case "ApprovalRequest": {
      const approval = await client(ApprovalRequest).fetchOne(id);
      const operationalCase = approval.caseId ? await approval.$link.operationalCase.fetchOne() : undefined;
      return [singleGroup("Operational case", "OperationalCase", operationalCase)];
    }
  }
}
