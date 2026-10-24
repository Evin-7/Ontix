# Foundry setup for Ontix

## Foundry workspace observations

The Foundry UI observations below were last checked on 2026-10-14. Repository implementation status was updated separately on 2026-10-24; an updated code path does not prove a live Foundry call succeeded.

The authenticated Brave session is connected to `https://ontix.usw-23.palantirfoundry.com`, project `ontix`, Ontology `ontix Ontology`, branch Main.

The enabled **Ontix Web Integration** application is a public client with user permissions and Authorization Code + PKCE. Its registered callback is `http://127.0.0.1:3000/api/foundry/oauth/callback`. The Developer Console app RID is `ri.third-party-applications.main.application.5b92ff21-1e39-49a1-9483-4013f008ce26`. It is restricted to six object types, five links, and three saved actions. The OAuth flow requests Ontology read/write scopes; those scopes do not override the per-user Foundry permissions or application resource restrictions. A public client has no client secret.

`OperationalCase`, `ApprovalRequest`, and `Project` already had edits enabled when inspected, so no broader edit setting was changed. That edit capability applies beyond Ontix's action list and remains subject to each user's Foundry permissions.

Saved actions:

| Action | API name | Workflow rule | Status |
| --- | --- | --- | --- |
| `UpdateCaseStatus` | `update-case-status` | Resolves eligible OPEN/IN_PROGRESS cases. Snapshot isolation is enabled. | Saved and selected in app restrictions. |
| `AssignCaseToEmployee` | `assign-case-to-employee` | Assigns a selected Employee while the case is OPEN, IN_PROGRESS, or WAITING_APPROVAL. Snapshot isolation is enabled. | Saved and selected in app restrictions. |
| `UpdateProjectStatus` | `update-project-status` | Validates project status against the configured allowed values. Snapshot isolation is enabled. | Saved and selected in app restrictions. |

`AssignCaseToEmployee` does not enforce the Neon workspace provider's active-employee rule: the Foundry Employee source has no active-state field. `ApproveRequest` and `RejectRequest` have not been created because the current fictional employee records have no trustworthy mapping to Foundry user IDs. Approval actions must prevent self-approval and update the approval and its linked case atomically; adding weaker status-only actions would violate the requested rules.

## Ontology indexing and Test Run

Foundry dataset previews show rows for all six fictional source files. Ontology Manager previously showed 0 indexed Customer objects and 0 indexed ApprovalRequest objects (both source datasets have four rows); Project, Team, Employee, and OperationalCase had 5, 3, 8, and 8 indexed objects respectively. Approval and customer source rows must not be treated as indexed Ontology objects.

The action editor's Test run pane remains empty after saving and selecting Form layout; it shows the initial “Fill in the form and click submit to run a test” message without parameter inputs. The official Test Run guide says the form should accept parameters and the preview should show proposed edits without committing them. No normal Preview submission was used. Until the pane renders, the actions have not been test-run against Foundry records.

## Local OSDK integration

Developer Console generated npm SDK version `0.2.0` with generator `2.80.0`, using the six object types, five links, and three actions above. The package is preserved at `foundry/generated-sdk/ontix-web-integration-sdk-0.2.0.tgz`. The generated `$ontologyRid` is imported from that package. `@osdk/client`, `@osdk/oauth`, and `@osdk/foundry` are installed as dependencies.

`src/server/providers/foundry/client.ts` creates a server-only OSDK client. Foundry mode reads bounded snapshot pages from the six generated object types in `workspace.ts`. `relationships.ts` fetches one selected object and traverses its generated `$link` accessors, with a capped result shown in the record drawer. `workflows.ts` calls the three saved actions after server-side role and transition checks. The Integrations page also includes a separate six-type read probe. These paths are implemented but have not completed an authenticated end-to-end run.

The generated package is an initial version. Generate a new SDK version after the approval actions are safely implemented or any Ontology resource changes. Do not use the package generator's temporary token as application runtime credentials.

## OAuth, sessions, and verification gates

Foundry mode uses its own Foundry sign-in path with Authorization Code + PKCE, group-derived roles, and encrypted rotating tokens in the shared session store. The Neon workspace retains its separate Better Auth login and Prisma/Neon business data. The Foundry role mapping is not a stable person identity and does not support self-approval or person-level Ontix audit attribution.

The standalone Foundry path stores OAuth state and encrypted rotating tokens in Upstash Redis and places only an opaque HttpOnly session cookie in the browser. The older linked-account flow is still present for the Neon workspace integration surface; it is distinct from Foundry mode's primary sign-in. Keep credentials private and do not paste them into chat. For an end-to-end verification, configure the Foundry and shared-session-store variables from `.env.example`, confirm the role group IDs and callback with Developer Console, sign in as an authorized user, open records and traverse links, then execute only a permitted action on fictional data. The Integrations verifier performs six read requests and surfaces an error if an object type is unavailable or unindexed. Local key presence is not proof that OAuth, Redis, or OSDK requests work.

The status of the current implementation is in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). No Vercel deployment or environment change was performed.

## Official references

- [Create a Developer Console application](https://www.palantir.com/docs/foundry/developer-console/create-application)
- [Application resource restrictions and OAuth scopes](https://www.palantir.com/docs/foundry/developer-console/application-restrictions)
- [Public client permissions](https://www.palantir.com/docs/foundry/developer-console/permissions)
- [Foundry OAuth2 clients](https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients)
- [Action rules](https://www.palantir.com/docs/foundry/action-types/rules)
- [Submission criteria](https://www.palantir.com/docs/foundry/action-types/submission-criteria)
- [Action consistency and isolation](https://www.palantir.com/docs/foundry/action-types/consistency-guarantees)
- [Action Test Run](https://www.palantir.com/docs/foundry/action-types/test-run)
- [Bootstrap a server-side TypeScript application](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-server-side-typescript)
- [TypeScript OSDK v2](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
