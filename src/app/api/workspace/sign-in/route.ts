import { NextResponse } from "next/server";
import { createDemoSession, allowDemoLoginAttempt, DemoSessionStoreError, demoSessionCookieName, demoSessionCookieOptions } from "@/server/providers/demo/session-store";
import { isDemoAuthenticationConfigured, verifyDemoCredentials } from "@/server/providers/demo/auth";
import { isSameOriginRequest } from "@/server/http/origin";
import { readLoginEventLocation, recordLoginEvent } from "@/server/providers/ontix/login-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToLogin(request: Request, error: string) {
  const response = NextResponse.redirect(new URL(`/workspace-login?error=${encodeURIComponent(error)}`, request.url), { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!contentType || !["application/x-www-form-urlencoded", "multipart/form-data"].includes(contentType) || contentLength > 4096) {
    return NextResponse.json({ error: "Send a valid workspace sign-in request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!isDemoAuthenticationConfigured()) return redirectToLogin(request, "unavailable");

  let form: FormData;
  try { form = await request.formData(); } catch { return redirectToLogin(request, "invalid"); }
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const clientAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const limit = await allowDemoLoginAttempt(clientAddress);
    if (!limit.allowed) return redirectToLogin(request, "rate-limited");
    if (!await verifyDemoCredentials(username, password)) return redirectToLogin(request, "invalid");
    const session = await createDemoSession();
    try {
      await recordLoginEvent("demo", readLoginEventLocation(request.headers));
    } catch {
      console.error("[Workspace sign-in] Login event could not be recorded.");
    }
    const response = NextResponse.redirect(new URL("/overview", request.url), { status: 303 });
    response.cookies.set(demoSessionCookieName(), session.sessionId, demoSessionCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[Workspace sign-in] Request failed", { category: error instanceof DemoSessionStoreError ? error.category : "unexpected" });
    return redirectToLogin(request, "unavailable");
  }
}
