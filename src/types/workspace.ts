export type Role = "ADMINISTRATOR" | "MANAGER" | "DEVELOPER" | "ANALYST";

export type Viewer = {
  employeeId: string;
  name: string;
  email: string;
  role: Role;
};

export type Employee = {
  id: string;
  name: string;
  title: string;
  role: string;
  teamId: string | null;
};

export type Customer = {
  id: string;
  customerKey: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  status: string;
  accountOwner?: { id: string; name: string } | null;
  _count?: { projects: number; cases: number };
};

export type Project = {
  id: string;
  projectKey: string;
  name: string;
  description: string;
  customerId: string;
  teamId: string | null;
  status: string;
  priority: string;
  startDate: string;
  dueDate: string;
  progress: number;
  budget: string;
  revision: number;
  customer?: { id: string; name: string };
  team?: { id: string; name: string } | null;
  _count?: { assignments: number; cases: number };
};

export type CaseRecord = {
  id: string;
  caseKey: string;
  title: string;
  description: string;
  customerId: string;
  projectId: string | null;
  assignedEmployeeId: string | null;
  priority: string;
  status: string;
  category: string;
  slaDeadline: string;
  escalationLevel: number;
  revision: number;
  customer?: { id: string; name: string };
  project?: { id: string; name: string } | null;
  assignedEmployee?: { id: string; name: string } | null;
};

export type Approval = {
  id: string;
  approvalKey: string;
  type: string;
  title: string;
  justification: string;
  amount: string | null;
  status: string;
  case?: { id: string; caseKey: string; title: string } | null;
  requestedBy: { id: string; name: string };
  reviewer?: { id: string; name: string } | null;
  createdAt: string;
};

export type Activity = {
  id: string;
  actor?: { id: string; name: string } | null;
  action: string;
  objectType: string;
  objectId: string;
  summary: string;
  createdAt: string;
};

export type Dashboard = {
  metrics: { customers: number; projects: number; activeCases: number; pendingApprovals: number };
  casesByStatus: { status: string; count: number }[];
  projectsByStatus: { status: string; count: number }[];
  recentActivity: Activity[];
};

export type WorkspaceData = {
  dashboard: Dashboard;
  cases: CaseRecord[];
  projects: Project[];
  customers: Customer[];
  approvals: Approval[];
  activity: Activity[];
  employees: Employee[];
};

export type WorkspaceCommand =
  | { type: "customer.create"; input: unknown }
  | { type: "customer.update"; customerId: string; input: unknown }
  | { type: "customer.archive"; customerId: string }
  | { type: "project.create"; input: unknown }
  | { type: "project.update"; projectId: string; input: unknown }
  | { type: "project.archive"; projectId: string }
  | { type: "case.create"; input: unknown }
  | { type: "case.assign"; caseId: string; employeeId: string | null }
  | { type: "case.escalate"; caseId: string }
  | { type: "case.requestApproval"; caseId: string; input: unknown }
  | { type: "approval.decide"; approvalId: string; decision: "APPROVED" | "REJECTED"; comment: string };
