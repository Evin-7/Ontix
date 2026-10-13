import { z } from "zod";

export const customerInputSchema = z.object({
  name: z.string().trim().min(2).max(140),
  industry: z.string().trim().min(2).max(100),
  email: z.email(),
  phone: z.string().trim().min(5).max(40),
  accountOwnerId: z.string().optional().nullable(),
});

export const customerPatchSchema = customerInputSchema.partial();

const projectFieldsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).default(""),
  customerId: z.string().min(1).max(128),
  teamId: z.string().max(128).optional().nullable(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "AT_RISK", "ARCHIVED"]).default("PLANNING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  startDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  progress: z.number().int().min(0).max(100).default(0),
  budget: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
});

export const projectInputSchema = projectFieldsSchema.superRefine((input, context) => {
  if (input.dueDate < input.startDate) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "Due date must be on or after the start date." });
  }
});

export const projectPatchSchema = projectFieldsSchema.partial().extend({
  revision: z.number().int().nonnegative(),
}).superRefine((input, context) => {
  if (Object.keys(input).filter((key) => key !== "revision").length === 0) {
    context.addIssue({ code: "custom", message: "Provide at least one project field to update." });
  }
  if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "Due date must be on or after the start date." });
  }
});

export const caseInputSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(4000).default(""),
  customerId: z.string().min(1).max(128),
  projectId: z.string().max(128).optional().nullable(),
  assignedEmployeeId: z.string().max(128).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  category: z.string().trim().min(2).max(80),
  slaDeadline: z.coerce.date(),
});

export const approvalInputSchema = z.object({
  type: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(180),
  justification: z.string().trim().min(5).max(2000),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().max(1000).default(""),
});

export const employeeInputSchema = z.object({
  employeeNumber: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores."),
  name: z.string().trim().min(2).max(140),
  email: z.email().max(254),
  title: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(100),
  role: z.enum(["ADMINISTRATOR", "MANAGER", "DEVELOPER", "ANALYST"]),
  teamId: z.string().trim().max(128).nullable().optional(),
});

export const employeePatchSchema = employeeInputSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "Provide at least one employee field to update.",
);

export const teamInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  department: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(""),
});

export const teamPatchSchema = teamInputSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "Provide at least one team field to update.",
);
