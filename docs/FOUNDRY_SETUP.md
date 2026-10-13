# Foundry setup for Ontix

## Verified enrollment and Developer Console state

The authenticated Brave session is connected to `https://ontix.usw-23.palantirfoundry.com`, project `ontix`, Ontology `ontix Ontology`, branch Main.

The enabled **Ontix Web Integration** application is a public client with user permissions and Authorization Code + PKCE. Its registered callback is `http://127.0.0.1:3000/api/foundry/oauth/callback`. The Developer Console app RID is `ri.third-party-applications.main.application.5b92ff21-1e39-49a1-9483-4013f008ce26`. It is restricted to six object types, five links, and three saved actions. The OAuth flow requests Ontology read/write scopes; those scopes do not override the per-user Foundry permissions or application resource restrictions. A public client has no client secret.

`OperationalCase`, `ApprovalRequest`, and `Project` already had edits enabled when inspected, so no broader edit setting was changed. That edit capability applies beyond Ontix's action list and remains subject to each user's Foundry permissions.

Saved actions:

| Action | API name | Workflow rule | Status |
| --- | --- | --- | --- |
| `UpdateCaseStatus` | `update-case-status` | Resolves eligible OPEN/IN_PROGRESS cases. Snapshot isolation is enabled. | Saved and selected in app restrictions. |
| `AssignCaseToEmployee` | `assign-case-to-employee` | Assigns a selected Employee while the case is OPEN, IN_PROGRESS, or WAITING_APPROVAL. Snapshot isolation is enabled. | Saved and selected in app restrictions. |
| `UpdateProjectStatus` | `update-project-status` | Validates project status against the configured allowed values. Snapshot isolation is enabled. | Saved and selected in app restrictions. |

`AssignCaseToEmployee` does not enforce the Local Demo provider's active-employee rule: the Foundry Employee source has no active-state field. `ApproveRequest` and `RejectRequest` have not been created because the current fictional employee records have no trustworthy mapping to Foundry user IDs. Approval actions must prevent self-approval and update the approval and its linked case atomically; adding weaker status-only actions would violate the requested rules.

## Ontology indexing and Test Run

Foundry dataset previews show rows for all six fictional source files. Ontology Manager previously showed 0 indexed Customer objects and 0 indexed ApprovalRequest objects (both source datasets have four rows); Project, Team, Employee, and OperationalCase had 5, 3, 8, and 8 indexed objects respectively. Approval and customer source rows must not be treated as indexed Ontology objects.

The action editor's Test run pane remains empty after saving and selecting Form layout; it shows the initial “Fill in the form and click submit to run a test” message without parameter inputs. The official Test Run guide says the form should accept parameters and the preview should show proposed edits without committing them. No normal Preview submission was used. Until the pane renders, the actions have not been test-run against Foundry records.

## Local OSDK integration

Developer Console generated npm SDK version `0.2.0` with generator `2.80.0`, using the six object types, five links, and three actions above. The package is preserved at `foundry/generated-sdk/ontix-web-integration-sdk-0.2.0.tgz`. The generated `$ontologyRid` is imported from that package. `@osdk/client`, `@osdk/oauth`, and `@osdk/foundry` are installed as dependencies.

`src/server/providers/foundry/client.ts` creates a server-only OSDK client whose token provider reads the signed-in Ontix user's encrypted Foundry grant. `verifyFoundryObjectAccess` queries at most one row from each of the six object types. The Integrations page includes a live verification control. This is only a read probe; it is not a full dashboard/CRUD provider, and action calls are not yet wired.

The generated package is an initial version. Generate a new SDK version after the approval actions are safely implemented or any Ontology resource changes. Do not use the package generator's temporary token as application runtime credentials.

## OAuth, persistence, and verification gates

Better Auth remains Ontix's local sign-in and role system; the Foundry grant is linked to the signed-in local account. Do not replace local authentication or Neon persistence until equivalent Foundry identity, role, session, workflow, persistence, and audit behavior is independently verified.

The repository contains server-side OAuth initiation, callback, refresh, and local disconnect routes. Foundry tokens are encrypted at rest in an additive `FoundryConnection` table and are not returned to client code. The live flow is not configured or verified in this checkout: `.env.local` is missing `DATABASE_URL`, `DIRECT_DATABASE_URL`, and `BETTER_AUTH_SECRET`. Do not paste credentials into chat. Configure a separate Neon development branch privately, apply the migration, sign in to Ontix, link the Foundry user, then use **Verify live OSDK access**. The current integrations verifier performs six read requests and surfaces an error if an object type is unavailable or unindexed.

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
