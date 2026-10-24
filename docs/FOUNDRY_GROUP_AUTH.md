# Foundry group-based Ontix access

Code and local configuration reviewed 2026-10-24; Foundry UI/security observations were last checked 2026-10-14. This is the Foundry-only authentication path under `DATA_PROVIDER=foundry`. It is additive; the Neon/Prisma/Better Auth Neon workspace remains intact until the full Ontology replacement is verified.

## Login and authorization flow

1. `/api/foundry/sign-in` creates a random PKCE verifier and OAuth state. The verifier is AES-GCM encrypted and stored for ten minutes in the shared Upstash Redis REST store. The browser receives only a short-lived HttpOnly state cookie.
2. The callback at the already registered `/api/foundry/oauth/callback` checks the state cookie against the callback parameter, atomically consumes the one-use state record, and exchanges the code server-side.
3. The server calls `GET /api/v2/admin/groups/listCurrent?preview=true` with the user's Foundry access token, then maps returned group IDs against the configured Ontix role groups. Unmapped and ambiguously mapped memberships are denied. No `api:admin-read` scope is requested, and Ontix does not create or modify Foundry groups.
4. A 256-bit random opaque session ID is set in an HttpOnly, SameSite=Lax cookie (`__Host-` and Secure in production). Redis stores only its SHA-256 key, not the raw cookie. OAuth tokens are AES-256-GCM encrypted with session-specific associated data.
5. On each Foundry home request, Ontix refreshes the user's current group membership before granting the mapped role. The preview endpoint failure is fail-closed. OSDK reads still run with that user's token, so Foundry record permissions remain authoritative.
6. Refresh-token rotation uses a 30-second Redis `SET NX PX` lock (the Foundry request aborts at 10 seconds) and a Lua compare-and-set on a session generation. Logout atomically deletes the session and lock; a refresh already in flight cannot recreate it. An Ontology request that already received its access token can still finish while logout is happening. The Ontix cookie/store is revoked locally. This code does not claim to revoke Foundry's OAuth grant; the user can remove the app's consent in Foundry.

## Configuration

Set these privately in `.env.local` (or the production secret store):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `FOUNDRY_TOKEN_ENCRYPTION_KEY` (32 random bytes, base64 encoded)
- `ONTIX_APPLICATION_URL` (canonical app origin; in production it must be HTTPS)
- `FOUNDRY_REDIRECT_URI` (must use the same origin and exact registered callback path)
- At least one `FOUNDRY_ADMIN_GROUP_IDS`, `FOUNDRY_MANAGER_GROUP_IDS`, `FOUNDRY_DEVELOPER_GROUP_IDS`, or `FOUNDRY_ANALYST_GROUP_IDS` value; each accepts comma-separated Foundry group IDs.

Use a non-global/region-bound Redis database close to the Next.js runtime. The Upstash client enables read-your-writes, and state transitions use Redis atomic commands/Lua. Upstash documents eventual consistency for global databases, so global replication is not suitable for these revocation and rotating-token records. If the chosen deployment cannot provide the required read-after-write behavior through failover, use a strongly consistent session service such as a Durable Object after evaluating its hosting and cost; do not enable Ontix actions until that guarantee is tested.

Private local environment entries for the shared session store exist, but no authenticated request has verified their connectivity or consistency. Do not treat the presence of configuration as proof that the store works. A shared session store is infrastructure only; it must not contain Ontix business records.

## Limits and verification status

- Palantir documents `listCurrent` as a **preview** endpoint that returns current direct and transitive group membership without requiring a particular OAuth scope. Preview APIs may change or be removed. The official docs do not describe a stable OAuth ID token or userinfo API, and this endpoint returns group objects rather than a stable individual user ID.
- Developer Console currently shows the app restricted to six object types, five links, and the three saved actions. Its enabled operations are Ontologies read/write and media sets read/write; it does not have `api:admin-read`. The group endpoint's compatibility with these application restrictions has not been confirmed by a live request. Do not add `api:admin-read` unless the user approves the additional scope.
- Group IDs are role categories, not person identity. This path can safely gate broad role classes; it cannot map a user to an `Employee`, enforce self-approval rules, or provide a person-level Ontix audit actor. Foundry action logs remain the authoritative user attribution for eventual Ontology actions.
- The callback and Foundry workspace path are implemented. After a group-gated session exists, the page reads all six generated object types with snapshot paging, shows Ontology counts and bounded record previews, traverses selected-record links through generated `$link` accessors, and offers the three saved workflow actions with server-side role and status checks. These paths are **not live-verified**. The Palantir Developer Console restriction may reject the preview Admin API; this must be observed in an authenticated login attempt.
- The current Ontology still lacks approval decision action types and a trusted Employee-to-Foundry identity mapping. The Foundry workspace therefore does not provide approval decisions or person-level Ontix audit attribution. Neon workspace workflows remain separate and are not used as a Foundry fallback.

## Official references

- [Palantir List Current Groups API](https://www.palantir.com/docs/foundry/api/admin-v2-resources/groups/list-current-groups)
- [Palantir OAuth client guide](https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients)
- [Upstash TypeScript SDK](https://upstash.com/docs/redis/sdks/ts/overview)
- [Upstash Redis consistency](https://upstash.com/docs/redis/features/consistency)
