import { describe, expect, it } from "vitest";
import { formatValidationMessage, toFieldErrors } from "./validation-messages";

describe("user-facing validation messages", () => {
  it("turns schema-generated length errors into clear copy", () => {
    expect(formatValidationMessage({ path: ["name"], message: "Too small: expected string to have >= 2 characters" }))
      .toBe("Enter at least 2 characters.");
    expect(formatValidationMessage({ path: ["description"], message: "Too big: expected string to have <= 500 characters" }))
      .toBe("Use 500 characters or fewer.");
  });

  it("keeps useful validation guidance and avoids repeating errors for one field", () => {
    expect(formatValidationMessage({ path: ["email"], message: "Invalid email address" }))
      .toBe("Enter a valid email address.");
    expect(toFieldErrors([
      { path: ["dueDate"], message: "Due date must be on or after the start date." },
      { path: ["dueDate"], message: "Too small: expected date to be after start date" },
    ])).toEqual({ dueDate: "Due date must be on or after the start date." });
  });
});
