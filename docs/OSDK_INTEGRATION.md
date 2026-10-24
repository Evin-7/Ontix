# TypeScript OSDK integration

## Current implementation

Developer Console generated `@ontix-web-integration/sdk@0.2.0` with generator 2.80.0. The checked-in package matches the six Ontology object types, five link definitions, and three saved actions described in [Foundry setup](FOUNDRY_SETUP.md).

Foundry mode currently has these server-side paths:

- Bounded snapshot-paged reads for Customer, Project, Employee, Team, OperationalCase, and ApprovalRequest in `src/server/providers/foundry/workspace.ts`.
- One-hop relationship traversal through generated `object.$link.*` accessors in `src/server/providers/foundry/relationships.ts`. The route validates the object type and ID, requires a Foundry session, returns no-store data, and limits each many-valued link to eight displayed records.
- Calls to `UpdateCaseStatus`, `AssignCaseToEmployee`, and `UpdateProjectStatus` in `workflows.ts`, with role, status-transition, and input checks before OSDK action calls.
- A separate read-only six-object verification control in the Integrations view.

The Neon workspace remains a separate Neon/Prisma application with fictional development records. Its relationship explorer resolves PostgreSQL relationships on the server. Foundry mode never uses Neon as a fallback.

**Live verification status:** none of the Foundry sign-in, OSDK read, link, or action paths has been completed as a successful authenticated end-to-end run. Code presence and Foundry UI configuration do not establish a working integration. See [implementation status](IMPLEMENTATION_STATUS.md) for the evidence dates and remaining checks.

## Generated link surface

| Source object | Generated links used by the detail drawer |
| --- | --- |
| Customer | `projects` |
| Project | `customer`, `operationalCases` |
| OperationalCase | `project`, `assignedEmployee`, `approvalRequests` |
| Employee | `team`, `assignedCases` |
| Team | `employees` |
| ApprovalRequest | `operationalCase` |

The UI loads these only after a user expands **Ontology relationships** for one record. It does not issue a relationship query for every row in a list. Results show names/IDs and links to the related object page; they do not return raw Foundry payloads or tokens.

## Authentication and server boundary

Foundry mode uses Authorization Code + PKCE, an opaque HttpOnly session cookie, encrypted server-side OAuth tokens, and configured Foundry group-to-role mappings. The OSDK client is created only in server-only modules using the current user's token. The browser receives only the selected record's bounded view data and relationship summaries. Foundry continues to enforce the consenting user's permissions and the Developer Console app restrictions; UI flags are not a substitute for those controls.

The Neon workspace retains its separate Better Auth and Neon/Prisma path. Do not remove that provider until the Foundry mode covers all required identity, role, session, workflow, persistence, and audit behavior and those behaviors have been verified. Approval actions remain intentionally absent because the model does not provide a trusted mapping between the requester employee and the signed-in Foundry person.

## Installation and regeneration

The SDK tarball is checked into `foundry/generated-sdk/ontix-web-integration-sdk-0.2.0.tgz` and installed through the local package reference in `package.json`. `@osdk/client`, `@osdk/oauth`, and `@osdk/foundry` versions are recorded in `package.json` and `package-lock.json`. Keep any short-lived registry token out of source control and runtime environment. Regenerate the package after changing object, link, or action definitions in Foundry, then review the generated type changes before adapting application code.

## Environment

Foundry mode requires server-side values for `FOUNDRY_STACK_URL`, `FOUNDRY_CLIENT_ID`, `FOUNDRY_REDIRECT_URI`, `ONTIX_APPLICATION_URL`, `FOUNDRY_TOKEN_ENCRYPTION_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and at least one `FOUNDRY_*_GROUP_IDS` role mapping. The callback must exactly match Developer Console. The encryption key and Redis token are secrets; the OAuth client ID is public but remains server configuration. See [`.env.example`](../.env.example) and [Foundry group authorization](FOUNDRY_GROUP_AUTH.md).

Do not put Foundry tokens, encryption keys, or the session-store token in `NEXT_PUBLIC_*`, Client Components, logs, or commits. Do not mix Foundry and Neon credentials. Local environment configuration does not prove an authenticated request succeeded.

## Verification gates

Before describing the project as a live integration, complete and record:

1. A Foundry sign-in and callback using the registered public client and a user in an allowed Ontix group.
2. All six authenticated object reads with meaningful fictional records.
3. Every configured relationship traversal, including empty and permission-denied cases.
4. One permitted action and one denied/invalid transition, with resulting Foundry state checked after each.
5. Refresh-token rotation, concurrent refresh, logout, expired/revoked session, group-check failure, and unauthorized access behavior.
6. The Neon workspace still works independently and there is no Foundry-to-Neon fallback.

The Foundry action editor's Test Run pane was empty when last inspected; do not submit a regular action as a substitute for Test Run without an explicit, reviewed plan. No deployment has been made from this checkout.

## Official references

- [Create a Developer Console application](https://www.palantir.com/docs/foundry/developer-console/create-application)
- [Application restrictions and OAuth scopes](https://www.palantir.com/docs/foundry/developer-console/application-restrictions)
- [Public client permissions](https://www.palantir.com/docs/foundry/developer-console/permissions)
- [Writing OAuth2 clients for Foundry](https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients)
- [Server-side TypeScript OSDK bootstrap](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-server-side-typescript)
- [TypeScript OSDK v2](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [TypeScript OSDK migration guide](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration)
- [Ontology action types](https://www.palantir.com/docs/foundry/action-types/getting-started)
