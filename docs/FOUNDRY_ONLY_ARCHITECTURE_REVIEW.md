# Foundry-only architecture review

Reviewed 2026-10-14. This records the migration boundary and security blockers before removing the current database-backed implementation.

## Recommendation

Use Foundry Ontology as the only business-data system of record. Keep the Next.js App Router server-side for OAuth callbacks, OSDK queries, authorization checks, validation, and actions. Do not send Foundry access or refresh tokens to browser JavaScript.

Use a small shared session store only for opaque Ontix session state and encrypted, rotating Foundry refresh tokens. A distributed store is needed for concurrency-safe refresh and per-session revocation across serverless instances. This is authentication infrastructure, not a second business database. Do not put OAuth tokens into Ontology objects.

If “Foundry-only” means no state store of any kind outside Foundry, then the requested guarantees cannot all be met with the current public OAuth client: a stateless encrypted cookie cannot reliably coordinate refresh-token rotation across requests/instances or revoke one session immediately. An access-token-only cookie avoids refresh rotation but forces sign-in after expiration and still cannot revoke a stolen cookie before its short expiry. A browser OSDK OAuth flow is documented for public clients, but sends user bearer tokens to the browser and conflicts with the server-only token boundary.

Palantir documents that `offline_access` is needed for refresh tokens, that refresh tokens rotate at each refresh, and that stale reuse can invalidate the token grant. The user approved requesting `offline_access`; the application now requests it without adding another Foundry permission. Palantir documents user deactivation invalidating issued OAuth tokens and users being able to remove application access; this review found no documented third-party OAuth token-revocation endpoint that this app can call. Therefore application logout can revoke the local Ontix session and erase its stored tokens, but remote consent revocation must be done in Foundry unless Palantir confirms a supported endpoint.

## Current dependency and configuration audit

| Area | Current dependency or code | Why it must remain until replacement passes |
| --- | --- | --- |
| Neon transport | `@neondatabase/serverless`, `@prisma/adapter-neon` | Runtime PostgreSQL access for the current local-demo provider and Better Auth adapter. |
| Prisma | `@prisma/client`, dev dependency `prisma`, `prisma.config.ts`, `prisma/schema.prisma`, migrations, generated client | Current customers, projects, employees, teams, cases, approvals, audit/activity events, auth sessions, rate limits, and Foundry token rows. Build and postinstall currently generate Prisma. |
| Better Auth | `better-auth`, `@better-auth/prisma-adapter` | Current password login, local users, sessions, roles, employee mapping, origin checks, and database-backed login rate limits. Foundry OAuth currently links to this local identity; it is not primary login. |
| Database scripts | `db:*` scripts, `scripts/assert-development-database.mjs`, `scripts/verify-database.ts`, `scripts/bootstrap-admin.ts`, `prisma/seed.ts` | Seed, migrate, connectivity, and local admin setup assume Neon/PostgreSQL. |
| Server auth and token integration | `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth/dal.ts`, `src/app/api/auth/[...all]/route.ts`, `src/server/providers/foundry/tokens.ts`, `src/server/db/prisma.ts` | Better Auth and Foundry token refresh both depend on Prisma. Refresh rotation currently uses a PostgreSQL row lock. |
| Business services | `src/lib/services/{workspace,customers,projects,employees,teams,cases,approvals,audit,ontology-demo}.ts`, `src/server/db/{case-workflow,approval-workflow}.ts`, `src/app/actions.ts`, `src/app/neon-home.tsx` | All current dashboard metrics and CRUD/workflow reads and writes still use Prisma. |
| User interface and provider mode | `src/app/page.tsx`, `src/client/ui/OntixApp.tsx`, `src/client/ui/OntologyModelExplorer.tsx`, `src/client/ui/FoundryIntegrationsPage.tsx`, `src/server/providers/provider-mode.ts`, `src/types/integrations.ts` | UI and labels still expose Neon Local Demo; Foundry mode is fail-closed and does not yet power the workspace. |
| Environment and docs | `.env.example`, `prisma.config.ts`, `docs/DATABASE.md`, `docs/DEPLOYMENT.md`, `docs/PROVIDERS.md`, README and integration docs | Environment templates and operational guidance still describe a dual-provider PostgreSQL setup. |

