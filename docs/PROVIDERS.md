# Ontix data providers

## Local Demo: Neon PostgreSQL

Set `DATA_PROVIDER=neon-demo` (the default) to use the Local Demo provider. It stores customers, projects, employees, operational cases, approvals, and audit events in Neon PostgreSQL through Prisma. One Next.js App Router application owns page rendering, server-side services, Server Actions, and the Better Auth Route Handler. The UI identifies Neon as the active source.

Neon is a conventional relational database. The **Data model** view presents an Ontology-style relationship explorer over those Neon records. It is a simulation for demonstrating connected data and workflow concepts; it does not implement Foundry Ontology objects/actions, Carbon Workspaces, or a real Palantir connection. Queries resolve on the server, and workflow mutations reuse the existing authenticated, role-checked, transactional services.

## Palantir Foundry: public OAuth app and initial OSDK configured, live provider pending

Six fictional datasets, six indexed Ontology object types, five saved link definitions, and the public OAuth application exist in the `ontix` Foundry project. Customer and ApprovalRequest use derived, timestamp-compatible datasets; uploaded sources are preserved. The app restriction includes three saved actions: `UpdateCaseStatus`, `AssignCaseToEmployee`, and `UpdateProjectStatus`. The Developer Console generated OSDK package 0.2.0 (generator 2.80.0) is checked into `foundry/generated-sdk/`; Foundry mode reads paginated records from each object type and exposes the three saved actions through server-side checks. The approval actions remain uncreated until requester identity can be enforced, and no authenticated OSDK request has succeeded. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for the precise status.

`DATA_PROVIDER=foundry` intentionally fails closed for business data and displays setup instructions. It does not fall back to Neon. The dashboard's **Integrations** view can perform a read-only, authenticated OSDK verification after the user's Foundry grant is stored. It reports Not connected until that live check succeeds. The Neon relationship explorer remains a separate simulation over Neon records.

A genuine provider needs the OSDK generated for the target Foundry Ontology. The app now uses a dedicated public OAuth Authorization Code + PKCE flow, linking a Foundry user grant to the signed-in Ontix account. Keep that provider separate from Neon business data. Continue to enforce Ontix authorization server-side; Foundry also applies each user's own permissions. A Foundry request must never silently fall back to Neon.

## Modes

| `DATA_PROVIDER` | Behavior |
| --- | --- |
| `neon-demo` (default; `local` accepted as a compatibility alias) | Neon-backed Local Demo and clearly labeled simulated relationship explorer. |
| `foundry` | Stops before business data access and displays setup guidance until the full OSDK-backed workspace provider, authorization behavior, and required reads are implemented and verified. |

Official Palantir references:

- [Ontology SDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [TypeScript OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [Carbon overview](https://www.palantir.com/docs/foundry/carbon/overview)

See [FOUNDRY_SETUP.md](FOUNDRY_SETUP.md), [ONTOLOGY_SCHEMA.md](ONTOLOGY_SCHEMA.md), [OSDK_INTEGRATION.md](OSDK_INTEGRATION.md), [PALANTIR_ACCESS_RESEARCH.md](PALANTIR_ACCESS_RESEARCH.md), [OSDK_INTEGRATION_STATUS.md](OSDK_INTEGRATION_STATUS.md), and [RECRUITER_DEMO.md](RECRUITER_DEMO.md) for verified state and setup steps.
