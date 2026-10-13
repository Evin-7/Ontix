import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";

export class WorkflowConflictError extends Error {
  readonly code = "WORKFLOW_CONFLICT";

  constructor(message: string) {
    super(message);
    this.name = "WorkflowConflictError";
  }
}

/**
 * Creates an approval and moves its case in one transaction. The conditional
 * update is a compare-and-set, so concurrent requests cannot both transition
 * the same case into the approval state.
 */
export async function requestCaseApproval(
  prisma: PrismaClient,
  input: {
    caseId: string;
    requestedById: string;
    type: string;
    title: string;
    justification: string;
    amount?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const currentCase = await tx.operationalCase.findUnique({
      where: { id: input.caseId },
      select: { id: true, caseKey: true, status: true, revision: true },
    });

    if (!currentCase) {
      throw new WorkflowConflictError("The case no longer exists.");
    }
    if (currentCase.status !== "OPEN" && currentCase.status !== "IN_PROGRESS") {
      throw new WorkflowConflictError("Only open or in-progress cases can request approval.");
    }

    const transition = await tx.operationalCase.updateMany({
      where: {
        id: currentCase.id,
        status: currentCase.status,
        revision: currentCase.revision,
      },
      data: {
        status: "WAITING_APPROVAL",
        revision: { increment: 1 },
      },
    });

    if (transition.count !== 1) {
      throw new WorkflowConflictError("The case changed while approval was being requested.");
    }

    const approval = await tx.approvalRequest.create({
      data: {
        approvalKey: `APR-${randomUUID()}`,
        type: input.type,
        title: input.title,
        justification: input.justification,
        amount: input.amount ? new Prisma.Decimal(input.amount) : undefined,
        caseId: currentCase.id,
        requestedById: input.requestedById,
      },
    });

    const afterCase = { status: "WAITING_APPROVAL", revision: currentCase.revision + 1 };
    await tx.activityEvent.createMany({
      data: [
        {
          actorId: input.requestedById,
          action: "APPROVAL_REQUESTED",
          objectType: "OperationalCase",
          objectId: currentCase.id,
          summary: `Approval requested for ${currentCase.caseKey}`,
          beforeJson: JSON.stringify({ status: currentCase.status, revision: currentCase.revision }),
          afterJson: JSON.stringify(afterCase),
        },
        {
          actorId: input.requestedById,
          action: "CREATED",
          objectType: "ApprovalRequest",
          objectId: approval.id,
          summary: `Approval request ${approval.approvalKey} created`,
          afterJson: JSON.stringify({ status: approval.status, caseId: currentCase.id }),
        },
      ],
    });

    return approval;
  });
}

/**
 * Uses a conditional PENDING -> decision update and commits the case transition
 * and audit events in the same transaction. A second reviewer gets a conflict.
 * Authentication and role authorization remain the responsibility of the API.
 */
export async function decideApproval(
  prisma: PrismaClient,
  input: {
    approvalId: string;
    reviewerId: string;
    decision: "APPROVED" | "REJECTED";
    comment: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.approvalRequest.findUnique({
      where: { id: input.approvalId },
      select: {
        id: true,
        approvalKey: true,
        status: true,
        revision: true,
        reviewerComment: true,
        caseId: true,
        requestedById: true,
      },
    });

    if (!current || current.status !== "PENDING") {
      throw new WorkflowConflictError("This approval is no longer pending.");
    }
    if (current.requestedById === input.reviewerId) {
      throw new WorkflowConflictError("The requester cannot decide their own approval.");
    }

    const now = new Date();
    const claimed = await tx.approvalRequest.updateMany({
      where: {
        id: current.id,
        status: "PENDING",
        revision: current.revision,
      },
      data: {
        status: input.decision,
        reviewerId: input.reviewerId,
        reviewerComment: input.comment,
        decidedAt: now,
        revision: { increment: 1 },
      },
    });

    if (claimed.count !== 1) {
      throw new WorkflowConflictError("Another reviewer already decided this approval.");
    }

    if (current.caseId) {
      const caseStatus = input.decision === "APPROVED" ? "IN_PROGRESS" : "OPEN";
      const caseTransition = await tx.operationalCase.updateMany({
        where: { id: current.caseId, status: "WAITING_APPROVAL" },
        data: { status: caseStatus, revision: { increment: 1 } },
      });

      if (caseTransition.count !== 1) {
        throw new WorkflowConflictError("The related case is no longer waiting for approval.");
      }

      await tx.activityEvent.create({
        data: {
          actorId: input.reviewerId,
          action: `APPROVAL_${input.decision}`,
          objectType: "OperationalCase",
          objectId: current.caseId,
          summary: `Case moved to ${caseStatus} after ${input.decision.toLowerCase()} approval`,
          beforeJson: JSON.stringify({ status: "WAITING_APPROVAL" }),
          afterJson: JSON.stringify({ status: caseStatus }),
        },
      });
    }

    await tx.activityEvent.create({
      data: {
        actorId: input.reviewerId,
        action: `APPROVAL_${input.decision}`,
        objectType: "ApprovalRequest",
        objectId: current.id,
        summary: `${current.approvalKey} ${input.decision.toLowerCase()}`,
        beforeJson: JSON.stringify({ status: "PENDING", reviewerComment: current.reviewerComment }),
        afterJson: JSON.stringify({ status: input.decision, reviewerComment: input.comment }),
      },
    });

    return tx.approvalRequest.findUniqueOrThrow({ where: { id: current.id } });
  });
}