The local `.env.local` has Foundry stack/client/callback/encryption configuration. It does not have `DATABASE_URL`, `DIRECT_DATABASE_URL`, or `BETTER_AUTH_SECRET`. Environment values are deliberately not recorded here.

## Foundry capabilities verified

- Six Ontology object types and five links exist in the `ontix` project. Customer, Project, Team, Employee, OperationalCase, and ApprovalRequest all show indexed records.
- Customer and ApprovalRequest each have four indexed objects after timestamp-conversion pipelines were deployed on 2026-10-14. The original source datasets were preserved.
- The checked-in OSDK is generated from the current Ontology, but its object shapes omit fields needed by the existing richer local UI. Three actions are saved; the two approval actions remain uncreated. No authenticated OSDK query or action has yet succeeded through Ontix.
- Approval requester values are Employee IDs, not stable Foundry user IDs. A self-approval policy cannot safely compare those values to the signed-in Foundry identity until the model is extended with a trusted identity mapping.
- The user rejected `api:admin-read`; Palantir documents no stable OAuth `id_token` or userinfo endpoint in the public-client flow. The user approved Foundry groups for role assignment. Palantir's scope-free `listCurrent` endpoint is preview-only and returns membership groups, not person identity. It may still be rejected by the Developer Console app restriction and requires a real login attempt to verify.
- Foundry per-user permissions and action submission criteria should be the security boundary for business records and actions. UI role flags are not authorization. Successful action submissions can be recorded by Foundry Action Log; object edit history can provide edit traceability where enabled. Failed app access attempts still need a deliberate audit/monitoring policy.

## Safe migration sequence

1. Use the approved shared session-store boundary for encrypted Foundry auth state only; request the already approved `offline_access` scope. Configure the service privately and choose a non-global region close to the server runtime.
2. Implement primary Foundry OAuth login with state + PKCE, exact callback validation, server-side code exchange, encrypted rotating refresh-token storage, secure HttpOnly opaque session cookie, distributed refresh lock/CAS, expiration, local logout/revocation, and reauthentication handling. Do not store OAuth tokens in Ontology.
3. Use approved Foundry group mappings as default-deny role signals. Do not treat group membership as a stable person identifier. Design a trusted Employee-to-Foundry-user identity mapping before enabling self-approval or person-level Ontix audit records.
4. Implement OSDK-backed reads and actions for each UI module, including links, transaction semantics, validation, pagination, empty/error states, and audit behavior. Do not fall back to Neon.
5. Verify real OAuth login, all six object queries, link traversal, permitted and denied actions, refresh rotation/concurrency, expiration, logout, authorization failures, and production runtime session persistence.
6. Only then remove Better Auth, Prisma, Neon dependencies, database code/schema/scripts, and database environment variables. Preserve any external Neon data until the user explicitly authorizes disposal; removing application code must not silently drop tables or accounts.

## Official references

- [Palantir OAuth2 client guide](https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients) — PKCE, `offline_access`, and refresh rotation.
- [Palantir authentication overview](https://www.palantir.com/docs/foundry/api/v2/general/overview/authentication) — user-scoped production OAuth and token handling.
- [Developer Console application restrictions](https://www.palantir.com/docs/foundry/developer-console/application-restrictions) — app restriction and user-permission intersection.
- [Palantir List Current Groups](https://www.palantir.com/docs/foundry/api/admin-v2-resources/groups/list-current-groups) — preview, current-membership endpoint without a required OAuth scope.
- [Foundry third-party application guidance](https://www.palantir.com/docs/foundry/platform-security-third-party/3pa-api-guidance) — Authorization Code grants act on behalf of the individual user.
