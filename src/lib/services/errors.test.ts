import { describe, expect, it } from "vitest";
import { safeDatabaseErrorMessage } from "./errors";

describe("safe database error messages", () => {
  it("gives useful messages for common Prisma failures", () => {
    expect(safeDatabaseErrorMessage({ code: "P2002" })).toMatch(/already in use/i);
    expect(safeDatabaseErrorMessage({ code: "P2025" })).toMatch(/no longer exists/i);
    expect(safeDatabaseErrorMessage({ code: "P2034" })).toMatch(/same time/i);
    expect(safeDatabaseErrorMessage({ code: "P1000" })).toMatch(/authentication failed/i);
    expect(safeDatabaseErrorMessage({ code: "P1001" })).toMatch(/temporarily unavailable/i);
  });

  it("never includes an internal database error message or URL", () => {
    const message = safeDatabaseErrorMessage({
      code: "P1000",
      message: "postgresql://database.neon.tech/private?sslmode=require",
    });
    expect(message).not.toContain("postgresql://");
    expect(message).not.toContain("neon.tech");
  });

  it("leaves unknown query errors to the generic public fallback", () => {
    expect(safeDatabaseErrorMessage({ code: "P2010", message: "private query details" })).toBeUndefined();
    expect(safeDatabaseErrorMessage(new Error("database details"))).toBeUndefined();
  });
});
