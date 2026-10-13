import { describe, expect, it } from "vitest";
import { approvalDecisionSchema, customerInputSchema, projectInputSchema } from "./validation";

describe("server-side input validation", () => {
  it("rejects malformed customer input before service operations", () => {
    const result = customerInputSchema.safeParse({
      name: "A",
      industry: "Test",
      email: "not-an-email",
      phone: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a project due date before its start date", () => {
    const result = projectInputSchema.safeParse({
      name: "Operations rollout",
      description: "",
      customerId: "customer-1",
      status: "PLANNING",
      priority: "HIGH",
      startDate: "2026-10-20",
      dueDate: "2026-10-19",
      budget: "1000.00",
      progress: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects approval decisions outside the supported transition set", () => {
    expect(approvalDecisionSchema.safeParse({ decision: "PENDING", comment: "" }).success).toBe(false);
    expect(approvalDecisionSchema.safeParse({ decision: "APPROVED", comment: "Review complete." }).success).toBe(true);
  });
});
