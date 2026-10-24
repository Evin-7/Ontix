# OSDK integration status

Foundry UI observations were last checked on 2026-10-14. Repository implementation was reviewed on 2026-10-24. Neither the earlier UI inspection nor local configuration constitutes a successful authenticated app request.

## Foundry UI state observed on 2026-10-14

- The `Ontix Web Integration` public client uses user permissions and Authorization Code + PKCE. Its registered callback is `http://127.0.0.1:3000/api/foundry/oauth/callback`.
- The app restriction contains six object types, five link definitions, and three saved actions. The OAuth request asks for Ontology read/write scopes and `offline_access`; the user's Foundry permissions and app restrictions still apply.
- Customer and ApprovalRequest use timestamp-compatible derived datasets; the original uploaded sources remain preserved. All six Ontology object types showed indexed fictional records.
- `UpdateCaseStatus`, `AssignCaseToEmployee`, and `UpdateProjectStatus` were saved and selected in the app restriction. The action editor's Test Run pane was empty at the time of inspection, so no action Test Run was completed.
- Approval actions were held because the requester field did not provide a trustworthy mapping to the signed-in Foundry person.

These are dated Foundry UI observations; recheck the workspace before relying on them in a live walkthrough.

## Repository implementation reviewed on 2026-10-24

- The generated `@ontix-web-integration/sdk@0.2.0` package is checked into `foundry/generated-sdk/`.
- Foundry mode implements a per-user Authorization Code + PKCE login path with opaque HttpOnly sessions, encrypted tokens in a shared Upstash store, and default-deny group-to-role mapping.
- The server reads all six generated object types with bounded snapshot pagination. A selected-record panel traverses generated `$link` accessors through a validated, no-store route, returning at most eight visible records per many-valued relationship.
- Server-side workflows call the three generated saved actions after validating the user's role and the permitted status transition. Foundry remains the permission and action-rule authority.
- Neon workspace remains a separate Neon/Prisma provider with its own Better Auth path. Foundry mode does not fall back to Neon.

The Foundry sign-in, object reads, relationship traversals, and action calls remain **unverified end to end**. The group-list endpoint used to assign app roles is preview-only and must be validated against the Developer Console restriction during a real login. The local environment contains private server configuration, but its presence is not evidence of a successful Redis or Foundry request; values are intentionally not recorded here.

## Remaining verification

1. Complete a real Foundry login and confirm group mapping, session storage, and callback behavior.
2. Exercise all six OSDK reads and each configured `$link` using the restricted app and representative fictional records.
3. Verify one allowed saved action and denied/invalid transitions in Foundry; do not use a regular submission as a substitute for the still-empty Test Run pane without an explicit reviewed plan.
4. Verify refresh rotation/concurrency, logout, token expiry or revocation, session-store failure, and unauthorized user behavior.
5. Keep the Neon workspace separate, and capture production cloud/container/CI delivery evidence before claiming those capabilities.
6. Add approval decision actions only after a trusted Foundry-user-to-Employee identity mapping and atomic two-object action rules exist.

See [project capabilities](PROJECT_CAPABILITIES.md), [project walkthrough](PROJECT_WALKTHROUGH.md), and [OSDK integration](OSDK_INTEGRATION.md) for the current project evidence and interview walkthrough.
