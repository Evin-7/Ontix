import "server-only";

import { cache } from "react";
import { getCurrentFoundrySession } from "./standalone-auth";
import { getFoundryWorkspaceWithToken, type FoundryWorkspaceModule } from "./workspace";

// React cache is scoped to the current server render. It deduplicates the
// session/group check when a route layout and its page both need the session,
// without persisting private Foundry records across requests or users.
const readSession = cache(async () => getCurrentFoundrySession());

export const getFoundryDashboardSession = cache(async () => readSession());

export const getFoundryModuleContext = cache(async (module: FoundryWorkspaceModule) => {
  const current = await readSession();
  if (!current) return null;
  const workspace = await getFoundryWorkspaceWithToken(current.accessToken, module);
  return { session: current.session, workspace };
});
