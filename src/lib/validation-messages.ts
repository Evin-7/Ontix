type ValidationIssue = Readonly<{
  path: ReadonlyArray<PropertyKey>;
  message: string;
}>;

const fieldLabels: Record<string, string> = {
  accountOwnerId: "account owner",
  amount: "amount",
  budget: "budget",
  category: "category",
  comment: "comment",
  customerId: "customer",
  department: "department",
  description: "description",
  dueDate: "due date",
  email: "email address",
  employeeNumber: "employee number",
  justification: "justification",
  name: "name",
  phone: "phone number",
  priority: "priority",
  progress: "progress",
  role: "role",
  slaDeadline: "SLA deadline",
  startDate: "start date",
  status: "status",
  teamId: "team",
  title: "title",
  type: "request type",
};

export function formatValidationMessage(issue: ValidationIssue) {
  const key = String(issue.path[0] ?? "");
  const field = fieldLabels[key] ?? "this field";
  const source = issue.message;
  const lower = source.toLowerCase();

  if (key === "email" || lower.includes("email")) return "Enter a valid email address.";
  if (lower.startsWith("due date must") || lower.startsWith("provide at least one") || lower.startsWith("use letters")) return source;

  const minCharacters = source.match(/>=\s*(\d+)\s*characters?/i);
  if (minCharacters) return `Enter at least ${minCharacters[1]} characters.`;
  const maxCharacters = source.match(/<=\s*(\d+)\s*characters?/i);
  if (maxCharacters) return `Use ${maxCharacters[1]} characters or fewer.`;

  if (lower.includes("too small") || lower.includes("minimum")) return `Enter a valid ${field}; it is below the minimum allowed.`;
  if (lower.includes("too big") || lower.includes("maximum")) return `Enter a valid ${field}; it exceeds the allowed limit.`;
  if (lower.includes("expected") || lower.includes("invalid input")) return `Check ${field} and try again.`;
  return source;
}

export function toFieldErrors(issues: ReadonlyArray<ValidationIssue>) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = formatValidationMessage(issue);
  }
  return errors;
}
