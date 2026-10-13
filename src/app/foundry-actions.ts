"use server";

import { requireActor } from "@/lib/auth/dal";
import { FoundryConfigurationError } from "@/server/providers/foundry/config";
import { FoundryQueryError, verifyFoundryObjectAccess } from "@/server/providers/foundry/client";
import { FoundryTokenError } from "@/server/providers/foundry/tokens";

export type FoundryVerificationResult =
  | { ok: true; checkedAt: string; objects: Record<string, number> }
  | { ok: false; error: string };

export async function verifyFoundryConnection(): Promise<FoundryVerificationResult> {
  try {
    const actor = await requireActor();
    return { ok: true, ...await verifyFoundryObjectAccess(actor.authUserId) };
  } catch (error) {
    if (error instanceof FoundryTokenError) return { ok: false, error: error.message };
    if (error instanceof FoundryConfigurationError || error instanceof FoundryQueryError) {
      return { ok: false, error: error.message };
    }
    console.error("[Ontix] Foundry access check failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, error: "Foundry access could not be verified. Try again later." };
  }
}
