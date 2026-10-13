import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";
import { assignCase, escalateCase, resolveCase } from "./case-workflow";
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
      $queryRaw: vi.fn().mockResolvedValue([{ id: "employee-2" }]),
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
      $queryRaw: vi.fn().mockResolvedValue([{ id: "employee-2" }]),
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

  it("can unassign a case and records the change atomically", async () => {
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "case-1",
          caseKey: "CASE-1",
          status: "IN_PROGRESS",
          revision: 4,
          assignedEmployeeId: "employee-2",
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "case-1", assignedEmployeeId: null, revision: 5 }),
      },
      activityEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    };
    const { prisma, transaction } = prismaWithTransaction(tx);

    await expect(assignCase(prisma, { caseId: "case-1", actorId: "manager-1", employeeId: null }))
      .resolves.toEqual({ id: "case-1", assignedEmployeeId: null, revision: 5 });

    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.operationalCase.updateMany).toHaveBeenCalledWith({
      where: { id: "case-1", status: "IN_PROGRESS", revision: 4 },
      data: { assignedEmployeeId: null, revision: { increment: 1 } },
    });
    expect(tx.activityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        summary: "CASE-1 unassigned",
        beforeJson: JSON.stringify({ assignedEmployeeId: "employee-2" }),
        afterJson: JSON.stringify({ assignedEmployeeId: null }),
      }),
    });
  });

  it("rejects assigning an inactive employee", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      operationalCase: { findUnique: vi.fn(), updateMany: vi.fn() },
      activityEvent: { create: vi.fn() },
    };
    const { prisma } = prismaWithTransaction(tx);

    await expect(assignCase(prisma, { caseId: "case-1", actorId: "manager-1", employeeId: "employee-inactive" }))
      .rejects.toThrow("Only active employees can be assigned to a case.");
    expect(tx.operationalCase.findUnique).not.toHaveBeenCalled();
    expect(tx.activityEvent.create).not.toHaveBeenCalled();
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
          escalationLevel: 0,
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
      data: { priority: "MEDIUM", escalationLevel: { increment: 1 }, revision: { increment: 1 } },
    });
    expect(tx.activityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "manager-1",
        action: "CASE_ESCALATED",
        objectId: "case-1",
        beforeJson: JSON.stringify({ priority: "LOW", escalationLevel: 0, revision: 4 }),
        afterJson: JSON.stringify({ priority: "MEDIUM", escalationLevel: 1, revision: 5 }),
      }),
    });
  });

  it("escalates HIGH to CRITICAL and stops at CRITICAL", async () => {
    const tx = {
      operationalCase: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: "case-1", caseKey: "CASE-1", status: "OPEN", priority: "HIGH", escalationLevel: 2, revision: 3 })
          .mockResolvedValueOnce({ id: "case-1", caseKey: "CASE-1", status: "OPEN", priority: "CRITICAL", escalationLevel: 3, revision: 4 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "case-1", priority: "CRITICAL", escalationLevel: 3 }),
      },
      activityEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    };
    const { prisma } = prismaWithTransaction(tx);

    await expect(escalateCase(prisma, { caseId: "case-1", actorId: "manager-1" }))
      .resolves.toEqual({ id: "case-1", priority: "CRITICAL", escalationLevel: 3 });
    expect(tx.operationalCase.updateMany).toHaveBeenCalledWith({
      where: { id: "case-1", status: "OPEN", revision: 3 },
      data: { priority: "CRITICAL", escalationLevel: { increment: 1 }, revision: { increment: 1 } },
    });
    await expect(escalateCase(prisma, { caseId: "case-1", actorId: "manager-1" }))
      .rejects.toThrow("The case is already at the highest priority.");
    expect(tx.activityEvent.create).toHaveBeenCalledOnce();
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

  it("resolves an open case and records the state change atomically", async () => {
    const resolvedCase = { id: "case-1", status: "RESOLVED", revision: 5 };
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({ id: "case-1", caseKey: "CASE-1", status: "IN_PROGRESS", revision: 4 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(resolvedCase),
      },
      activityEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    };
    const { prisma, transaction } = prismaWithTransaction(tx);

    await expect(resolveCase(prisma, { caseId: "case-1", actorId: "manager-1" })).resolves.toBe(resolvedCase);
    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.operationalCase.updateMany).toHaveBeenCalledWith({
      where: { id: "case-1", status: "IN_PROGRESS", revision: 4 },
      data: expect.objectContaining({ status: "RESOLVED", revision: { increment: 1 }, resolutionDate: expect.any(Date) }),
    });
    expect(tx.activityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "RESOLVED", objectType: "OperationalCase", objectId: "case-1" }),
    });
  });

  it("does not resolve a case that is waiting for approval", async () => {
    const tx = {
      operationalCase: {
        findUnique: vi.fn().mockResolvedValue({ id: "case-1", caseKey: "CASE-1", status: "WAITING_APPROVAL", revision: 2 }),
        updateMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      activityEvent: { create: vi.fn() },
    };
    const { prisma } = prismaWithTransaction(tx);

    await expect(resolveCase(prisma, { caseId: "case-1", actorId: "manager-1" })).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(tx.operationalCase.updateMany).not.toHaveBeenCalled();
    expect(tx.activityEvent.create).not.toHaveBeenCalled();
  });
});
