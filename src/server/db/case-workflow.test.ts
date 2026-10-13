import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";
import { assignCase, escalateCase } from "./case-workflow";
import { WorkflowConflictError } from "./approval-workflow";

function prismaWithTransaction(tx: Record<string, unknown>) {
  const transaction = vi.fn(async (callback: (client: never) => Promise<unknown>) =>
    callback(tx as never),
  );
  return { prisma: { $transaction: transaction } as unknown as PrismaClient, transaction };
}

describe("transactional case workflows", () => {
  it("assigns a case and appends its audit event in one transaction", async () => {
    const updatedCase = { id: "case-1", assignedEmployeeId: "employee-2", revision: 4 };
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "case-1",
          caseKey: "CASE-1",
          status: "OPEN",
          revision: 3,
          assignedEmployeeId: null,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(updatedCase),
      },
      activityEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    };
    const { prisma, transaction } = prismaWithTransaction(tx);

    await expect(
      assignCase(prisma, {
        caseId: "case-1",
        actorId: "manager-1",
        employeeId: "employee-2",
      }),
    ).resolves.toBe(updatedCase);

    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.operationalCase.updateMany).toHaveBeenCalledWith({
      where: { id: "case-1", status: "OPEN", revision: 3 },
      data: { assignedEmployeeId: "employee-2", revision: { increment: 1 } },
    });
    expect(tx.activityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "manager-1",
        action: "CASE_ASSIGNED",
        objectId: "case-1",
        beforeJson: JSON.stringify({ assignedEmployeeId: null }),
        afterJson: JSON.stringify({ assignedEmployeeId: "employee-2" }),
      }),
    });
  });

  it("rejects a competing assignment without writing an audit event", async () => {
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "case-1",
          caseKey: "CASE-1",
          status: "OPEN",
          revision: 3,
          assignedEmployeeId: null,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
      activityEvent: { create: vi.fn() },
    };
    const { prisma } = prismaWithTransaction(tx);

    await expect(
      assignCase(prisma, { caseId: "case-1", actorId: "manager-1", employeeId: "employee-2" }),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(tx.operationalCase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "case-1", status: "OPEN", revision: 3 } }),
    );
    expect(tx.activityEvent.create).not.toHaveBeenCalled();
    expect(tx.operationalCase.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("raises priority by one level and audits the transition atomically", async () => {
    const updatedCase = { id: "case-1", priority: "MEDIUM", revision: 5 };
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "case-1",
          caseKey: "CASE-1",
          status: "IN_PROGRESS",
          priority: "LOW",
          revision: 4,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(updatedCase),
      },
      activityEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    };
    const { prisma, transaction } = prismaWithTransaction(tx);

    await expect(
      escalateCase(prisma, {
        caseId: "case-1",
        actorId: "manager-1",
      }),
    ).resolves.toBe(updatedCase);

    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.operationalCase.updateMany).toHaveBeenCalledWith({
      where: { id: "case-1", status: "IN_PROGRESS", revision: 4 },
      data: { priority: "MEDIUM", revision: { increment: 1 } },
    });
    expect(tx.activityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "manager-1",
        action: "CASE_ESCALATED",
        objectId: "case-1",
        beforeJson: JSON.stringify({ priority: "LOW", revision: 4 }),
        afterJson: JSON.stringify({ priority: "MEDIUM", revision: 5 }),
      }),
    });
  });

  it("rejects a concurrent escalation and does not append an audit event", async () => {
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "case-1",
          caseKey: "CASE-1",
          status: "OPEN",
          priority: "LOW",
          revision: 0,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
      activityEvent: { create: vi.fn() },
    };
    const { prisma } = prismaWithTransaction(tx);

    await expect(
      escalateCase(prisma, { caseId: "case-1", actorId: "manager-1" }),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(tx.operationalCase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "case-1", status: "OPEN", revision: 0 } }),
    );
    expect(tx.activityEvent.create).not.toHaveBeenCalled();
    expect(tx.operationalCase.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
