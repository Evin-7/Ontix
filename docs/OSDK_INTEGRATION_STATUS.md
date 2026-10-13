# OSDK integration status

Updated 2026-10-14. Local source changes and Foundry UI state are reported separately.

## Foundry UI state

The enabled **Ontix Web Integration** public client uses user permissions and Authorization Code + PKCE. Its registered callback is `http://127.0.0.1:3000/api/foundry/oauth/callback`. The app is restricted to six Ontix object types, five dependent links, and three saved action types. The OAuth flow currently requests Ontology read/write scopes; `offline_access` is not requested. Scopes do not override app restrictions or the Foundry user's permissions.

`OperationalCase`, `ApprovalRequest`, and `Project` already had edits enabled when checked. `UpdateCaseStatus`, `AssignCaseToEmployee`, and `UpdateProjectStatus` are saved and restricted to the app. `ApproveRequest` and `RejectRequest` are held because current fictional Employee IDs cannot be mapped safely to Foundry user IDs. On 2026-10-14, the Customer and ApprovalRequest legacy timestamp mismatches were fixed with derived datasets; both object types now show **Indexed** with four objects. The action editor's Test Run form is empty, so no action test has been submitted.

## Repository implementation

Developer Console generated `@ontix-web-integration/sdk@0.2.0` using generator 2.80.0. The tarball is checked into `foundry/generated-sdk/`; official `@osdk/client`, `@osdk/oauth`, and `@osdk/foundry` dependencies are installed. Foundry mode now performs snapshot-paged reads of all six generated object types and calls the three saved Ontology actions from server-side handlers. These calls are not live-verified. Full dashboard CRUD and approval decisions remain incomplete.

The repository also contains Next.js Route Handlers for OAuth initiation, callback, refresh-token support, and local disconnect. The current flow binds state and PKCE to the signed-in local user, uses PKCE S256, keeps the verifier in an integrity-protected HttpOnly cookie, encrypts Foundry tokens with AES-256-GCM, and persists them in an additive `FoundryConnection` table. This is still coupled to the local Better Auth identity and Prisma session/token storage; it is not yet a Foundry-only login. `DATABASE_URL`, `DIRECT_DATABASE_URL`, and `BETTER_AUTH_SECRET` are absent from the local environment, so OAuth persistence has not been exercised.

Better Auth remains the local user, session, and role provider. Foundry OAuth is a linked user grant, not a replacement identity provider. The Integrations page can report OSDK verified only after all six object reads succeed for the signed-in Foundry user. No such live check has succeeded yet. `DATA_PROVIDER=foundry` remains fail-closed for business data and must not use Neon records as fallback.

## Remaining verification

- Verify the now-indexed Customer and ApprovalRequest records through an authenticated OSDK request.
- Repair the Test Run pane so action rules can be verified without committing edits.
- Establish a reliable Foundry user-to-Employee identity mapping, then implement and test `ApproveRequest` and `RejectRequest` with atomic approval/case edits.
- Regenerate OSDK after those actions are saved, then implement and verify supported relationship reads and the approved action calls.
- Replace local Better Auth identity and Prisma-backed token persistence only after a secure Foundry session strategy is selected and verified.
- Complete live Foundry consent, six OSDK reads, link traversals, one permitted action, token refresh, logout/disconnect, expiry/revocation, and unauthorized access tests.
- Keep the current dual-provider implementation intact until Foundry covers authentication, business persistence, authorization, sessions, workflows, and audit history.

## References

- [OAuth2 clients for Foundry](https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients)
- [Application restrictions](https://www.palantir.com/docs/foundry/developer-console/application-restrictions)
- [TypeScript OSDK v2](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [Ontology action types](https://www.palantir.com/docs/foundry/action-types/getting-started)
- [Action Test Run](https://www.palantir.com/docs/foundry/action-types/test-run)
