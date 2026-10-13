import { NextResponse } from "next/server";
import { getFoundryApplicationUrl } from "@/server/providers/foundry/config";
import { endCurrentFoundrySession, foundrySessionCookieName } from "@/server/providers/foundry/standalone-auth";
import { foundrySessionCookieOptions } from "@/server/providers/foundry/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let applicationUrl: URL;
  try {
    applicationUrl = getFoundryApplicationUrl();
  } catch {
    return new Response("Foundry sign-in is not configured.", { status: 500, headers: { "cache-control": "no-store" } });
  }
  if (request.headers.get("origin") !== applicationUrl.origin) {
    return new Response("Forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  }

  try {
    await endCurrentFoundrySession();
    const response = NextResponse.redirect(new URL("/", applicationUrl), 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(foundrySessionCookieName(), "", {
      ...foundrySessionCookieOptions(0),
      expires: new Date(0),
    });
    return response;
  } catch {
    return new Response("Could not end the Ontix session.", { status: 503, headers: { "cache-control": "no-store" } });
  }
}
