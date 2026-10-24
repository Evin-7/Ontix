import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDemoSessionCookie } from "@/server/providers/demo/auth";
import { getCurrentFoundrySession } from "@/server/providers/foundry/standalone-auth";
import { readFoundryRelationships, type FoundryRelationshipObjectType } from "@/server/providers/foundry/relationships";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const typeSchema = z.enum(["Customer", "Project", "OperationalCase", "Employee", "Team", "ApprovalRequest"]);
const idSchema = z.string().trim().min(1).max(256);
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (await hasDemoSessionCookie()) {
    return NextResponse.json({ error: "Ontology links are available only in the Foundry workspace." }, { status: 403, headers: privateHeaders });
  }

  const params = new URL(request.url).searchParams;
  const type = typeSchema.safeParse(params.get("type"));
  const id = idSchema.safeParse(params.get("id"));
  if (!type.success || !id.success) {
    return NextResponse.json({ error: "Choose a valid Ontology object." }, { status: 400, headers: privateHeaders });
  }

  try {
    const current = await getCurrentFoundrySession();
    if (!current) {
      return NextResponse.json({ error: "Sign in to Foundry to explore Ontology links." }, { status: 401, headers: privateHeaders });
    }
    const relationships = await readFoundryRelationships(current.accessToken, type.data as FoundryRelationshipObjectType, id.data);
    return NextResponse.json({ relationships }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "Foundry could not load these Ontology links. Refresh the record and try again." }, { status: 502, headers: privateHeaders });
  }
}
