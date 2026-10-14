import "server-only";

import { cache } from "react";
import { getCurrentFoundrySession } from "@/server/providers/foundry/standalone-auth";
import { getFoundryWorkspaceWithToken, type FoundryWorkspaceModule } from "@/server/providers/foundry/workspace";
import { getCurrentDemoSession } from "@/server/providers/demo/auth";
import { getDemoWorkspace } from "@/server/providers/demo/workspace";

const readSession = cache(async () => {
  const demo = await getCurrentDemoSession();
  // A present demo cookie, even if expired or missing in Redis, never falls
  // through to a Foundry session in the same browser.
  if (demo.cookiePresent) {
    return demo.session ? { mode: "demo" as const, session: { role: "DEMO" as const, expiresAt: demo.session.expiresAt } } : null;
  }
  const foundry = await getCurrentFoundrySession();
  return foundry ? { mode: "foundry" as const, session: foundry.session, accessToken: foundry.accessToken } : null;
});

export const getOntixDashboardSession = cache(async () => {
  const current = await readSession();
  if (!current) return null;
  return { mode: current.mode, session: current.session };
});

export const getOntixModuleContext = cache(async (module: FoundryWorkspaceModule) => {
  const current = await readSession();
  if (!current) return null;
  if (current.mode === "demo") {
    return { mode: current.mode, session: current.session, workspace: getDemoWorkspace() };
  }
  const workspace = await getFoundryWorkspaceWithToken(current.accessToken, module);
  return { mode: current.mode, session: current.session, workspace };
});
