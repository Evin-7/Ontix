import type { WorkspaceCommand } from "@/types/workspace";

export type FoundryWorkflowAction = "update-project-status" | "assign-case" | "resolve-case";

export const notificationCopy = {
  caseResolved: "Case resolved successfully",
  caseAssigned: "Case assigned successfully",
  projectStatusUpdated: "Project status updated successfully",
  changesSaved: "Changes saved successfully",
  unableToSave: "Unable to save changes. Please try again.",
  requestFailed: "Unable to save changes. Please try again.",
} as const;

const workspaceSuccessMessages: Record<WorkspaceCommand["type"], string> = {
  "customer.create": "Customer added successfully",
  "customer.update": "Customer updated successfully",
  "customer.archive": "Customer archived successfully",
  "project.create": "Project added successfully",
  "project.update": "Project updated successfully",
  "project.archive": "Project archived successfully",
  "case.create": "Case created successfully",
  "case.assign": "Case assigned successfully",
  "case.escalate": "Case escalated successfully",
  "case.resolve": "Case resolved successfully",
  "case.requestApproval": "Approval requested successfully",
  "approval.decide": "Approval decision saved successfully",
  "employee.create": "Employee added successfully",
  "employee.update": "Employee updated successfully",
  "employee.deactivate": "Employee deactivated successfully",
  "employee.activate": "Employee reactivated successfully",
  "team.create": "Team added successfully",
  "team.update": "Team updated successfully",
  "team.deactivate": "Team deactivated successfully",
  "team.activate": "Team reactivated successfully",
};

export function workspaceSuccessMessage(command: WorkspaceCommand) {
  if (command.type === "case.assign" && command.employeeId === null) return "Case unassigned successfully";
  if (command.type === "approval.decide" && command.decision === "REJECTED") return "Request rejected successfully";
  return workspaceSuccessMessages[command.type];
}

const workflowActionLabels: Record<FoundryWorkflowAction, string> = {
  "update-project-status": "update the project status",
  "assign-case": "assign this case",
  "resolve-case": "resolve this case",
};

export function workflowErrorMessage(code: unknown, action: FoundryWorkflowAction) {
  switch (code) {
    case "unauthenticated":
    case "authorization_expired":
      return "Your session may have expired. Refresh the page and try again.";
    case "forbidden":
    case "action_denied":
      return "You don’t have permission to make this change.";
    case "invalid_input":
      return "Check the selected values and try again.";
    case "not_found":
      return "This item is no longer available. Refresh and try again.";
    case "conflict":
      return "This item has changed. Refresh and try again.";
    default:
      return `Unable to ${workflowActionLabels[action]}. Please try again.`;
  }
}

export function workspaceErrorMessage(error: unknown) {
  if (typeof error !== "string") return notificationCopy.unableToSave;
  const normalized = error.toLowerCase();
  if (normalized.includes("permission") || normalized.includes("not allowed")) {
    return "You don’t have permission to make this change.";
  }
  if (normalized.includes("session has expired") || normalized.includes("session is unavailable")) {
    return "Your session may have expired. Refresh the page and try again.";
  }
  if (normalized.includes("invalid") || normalized.includes("required") || normalized.includes("check the submitted")) {
    return "Check the submitted details and try again.";
  }
  if (normalized.includes("conflict") || normalized.includes("changed since")) {
    return "This item has changed. Refresh and try again.";
  }
  return notificationCopy.unableToSave;
}
