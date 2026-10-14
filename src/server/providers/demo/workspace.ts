import "server-only";

/** Fictional, read-only records adapted from foundry/demo-data CSV fixtures. */
const demoWorkspace = {
  checkedAt: "2026-09-19T13:05:00.000Z",
  customers: [
    { id: "CUS-1001", name: "Northstar Logistics", industry: "Transportation", status: "ACTIVE", createdAt: "2026-07-08T09:00:00.000Z" },
    { id: "CUS-1002", name: "Meridian Energy Group", industry: "Energy", status: "ACTIVE", createdAt: "2026-07-15T10:30:00.000Z" },
    { id: "CUS-1003", name: "Asteron Manufacturing", industry: "Manufacturing", status: "ONBOARDING", createdAt: "2026-08-02T08:15:00.000Z" },
    { id: "CUS-1004", name: "Bluehaven Health Systems", industry: "Healthcare", status: "ACTIVE", createdAt: "2026-08-19T12:45:00.000Z" },
  ],
  projects: [
    { id: "PRJ-2001", customerId: "CUS-1001", name: "Fleet Reliability Program", status: "IN_PROGRESS", budget: 850000, startDate: "2026-07-20T00:00:00.000Z" },
    { id: "PRJ-2002", customerId: "CUS-1001", name: "Regional Dispatch Optimization", status: "PLANNING", budget: 420000, startDate: "2026-09-01T00:00:00.000Z" },
    { id: "PRJ-2003", customerId: "CUS-1002", name: "Grid Modernization Phase 1", status: "IN_PROGRESS", budget: 1200000, startDate: "2026-06-15T00:00:00.000Z" },
    { id: "PRJ-2004", customerId: "CUS-1003", name: "Factory Quality Uplift", status: "AT_RISK", budget: 630000, startDate: "2026-08-10T00:00:00.000Z" },
    { id: "PRJ-2005", customerId: "CUS-1004", name: "Clinical Supply Visibility", status: "PLANNING", budget: 510000, startDate: "2026-09-15T00:00:00.000Z" },
  ],
  employees: [
    { id: "EMP-4001", name: "Jordan Lee", email: "jordan.lee@example.com", teamId: "TEAM-3001", role: "OPERATIONS_LEAD" },
    { id: "EMP-4002", name: "Taylor Morgan", email: "taylor.morgan@example.com", teamId: "TEAM-3001", role: "CASE_MANAGER" },
    { id: "EMP-4003", name: "Casey Rivera", email: "casey.rivera@example.com", teamId: "TEAM-3001", role: "ANALYST" },
    { id: "EMP-4004", name: "Avery Patel", email: "avery.patel@example.com", teamId: "TEAM-3002", role: "PROJECT_MANAGER" },
    { id: "EMP-4005", name: "Morgan Ellis", email: "morgan.ellis@example.com", teamId: "TEAM-3002", role: "DELIVERY_LEAD" },
    { id: "EMP-4006", name: "Riley Chen", email: "riley.chen@example.com", teamId: "TEAM-3003", role: "DATA_ENGINEER" },
    { id: "EMP-4007", name: "Quinn Brooks", email: "quinn.brooks@example.com", teamId: "TEAM-3003", role: "INTEGRATION_SPECIALIST" },
    { id: "EMP-4008", name: "Drew Kim", email: "drew.kim@example.com", teamId: "TEAM-3002", role: "APPROVAL_OWNER" },
  ],
  teams: [
    { id: "TEAM-3001", name: "Reliability Operations", department: "Operations" },
    { id: "TEAM-3002", name: "Enterprise Delivery", department: "Delivery" },
    { id: "TEAM-3003", name: "Data & Integration", department: "Technology" },
  ],
  cases: [
    { id: "CASE-5001", projectId: "PRJ-2001", title: "Vehicle telemetry variance", priority: "HIGH", status: "IN_PROGRESS", assignedEmployeeId: "EMP-4002" },
    { id: "CASE-5002", projectId: "PRJ-2001", title: "Preventive maintenance backlog", priority: "MEDIUM", status: "OPEN", assignedEmployeeId: "EMP-4003" },
    { id: "CASE-5003", projectId: "PRJ-2002", title: "Dispatch capacity forecast gap", priority: "HIGH", status: "WAITING_APPROVAL", assignedEmployeeId: "EMP-4001" },
    { id: "CASE-5004", projectId: "PRJ-2003", title: "Substation inspection exception", priority: "CRITICAL", status: "OPEN", assignedEmployeeId: "EMP-4001" },
    { id: "CASE-5005", projectId: "PRJ-2003", title: "Meter data reconciliation", priority: "MEDIUM", status: "RESOLVED", assignedEmployeeId: "EMP-4006" },
    { id: "CASE-5006", projectId: "PRJ-2004", title: "Supplier quality deviation", priority: "HIGH", status: "IN_PROGRESS", assignedEmployeeId: "EMP-4005" },
    { id: "CASE-5007", projectId: "PRJ-2005", title: "Cold-chain handoff delay", priority: "CRITICAL", status: "OPEN", assignedEmployeeId: "EMP-4004" },
    { id: "CASE-5008", projectId: "PRJ-2002", title: "Route exception review", priority: "LOW", status: "RESOLVED", assignedEmployeeId: "EMP-4003" },
  ],
  approvals: [
    { id: "APR-6001", caseId: "CASE-5003", requestedBy: "EMP-4001", status: "PENDING", createdAt: "2026-09-18T09:15:00.000Z" },
    { id: "APR-6002", caseId: "CASE-5004", requestedBy: "EMP-4004", status: "APPROVED", createdAt: "2026-09-17T11:30:00.000Z" },
    { id: "APR-6003", caseId: "CASE-5006", requestedBy: "EMP-4005", status: "PENDING", createdAt: "2026-09-19T13:05:00.000Z" },
    { id: "APR-6004", caseId: "CASE-5007", requestedBy: "EMP-4004", status: "REJECTED", createdAt: "2026-09-16T16:40:00.000Z" },
  ],
  totals: { customers: 4, projects: 5, employees: 8, teams: 3, cases: 8, approvals: 4 },
  hasMore: { customers: false, projects: false, employees: false, teams: false, cases: false, approvals: false },
};

export type DemoWorkspace = typeof demoWorkspace;

export function getDemoWorkspace(): DemoWorkspace {
  // Each request gets its own object graph so UI preparation cannot mutate fixtures.
  return structuredClone(demoWorkspace);
}
