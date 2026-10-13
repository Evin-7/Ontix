import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireActor, requirePermission } from "@/lib/auth/dal";
import { decideApproval, requestCaseApproval } from "@/server/db/approval-workflow";
import { approvalDecisionSchema, approvalInputSchema } from "@/lib/validation";

export async function listApprovals() {
  await requireActor();
  return prisma.approvalRequest.findMany({
    take: 500,
    include: {
      case: { select: { id: true, caseKey: true, title: true } },
      requestedBy: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function requestApprovalForCase(caseId: string, rawInput: unknown) {
  const actor = await requirePermission("approvals:request");
  const input = approvalInputSchema.parse(rawInput);
  return requestCaseApproval(prisma, { caseId, requestedById: actor.employeeId, ...input });
}

export async function decideApprovalRequest(approvalId: string, rawInput: unknown) {
  const actor = await requirePermission("approvals:decide");
  const input = approvalDecisionSchema.parse(rawInput);
  return decideApproval(prisma, {
    approvalId,
    reviewerId: actor.employeeId,
    ...input,
  });
}
