import "server-only";

import { z } from "zod";
import { requireActor } from "@/lib/auth/dal";
import { ServiceError } from "@/lib/services/errors";
import { ONTOLOGY_DEMO_OBJECT_TYPES, type OntologyDemoNode, type OntologyDemoObjectGraph, type OntologyDemoRelationship, type OntologyObjectType } from "@/types/ontology-demo";
import { prisma } from "@/server/db/prisma";
import { requireNeonDemoProvider } from "@/server/providers/provider-mode";

export const ontologyObjectTypeSchema = z.enum(ONTOLOGY_DEMO_OBJECT_TYPES);

const querySchema = z.object({
  type: ontologyObjectTypeSchema,
  id: z.string().trim().min(1).max(128),
});

const node = (
  type: OntologyObjectType,
  id: string,
  title: string,
  subtitle: string,
  status?: string,
): OntologyDemoNode => ({ type, id, title, subtitle, ...(status ? { status } : {}) });

const relation = (
  label: string,
  targetType: OntologyObjectType,
  objects: Array<OntologyDemoNode | null | undefined>,
): OntologyDemoRelationship => ({
  label,
  targetType,
  objects: objects.filter((object): object is OntologyDemoNode => Boolean(object)),
});

const customerNode = (record: { id: string; customerKey: string; name: string; industry: string; status: string }) =>
  node("Customer", record.id, record.name, `${record.customerKey} · ${record.industry}`, record.status);
const projectNode = (record: { id: string; projectKey: string; name: string; status: string }) =>
  node("Project", record.id, record.name, record.projectKey, record.status);
const employeeNode = (record: { id: string; name: string; title: string; role: string }) =>
  node("Employee", record.id, record.name, `${record.title} · ${record.role}`);
const caseNode = (record: { id: string; caseKey: string; title: string; status: string }) =>
  node("OperationalCase", record.id, record.title, record.caseKey, record.status);
const approvalNode = (record: { id: string; approvalKey: string; title: string; status: string }) =>
  node("ApprovalRequest", record.id, record.title, record.approvalKey, record.status);

