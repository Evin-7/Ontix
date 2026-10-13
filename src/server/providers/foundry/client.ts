import "server-only";

import { createClient } from "@osdk/client";
import {
  $ontologyRid,
  ApprovalRequest,
  Customer,
  Employee,
  OperationalCase,
  Project,
  Team,
} from "@ontix-web-integration/sdk";
import { getFoundryOAuthConfig } from "./config";
import { getFoundryAccessToken, FoundryTokenError } from "./tokens";

export class FoundryQueryError extends Error {
  constructor(message = "Foundry data could not be verified. Check your Foundry access and try again.") {
    super(message);
    this.name = "FoundryQueryError";
  }
}

export function createFoundryClient(authUserId: string) {
  return createFoundryClientWithTokenProvider(async () => {
    const token = await getFoundryAccessToken(authUserId);
    if (!token) throw new FoundryTokenError();
    return token;
  });
}

export function createFoundryClientWithTokenProvider(getToken: () => Promise<string>) {
  const { stackUrl } = getFoundryOAuthConfig();
  return createClient(stackUrl.origin, $ontologyRid, getToken);
}

/**
 * Makes a live, user-scoped read against every generated object type. One row
 * per type is enough to verify the OAuth grant and resource restrictions
 * without loading entire datasets into the application server.
 */
export async function verifyFoundryObjectAccess(authUserId: string) {
  const client = createFoundryClient(authUserId);
  return verifyFoundryObjectsWithClient(client);
}

export async function verifyFoundryObjectAccessWithToken(accessToken: string) {
  const client = createFoundryClientWithTokenProvider(async () => accessToken);
  return verifyFoundryObjectsWithClient(client);
}

async function verifyFoundryObjectsWithClient(client: ReturnType<typeof createFoundryClientWithTokenProvider>) {
  try {
    const results = await Promise.all([
      client(Customer).fetchPage({ $pageSize: 1 }).then((page) => ["Customer", page.data.length] as const),
      client(Project).fetchPage({ $pageSize: 1 }).then((page) => ["Project", page.data.length] as const),
      client(Employee).fetchPage({ $pageSize: 1 }).then((page) => ["Employee", page.data.length] as const),
      client(Team).fetchPage({ $pageSize: 1 }).then((page) => ["Team", page.data.length] as const),
      client(OperationalCase).fetchPage({ $pageSize: 1 }).then((page) => ["OperationalCase", page.data.length] as const),
      client(ApprovalRequest).fetchPage({ $pageSize: 1 }).then((page) => ["ApprovalRequest", page.data.length] as const),
    ]);
    return {
      checkedAt: new Date().toISOString(),
      objects: Object.fromEntries(results.map(([name, sampleRows]) => [name, sampleRows])),
    };
  } catch (error) {
    if (error instanceof FoundryTokenError) throw error;
    throw new FoundryQueryError();
  }
}
