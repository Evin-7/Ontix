import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";
import { decideApproval, requestCaseApproval, WorkflowConflictError } from "./approval-workflow";

function prismaWithTransaction(tx: Record<string, unknown>) {
  const transaction = vi.fn(async (callback: (client: never) => Promise<unknown>) =>
    callback(tx as never),
  );
  return { prisma: { $transaction: transaction } as unknown as PrismaClient, transaction };
}

describe("transactional approval workflows", () => {
  it("commits a case transition, approval, and audit events in one transaction", async () => {
    const approval = { id: "approval-1", approvalKey: "APR-1", status: "PENDING" };
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "case-1",
          caseKey: "CASE-1",
          status: "OPEN",
          revision: 3,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      approvalRequest: { create: vi.fn().mockResolvedValue(approval) },
      activityEvent: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const { prisma, transaction } = prismaWithTransaction(tx);

    const result = await requestCaseApproval(prisma, {
      caseId: "case-1",
      requestedById: "employee-1",
      type: "CAPACITY_CHANGE",
      title: "Temporary capacity increase",
      justification: "Support the pilot period.",
      amount: "125.50",
    });

    expect(result).toBe(approval);
    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.operationalCase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "case-1", status: "OPEN", revision: 3 },
        data: expect.objectContaining({ status: "WAITING_APPROVAL" }),
      }),
    );
    expect(tx.activityEvent.createMany).toHaveBeenCalledOnce();
  });

  it("rejects a competing case transition before creating an approval", async () => {
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "case-1",
          caseKey: "CASE-1",
          status: "OPEN",
          revision: 3,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      approvalRequest: { create: vi.fn() },
      activityEvent: { createMany: vi.fn() },
    };
    const { prisma } = prismaWithTransaction(tx);

    await expect(
      requestCaseApproval(prisma, {
        caseId: "case-1",
        requestedById: "employee-1",
        type: "CAPACITY_CHANGE",
        title: "Temporary capacity increase",
        justification: "Support the pilot period.",
      }),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(tx.approvalRequest.create).not.toHaveBeenCalled();
    expect(tx.activityEvent.createMany).not.toHaveBeenCalled();
  });

  it("allows only one reviewer to claim a pending approval", async () => {
    const tx = {
      approvalRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "approval-1",
          approvalKey: "APR-1",
          status: "PENDING",
          revision: 0,
          reviewerComment: "",
          caseId: "case-1",
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      operationalCase: { updateMany: vi.fn() },
      activityEvent: { create: vi.fn() },
    };
    const { prisma } = prismaWithTransaction(tx);

    await expect(
      decideApproval(prisma, {
        approvalId: "approval-1",
        reviewerId: "manager-1",
        decision: "APPROVED",
        comment: "Approved.",
      }),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(tx.approvalRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "approval-1", status: "PENDING", revision: 0 },
      }),
    );
    expect(tx.operationalCase.updateMany).not.toHaveBeenCalled();
    expect(tx.activityEvent.create).not.toHaveBeenCalled();
  });

  it("prevents the requester from deciding their own approval", async () => {
    const tx = {
      approvalRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "approval-1",
          approvalKey: "APR-1",
          status: "PENDING",
          revision: 0,
          reviewerComment: "",
          caseId: null,
          requestedById: "employee-requester",
        }),
        updateMany: vi.fn(),
      },
      operationalCase: { updateMany: vi.fn() },
      activityEvent: { create: vi.fn() },
    };
    const { prisma } = prismaWithTransaction(tx);

    await expect(
      decideApproval(prisma, {
        approvalId: "approval-1",
        reviewerId: "employee-requester",
        decision: "APPROVED",
        comment: "Approved.",
      }),
    ).rejects.toThrow("The requester cannot decide their own approval.");
    expect(tx.approvalRequest.updateMany).not.toHaveBeenCalled();
    expect(tx.activityEvent.create).not.toHaveBeenCalled();
  });
});
