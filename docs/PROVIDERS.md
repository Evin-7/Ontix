# Ontix data providers

## Neon workspace: Neon PostgreSQL

Set `DATA_PROVIDER=neon-demo` (the default) to use the Neon workspace provider. It stores customers, projects, employees, operational cases, approvals, and audit events in Neon PostgreSQL through Prisma. One Next.js App Router application owns page rendering, server-side services, Server Actions, and the Better Auth Route Handler. The UI identifies Neon as the active source.

Neon is a relational database. The **Data model** view resolves and displays relationships among Neon records. It does not issue Foundry Ontology queries or actions. Queries resolve on the server, and workflow mutations reuse the authenticated, role-checked, transactional services.

## Palantir Foundry: OSDK-backed application paths, live verification pending

Six fictional datasets, six indexed Ontology object types, five saved link definitions, and the public OAuth application exist in the `ontix` Foundry project. Customer and ApprovalRequest use derived, timestamp-compatible datasets; uploaded sources are preserved. The app restriction includes three saved actions: `UpdateCaseStatus`, `AssignCaseToEmployee`, and `UpdateProjectStatus`. The Developer Console generated OSDK package 0.2.0 (generator 2.80.0) is checked into `foundry/generated-sdk/`. Foundry mode performs bounded server-side reads, traverses generated `$link` accessors for a selected record, and exposes the three saved actions through server-side role and transition checks. Approval actions remain uncreated until requester identity can be enforced. None of these live application calls have completed end-to-end verification. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for the precise status.

`DATA_PROVIDER=foundry` routes users through Foundry sign-in and reads business data only through the OSDK after a Foundry session is established. Missing or invalid sessions and provider errors stop the request; the application does not fall back to Neon. The dashboard's **Integrations** view can perform a read-only authenticated OSDK verification and reports Not connected until that live check succeeds. The Neon relationship explorer remains a separate relational view over Neon records.

A Foundry session uses the public OAuth Authorization Code + PKCE flow, encrypted server-side session tokens, and configured group-to-role mapping. Keep that provider separate from Neon business data. Continue to enforce Ontix authorization server-side; Foundry also applies each user's own permissions and application restrictions. A Foundry request must never silently fall back to Neon.

## Modes

| `DATA_PROVIDER` | Behavior |
| --- | --- |
| `neon-demo` (default; `local` accepted as a compatibility alias) | Neon-backed workspace with a server-resolved relationship explorer. |
| `foundry` | Foundry sign-in, OSDK-backed workspace reads, selected-record link traversal, and guarded action calls. It requires user authorization and remains subject to Foundry permissions; it never falls back to Neon. |

Official Palantir references:

- [Ontology SDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [TypeScript OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [Carbon overview](https://www.palantir.com/docs/foundry/carbon/overview)

See [FOUNDRY_SETUP.md](FOUNDRY_SETUP.md), [ONTOLOGY_SCHEMA.md](ONTOLOGY_SCHEMA.md), [OSDK_INTEGRATION.md](OSDK_INTEGRATION.md), [PALANTIR_ACCESS_RESEARCH.md](PALANTIR_ACCESS_RESEARCH.md), [OSDK_INTEGRATION_STATUS.md](OSDK_INTEGRATION_STATUS.md), and [PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md) for verified state and setup steps.
