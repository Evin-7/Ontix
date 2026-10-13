export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

export function safeDatabaseErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string") return undefined;
  if (code === "P2002") return "That value is already in use. Check the unique fields and try again.";
  if (code === "P2025") return "This record no longer exists. Refresh and try again.";
  if (code === "P2003") return "This change conflicts with related records. Refresh and check its linked records.";
  if (code === "P2034") return "Another change was saved at the same time. Refresh and try again.";
  if (code === "P1000" || code === "P1010") return "Database authentication failed. Ask an administrator to verify the server-side Neon credentials and permissions.";
  if (["P1001", "P1002", "P1017", "P2024"].includes(code)) return "The database is temporarily unavailable. Check the connection and try again.";
  return undefined;
}
