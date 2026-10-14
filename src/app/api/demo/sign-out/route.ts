import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { demoSessionCookieName, demoSessionCookieOptions, revokeDemoSession } from "@/server/providers/demo/session-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return new Response("This request could not be verified.", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const cookieStore = await cookies();
  const name = demoSessionCookieName();
  const sessionId = cookieStore.get(name)?.value;
  try {
    await revokeDemoSession(sessionId);
  } catch {
    // Clearing this browser's cookie still ends access from this client; the
    // server-side record also expires automatically after its bounded TTL.
    console.error("[Demo sign-out] Session revocation failed", { category: "session-revocation" });
  }
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.set(name, "", { ...demoSessionCookieOptions(0), expires: new Date(0) });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
