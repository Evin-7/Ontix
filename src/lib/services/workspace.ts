import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireActor } from "@/lib/auth/dal";
import { listApprovals } from "@/lib/services/approvals";
import { listAuditActivity } from "@/lib/services/audit";
import { listCases } from "@/lib/services/cases";
import { listCustomers } from "@/lib/services/customers";
import { listEmployees } from "@/lib/services/employees";
import { listProjects } from "@/lib/services/projects";
import { listTeams } from "@/lib/services/teams";
import { requireNeonDemoProvider } from "@/server/providers/provider-mode";

export async function loadWorkspace() {
  requireNeonDemoProvider();
  await requireActor();
  const [customers, projects, cases, approvals, activity, employees, teams, customerCount, projectCount, activeCaseCount, pendingApprovalCount, casesByStatus, projectsByStatus] = await Promise.all([
    listCustomers(),
    listProjects(),
    listCases(),
    listApprovals(),
    listAuditActivity(),
    listEmployees(),
    listTeams(),
    prisma.customer.count({ where: { archivedAt: null } }),
    prisma.project.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.operationalCase.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.approvalRequest.count({ where: { status: "PENDING" } }),
    prisma.operationalCase.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const serializedActivity = activity.map((event) => ({
    id: event.id,
    actor: event.actor,
    action: event.action,
    objectType: event.objectType,
    objectId: event.objectId,
    summary: event.summary,
    createdAt: event.createdAt.toISOString(),
  }));

  return {
    dashboard: {
      metrics: {
        customers: customerCount,
        projects: projectCount,
        activeCases: activeCaseCount,
        pendingApprovals: pendingApprovalCount,
      },
      casesByStatus: casesByStatus.map((item) => ({ status: item.status, count: item._count._all })),
      projectsByStatus: projectsByStatus.map((item) => ({ status: item.status, count: item._count._all })),
      recentActivity: serializedActivity.slice(0, 8),
    },
    customers: customers.map((customer) => ({
      id: customer.id,
      customerKey: customer.customerKey,
      name: customer.name,
      industry: customer.industry,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      accountOwner: customer.accountOwner,
      _count: customer._count,
    })),
    projects: projects.map((project) => ({
      id: project.id,
      projectKey: project.projectKey,
      name: project.name,
      description: project.description,
      customerId: project.customerId,
      teamId: project.teamId,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate.toISOString(),
      dueDate: project.dueDate.toISOString(),
      progress: project.progress,
      budget: project.budget.toString(),
      revision: project.revision,
      customer: project.customer,
      team: project.team,
      assignments: project.assignments,
      _count: project._count,
    })),
    cases: cases.map((item) => ({
      id: item.id,
      caseKey: item.caseKey,
      title: item.title,
      description: item.description,
      customerId: item.customerId,
      projectId: item.projectId,
      assignedEmployeeId: item.assignedEmployeeId,
      priority: item.priority,
      status: item.status,
      category: item.category,
      slaDeadline: item.slaDeadline.toISOString(),
      escalationLevel: item.escalationLevel,
      revision: item.revision,
      customer: item.customer,
      project: item.project,
      assignedEmployee: item.assignedEmployee,
    })),
    approvals: approvals.map((item) => ({
      id: item.id,
      approvalKey: item.approvalKey,
      type: item.type,
      title: item.title,
      justification: item.justification,
      amount: item.amount?.toString() ?? null,
      status: item.status,
      case: item.case,
      requestedBy: item.requestedBy,
      reviewer: item.reviewer,
      createdAt: item.createdAt.toISOString(),
    })),
    activity: serializedActivity,
    employees: employees.map(({ projectAssignments, ...employee }) => ({
      ...employee,
      assignedProjects: projectAssignments.map(({ project }) => project),
    })),
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      department: team.department,
      description: team.description,
      isActive: team.isActive,
      _count: team._count,
    })),
  };
}
