import { NextResponse } from "next/server";
import { requireActor, AuthenticationRequiredError } from "@/lib/auth/dal";
import { disconnectFoundryAccount } from "@/server/providers/foundry/tokens";
import { getFoundryApplicationUrl } from "@/server/providers/foundry/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let applicationUrl: URL;
  try {
    applicationUrl = getFoundryApplicationUrl();
  } catch {
    return new Response("Foundry sign-in is not configured.", { status: 500, headers: { "cache-control": "no-store" } });
  }
  const expectedOrigin = applicationUrl.origin;
  if (request.headers.get("origin") !== expectedOrigin) {
    return new Response("Forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  }
  try {
    const actor = await requireActor();
    await disconnectFoundryAccount(actor.authUserId);
    const response = NextResponse.redirect(new URL("/?foundry=disconnected", applicationUrl), 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      const response = NextResponse.redirect(new URL("/login", applicationUrl), 303);
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
    return new Response("Could not disconnect Foundry.", { status: 500, headers: { "cache-control": "no-store" } });
  }
}