export async function queryOntologyDemoObject(rawInput: unknown): Promise<OntologyDemoObjectGraph> {
  requireNeonDemoProvider();
  await requireActor();
  const { type, id } = querySchema.parse(rawInput);

  switch (type) {
    case "Customer": {
      const record = await prisma.customer.findFirst({
        where: { id, archivedAt: null },
        include: {
          accountOwner: { select: { id: true, name: true, title: true, role: true } },
          projects: { where: { status: { not: "ARCHIVED" } }, select: { id: true, projectKey: true, name: true, status: true } },
          cases: { select: { id: true, caseKey: true, title: true, status: true } },
        },
      });
      if (!record) throw new ServiceError("Customer not found.");
      return {
        object: customerNode(record),
        relationships: [
          relation("Account owner", "Employee", [record.accountOwner && employeeNode(record.accountOwner)]),
          relation("Projects", "Project", record.projects.map(projectNode)),
          relation("Operational cases", "OperationalCase", record.cases.map(caseNode)),
        ],
      };
    }
    case "Project": {
      const record = await prisma.project.findFirst({
        where: { id, status: { not: "ARCHIVED" } },
        include: {
          customer: { select: { id: true, customerKey: true, name: true, industry: true, status: true } },
          team: { select: { id: true, name: true, department: true } },
          assignments: { include: { employee: { select: { id: true, name: true, title: true, role: true } } } },
          cases: { select: { id: true, caseKey: true, title: true, status: true } },
        },
      });
      if (!record) throw new ServiceError("Project not found.");
      return {
        object: projectNode(record),
        relationships: [
          relation("Customer", "Customer", [customerNode(record.customer)]),
          relation("Delivery team", "Team", [record.team && node("Team", record.team.id, record.team.name, record.team.department)]),
          relation("Assigned employees", "Employee", record.assignments.map(({ employee }) => employeeNode(employee))),
          relation("Operational cases", "OperationalCase", record.cases.map(caseNode)),
        ],
      };
    }
    case "Team": {
      const record = await prisma.team.findUnique({
        where: { id },
        include: {
          employees: { where: { isActive: true }, select: { id: true, name: true, title: true, role: true } },
          projects: { where: { status: { not: "ARCHIVED" } }, select: { id: true, projectKey: true, name: true, status: true } },
        },
      });
      if (!record) throw new ServiceError("Team not found.");
      return {
        object: node("Team", record.id, record.name, record.department),
        relationships: [
          relation("Team members", "Employee", record.employees.map(employeeNode)),
          relation("Delivery projects", "Project", record.projects.map(projectNode)),
        ],
      };
    }
    case "Employee": {
      const record = await prisma.employee.findFirst({
        where: { id, isActive: true },
        include: {
          team: { select: { id: true, name: true, department: true } },
          projectAssignments: { include: { project: { select: { id: true, projectKey: true, name: true, status: true } } } },
          ownedCustomers: { where: { archivedAt: null }, select: { id: true, customerKey: true, name: true, industry: true, status: true } },
          assignedCases: { select: { id: true, caseKey: true, title: true, status: true } },
          submittedApprovals: { select: { id: true, approvalKey: true, title: true, status: true } },
          reviewedApprovals: { select: { id: true, approvalKey: true, title: true, status: true } },
        },
      });
      if (!record) throw new ServiceError("Employee not found.");
      return {
        object: employeeNode(record),
        relationships: [
          relation("Team", "Team", [record.team && node("Team", record.team.id, record.team.name, record.team.department)]),
          relation("Assigned projects", "Project", record.projectAssignments.map(({ project }) => projectNode(project))),
          relation("Account ownership", "Customer", record.ownedCustomers.map(customerNode)),
          relation("Assigned cases", "OperationalCase", record.assignedCases.map(caseNode)),
          relation("Requested approvals", "ApprovalRequest", record.submittedApprovals.map(approvalNode)),
          relation("Reviewed approvals", "ApprovalRequest", record.reviewedApprovals.map(approvalNode)),
        ],
      };
    }
    case "OperationalCase": {
      const record = await prisma.operationalCase.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, customerKey: true, name: true, industry: true, status: true } },
          project: { select: { id: true, projectKey: true, name: true, status: true } },
          assignedEmployee: { select: { id: true, name: true, title: true, role: true } },
          approvals: {
            select: {
              id: true, approvalKey: true, title: true, status: true,
              requestedBy: { select: { id: true, name: true, title: true, role: true } },
              reviewer: { select: { id: true, name: true, title: true, role: true } },
            },
          },
        },
      });
      if (!record) throw new ServiceError("Operational case not found.");
      return {
        object: caseNode(record),
        relationships: [
          relation("Customer", "Customer", [customerNode(record.customer)]),
          relation("Project", "Project", [record.project && projectNode(record.project)]),
          relation("Assignee", "Employee", [record.assignedEmployee && employeeNode(record.assignedEmployee)]),
          relation("Approvals", "ApprovalRequest", record.approvals.map(approvalNode)),
          relation("Approval requesters", "Employee", record.approvals.map(({ requestedBy }) => employeeNode(requestedBy))),
          relation("Approval reviewers", "Employee", record.approvals.map(({ reviewer }) => reviewer && employeeNode(reviewer))),
        ],
      };
    }
    case "ApprovalRequest": {
      const record = await prisma.approvalRequest.findUnique({
        where: { id },
        include: {
          case: { select: { id: true, caseKey: true, title: true, status: true } },
          requestedBy: { select: { id: true, name: true, title: true, role: true } },
          reviewer: { select: { id: true, name: true, title: true, role: true } },
        },
      });
      if (!record) throw new ServiceError("Approval request not found.");
      return {
        object: approvalNode(record),
        relationships: [
          relation("Operational case", "OperationalCase", [record.case && caseNode(record.case)]),
          relation("Requested by", "Employee", [employeeNode(record.requestedBy)]),
          relation("Reviewed by", "Employee", [record.reviewer && employeeNode(record.reviewer)]),
        ],
      };
    }
    case "ActivityEvent": {
      const record = await prisma.activityEvent.findUnique({
        where: { id },
        include: { actor: { select: { id: true, name: true, title: true, role: true } } },
      });
      if (!record) throw new ServiceError("Audit event not found.");
      const related = await findAuditTarget(record.objectType, record.objectId);
      return {
        object: node("ActivityEvent", record.id, record.summary, `${record.action} · ${record.objectType}`),
        relationships: [
          relation("Performed by", "Employee", [record.actor && employeeNode(record.actor)]),
          ...(related ? [relation("References", related.type, [related])] : []),
        ],
      };
    }
  }
}

async function findAuditTarget(type: string, id: string): Promise<OntologyDemoNode | null> {
  if (type === "Customer") {
    const record = await prisma.customer.findFirst({ where: { id, archivedAt: null }, select: { id: true, customerKey: true, name: true, industry: true, status: true } });
    return record ? customerNode(record) : null;
  }
  if (type === "Project") {
    const record = await prisma.project.findFirst({ where: { id, status: { not: "ARCHIVED" } }, select: { id: true, projectKey: true, name: true, status: true } });
    return record ? projectNode(record) : null;
  }
  if (type === "OperationalCase") {
    const record = await prisma.operationalCase.findUnique({ where: { id }, select: { id: true, caseKey: true, title: true, status: true } });
    return record ? caseNode(record) : null;
  }
  if (type === "ApprovalRequest") {
    const record = await prisma.approvalRequest.findUnique({ where: { id }, select: { id: true, approvalKey: true, title: true, status: true } });
    return record ? approvalNode(record) : null;
  }
  return null;
}
