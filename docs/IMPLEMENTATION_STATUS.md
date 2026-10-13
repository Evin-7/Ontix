# Ontix implementation status

Verified on 2026-10-14. This status distinguishes local code changes from evidence in the authenticated Foundry workspace.

## Foundry datasets

All six fictional CSV datasets are present in the `ontix` project and their Foundry previews show rows.

| Dataset | RID | Preview rows | Status |
| --- | --- | ---: | --- |
| `ontix_customers` | `ri.foundry.main.dataset.88ca3593-ba82-4e71-a753-afd889ca15d2` | 4 | Existing dataset reused; rows visible. |
| `Projects` | `ri.foundry.main.dataset.81d104a6-7a36-4fcb-81b0-6b9bcf6b180a` | 5 | Imported; rows visible. |
| `Teams` | `ri.foundry.main.dataset.bb0fcbd9-39ed-4c45-959e-24179dea2531` | 3 | Imported; rows visible. |
| `Employees` | `ri.foundry.main.dataset.b761c34d-6cde-4fc8-8b2f-e738aca5568c` | 8 | Imported; rows visible. |
| `OperationalCases` | `ri.foundry.main.dataset.a9b36d95-e908-4fb8-8b1d-d46d3a293d31` | 8 | Imported; rows visible. |
| `ApprovalRequests` | `ri.foundry.main.dataset.f88ccbb0-2bfa-411b-8dc0-864ebddaf912` | 4 | Imported; rows visible. |

The `ApprovalRequests` preview confirms 4 rows and 5 columns. Its dataset history shows the file import but no transform/build jobs. No data was deleted or overwritten.

## Foundry Ontology

These object types are saved to `ontix Ontology` on the Main branch:

| Object type | Backing dataset | Visible indexed objects |
| --- | --- | ---: |
| `Customer` | `ontix_customers_indexable` (derived from `ontix_customers`) | 4 of 4 source rows |
| `Project` | `Projects` | 5 of 5 source rows |
| `Team` | `Teams` | 3 of 3 source rows |
| `Employee` | `Employees` | 8 of 8 source rows |
| `OperationalCase` | `OperationalCases` | 8 of 8 source rows |
| `ApprovalRequest` | `ontix_approval_requests_indexable` (derived from `ApprovalRequests`) | 4 of 4 source rows |

Customer and ApprovalRequest now report **Indexed**. The derived datasets preserve the uploaded sources and convert the legacy `OffsetDateTime` structs into UTC timestamps. Both pipelines deployed successfully with zero errors on 2026-10-14.

Five foreign-key link types are saved to the Ontology:

| Relationship | Foreign-key mapping | Link RID |
| --- | --- | --- |
| Customer → Projects | `Project.customerId` → `Customer.id` | `ri.ontology.main.relation.58a7c320-e09a-4684-b0d6-2268ef5e05b6` |
| Project → OperationalCases | `OperationalCase.projectId` → `Project.id` | `ri.ontology.main.relation.5d115165-1add-4d19-b83f-5fd606a3da8f` |
| Employee → Team | `Employee.teamId` → `Team.id` | `ri.ontology.main.relation.00750656-5384-4863-a4cf-cbcccbff28ac` |
| Employee → Assigned cases | `OperationalCase.assignedEmployeeId` → `Employee.id` | `ri.ontology.main.relation.d16a8c3a-88b2-49be-8837-a48f4b5a6e0f` |
| OperationalCase → ApprovalRequests | `ApprovalRequest.caseId` → `OperationalCase.id` | `ri.ontology.main.relation.be202073-f5b7-4349-9da9-1345ab1e2b7c` |

The link configurations are saved, but traversal has not yet been verified through the application OSDK client. Ontology Manager now reports four indexed Customer objects and four indexed ApprovalRequest objects; Project, Team, Employee, and OperationalCase are also indexed.

After authorization, the `Edits` setting was checked on OperationalCase, ApprovalRequest, and Project; all three were already enabled. Three requested action types are now saved and selected in the app restrictions: `UpdateCaseStatus`, `AssignCaseToEmployee`, and `UpdateProjectStatus`. All use snapshot isolation. The `AssignCaseToEmployee` rule permits OPEN, IN_PROGRESS, and WAITING_APPROVAL cases but cannot filter active employees because the Foundry Employee source has no active-state property. Action Test Run remains blocked by an empty form pane, so no action has been test-run.

