import { toNextJsHandler } from "better-auth/next-js";
import { auth, assertAuthConfigured } from "@/lib/auth";

export const runtime = "nodejs";

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  assertAuthConfigured();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  assertAuthConfigured();
  return handlers.POST(request);
}
