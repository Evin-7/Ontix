import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasDemoSessionCookie } from "@/server/providers/demo/auth";
import { isSameOriginRequest } from "@/server/http/origin";
import { assignFoundryCase, resolveFoundryCase, updateFoundryProjectStatus, type FoundryWorkflowResult } from "@/server/providers/foundry/workflows";

export const runtime = "nodejs";

const id = z.string().trim().min(1).max(256);
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign-case"), caseId: id, employeeId: id }),
  z.object({ action: z.literal("resolve-case"), caseId: id }),
  z.object({
    action: z.literal("update-project-status"),
    projectId: id,
    status: z.enum(["PLANNING", "IN_PROGRESS", "AT_RISK", "COMPLETED"]),
  }),
]);

function responseStatus(code: string) {
  switch (code) {
    case "invalid_input": return 400;
    case "unauthenticated":
    case "authorization_expired": return 401;
    case "forbidden":
    case "action_denied": return 403;
    case "not_found": return 404;
    case "conflict": return 409;
    default: return 502;
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, code: "forbidden", error: "This request could not be verified." }, { status: 403 });
  }

  if (await hasDemoSessionCookie()) {
    return NextResponse.json({ ok: false, code: "forbidden", error: "This read-only workspace does not allow edits." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ ok: false, code: "invalid_input", error: "Send a valid workflow request." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input", error: "Send a valid workflow request." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "invalid_input", error: "Check the submitted workflow values." }, { status: 400 });
  }

  let result: FoundryWorkflowResult;
  switch (parsed.data.action) {
    case "assign-case":
      result = await assignFoundryCase({ caseId: parsed.data.caseId, employeeId: parsed.data.employeeId });
      break;
    case "resolve-case":
      result = await resolveFoundryCase({ caseId: parsed.data.caseId });
      break;
    case "update-project-status":
      result = await updateFoundryProjectStatus({ projectId: parsed.data.projectId, status: parsed.data.status });
      break;
  }

  if (!result.ok) {
    // The browser needs only a stable failure code. Provider diagnostics stay
    // in sanitized server logs and are mapped to friendly copy by the UI.
    return NextResponse.json({ ok: false, code: result.code }, { status: responseStatus(result.code) });
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true }, { status: 200 });
}
