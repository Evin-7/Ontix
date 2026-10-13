# TypeScript OSDK integration

## Current state

Ontix now has a public Foundry OAuth client configuration and a server-side Authorization Code + PKCE flow. It binds a Foundry grant to the currently signed-in Ontix account, encrypts access and rotating refresh tokens in a dedicated Neon table, and keeps the OAuth verifier in an integrity-protected HttpOnly cookie. The browser never receives Foundry tokens. A Foundry account link alone is **not** reported as an OSDK connection.

The Developer Console app is a public client with user permissions and callback `http://127.0.0.1:3000/api/foundry/oauth/callback`. Its resource restriction contains six Ontix object types, five links, and three saved action types. Developer Console generated SDK npm package `@ontix-web-integration/sdk@0.2.0` with generator 2.80.0; the package tarball is stored under `foundry/generated-sdk/`. Customer and ApprovalRequest indexing were repaired using timestamp-compatible derived datasets. The server-only OSDK client reads all six types with snapshot paging and invokes the three saved actions through guarded server actions. No authenticated live OSDK request or relationship traversal has succeeded. Approval actions are not yet configured.

The existing provider modes remain separate. Neon Local Demo uses Prisma and remains the source of Ontix accounts, roles, workflows, and demo business records. Foundry mode fails closed; it does not fall back to Neon. Do not remove Neon until Foundry data, authentication, authorization, sessions, and audit requirements have been independently replaced and verified.

## Authentication and server boundary

Keep Better Auth as Ontix's local sign-in and role boundary while Foundry OAuth is introduced as a linked per-user authorization. Foundry's public OAuth client does not by itself replace Ontix authentication or provide a trusted identity mapping. Every Next.js Route Handler and Server Action must continue to enforce `requireActor()` and the relevant Ontix permission. Foundry separately intersects the OAuth grant with the app's resource restrictions and the consenting Foundry user's own permissions.

The flow uses the official Foundry authorization and token endpoints with Authorization Code + PKCE S256. Refresh-token rotation is serialized using a database row lock. Tokens are encrypted using AES-256-GCM and a private 32-byte key. Disconnect deletes the local encrypted tokens; it does not silently claim that Foundry consent was revoked.

Use `getFoundryAccessToken(authUserId)` only in server-only code to provide an OSDK bearer token. `src/server/providers/foundry/client.ts` creates a per-request client from the generated `$ontologyRid` and passes a token-provider callback to `createClient`. Do not put Foundry tokens, the encryption key, or privileged OSDK clients in a Client Component, browser storage, logs, or public environment variables. Use the enrollment-generated package's exact methods and types.

## OSDK installation

Developer Console published `@ontix-web-integration/sdk@0.2.0`. The checked-in tarball corresponds to six object types, five links, and the three saved actions. The console's generated package command specified `@osdk/client@^2.80.0`, `@osdk/oauth@^1.1.1`, and `@osdk/foundry`; compatible current package versions are recorded in `package.json`/`package-lock.json`. Keep any short-lived registry token out of source control and runtime environment. Generate a new OSDK version if the Ontology resources or action types change.

The Foundry page now reads bounded snapshot pages for each generated object type, maps generated records to server-side workspace DTOs, and exposes the three saved workflow actions. The UI reports only data returned by those Foundry reads. Relationship traversal and live OSDK/action verification remain outstanding.

## Environment variables

See `.env.example`. Runtime configuration uses:

- `FOUNDRY_STACK_URL`: HTTPS origin for the Foundry enrollment.
- `FOUNDRY_CLIENT_ID`: public Developer Console client ID; not a secret.
- `FOUNDRY_REDIRECT_URI`: exact callback registered with the client.
- `FOUNDRY_TOKEN_ENCRYPTION_KEY`: private 32-byte Base64 key used for token-at-rest encryption.
- The generated SDK exports `$ontologyRid`; no separate public environment variable is needed.

There is no client secret for this public client. Keep the key in ignored `.env.local` locally and a server-only secret store in any future deployment. Do not deploy during this integration task.

## Verification boundary

The status may say **OSDK verified** only after a successful authenticated OSDK request. A complete verification run must record:

1. Foundry consent and callback completion for the signed-in local user.
2. Successful authenticated reads for all six object types with realistic data.
3. Successful traversal of each configured relationship.
4. A permitted action against fictional data and verified resulting Foundry state.
5. Token refresh, disconnect, expired/revoked session, authorization denial, and unauthorized Ontix user behavior.
6. Neon Local Demo still working, with no Foundry-to-Neon fallback.

No live Foundry request has succeeded yet. The local OAuth flow cannot be exercised until private Neon branch URLs and `BETTER_AUTH_SECRET` are configured and the additive migration is applied. Unit tests for OAuth state/token encryption do not establish a live connection.

## Official references

- [Create a Developer Console application](https://www.palantir.com/docs/foundry/developer-console/create-application)
- [Application resource restrictions and requested OAuth scopes](https://www.palantir.com/docs/foundry/developer-console/application-restrictions)
- [Public client permissions](https://www.palantir.com/docs/foundry/developer-console/permissions)
- [Writing OAuth2 clients for Foundry](https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients)
- [Bootstrap a TypeScript application](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-typescript)
- [Bootstrap a server-side TypeScript application](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-server-side-typescript)
- [TypeScript OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [TypeScript OSDK migration guide](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration)