`ApproveRequest` and `RejectRequest` remain uncreated. The source `Requested By` value is a fictional Employee ID, while the Employee CSV contains only fictional `example.com` emails and no Foundry user ID mapping. A safe self-approval criterion needs a trusted mapping from the current Foundry user to the requester; a status-only action would not match Ontix's demo workflow.

## Developer Console, OAuth, and OSDK

- The enabled `Ontix Web Integration` app is a public OAuth client with user permissions and Authorization Code + PKCE. App RID: `ri.third-party-applications.main.application.5b92ff21-1e39-49a1-9483-4013f008ce26`; callback: `http://127.0.0.1:3000/api/foundry/oauth/callback`.
- The app's saved resource restriction includes six Ontix object types, five dependent links, and the three saved actions listed above. OAuth requests Ontology read/write scopes; Foundry still evaluates each user's own permissions.
- The original server-side OAuth link flow remains on Better Auth/Prisma. An additive Foundry-only primary login path now uses Authorization Code + PKCE, a one-use server-stored state, encrypted rotating tokens in shared Upstash Redis, an opaque HttpOnly session cookie, refresh locking/CAS, local logout, and group-based default-deny roles. It calls Palantir's documented preview `listCurrent` group endpoint and does not request `api:admin-read`.
- The Foundry-only path is code-complete enough for configuration-dependent testing, but is **not verified**: no Upstash credentials or role group IDs were configured, no live OAuth login completed, and Developer Console API restrictions may reject the preview group endpoint. Palantir documents no stable user ID through this endpoint; groups cannot identify a person.
- Developer Console generated OSDK npm package `@ontix-web-integration/sdk@0.2.0` with generator 2.80.0; the tarball is `foundry/generated-sdk/ontix-web-integration-sdk-0.2.0.tgz`. It includes six object types, five links, and the three saved action types. The official `@osdk/client`, `@osdk/oauth`, and `@osdk/foundry` packages are installed. Foundry mode now performs snapshot-paged reads, presents exact Ontology counts with bounded record previews, and has server-side workflows for the three saved actions. These code paths are not live-verified because session-store credentials and role-group IDs are missing. Approval actions remain blocked by absent action types and user-to-Employee identity mapping.
- The Foundry home now performs snapshot-paged OSDK reads for all six object types, renders exact Ontology counts and up to 500 records per type, and exposes server-side calls for the three saved actions (`UpdateCaseStatus`, `AssignCaseToEmployee`, `UpdateProjectStatus`). Role and transition checks run on the server; Foundry remains the final permission and action-rule authority. These code paths are not live-verified because session-store credentials and role-group IDs are missing. Approval actions remain blocked by absent action types and user-to-Employee identity mapping.
- The local Foundry stack/client/callback and token encryption configuration are in ignored `.env.local`; their values were not printed or committed. There is no client secret for this public OAuth client. Upstash credentials and Foundry role group mappings are not configured. `DATABASE_URL`, `DIRECT_DATABASE_URL`, and `BETTER_AUTH_SECRET` are also not set.

The next integration steps are to configure a region-bound shared session store and role group IDs privately, verify OAuth plus the preview current-groups API against the restricted Developer Console client, regenerate the SDK after timestamp fixes, establish a trustworthy Foundry user-to-Employee identity mapping, create and safely test approval actions, then move each business module to Foundry. Do not remove Prisma/Neon/Better Auth until these replacements and their tests pass.

## Local application and checks

- `neon-demo` and `foundry` remain explicit provider modes; Foundry mode does not fall back to Neon business data.
- The Integrations page reports **Not connected** until an authenticated Foundry request succeeds.
- Case escalation follows LOW → MEDIUM → HIGH → CRITICAL, updates `escalationLevel`, and stops at CRITICAL.
- On 2026-10-14, the initial dual-provider checks passed (15 test files, 60 tests). After adding Foundry workspace reads and action handlers, typecheck, lint, and tests passed again (17 test files, 67 tests). A new production build and Foundry-mode smoke check are pending. These checks do not verify shared-store connectivity or live Foundry OAuth/OSDK behavior.
- Live Neon connectivity and migrations are **not verified** because a valid `DATABASE_URL` was not configured.
- No Vercel deployment was performed.

## Overall status

**Partially configured, not connected.** CSV data and six indexed Ontology object types are present; five relationship definitions and three actions are saved; OSDK 0.2.0 is generated and the server-side reads/actions are implemented. Approval actions are held for identity safety, and no authenticated application request has succeeded. Do not describe the Foundry integration as connected or production-ready.
