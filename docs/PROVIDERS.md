# Ontix data providers

## Local Demo: Neon PostgreSQL

Set `DATA_PROVIDER=neon-demo` (the default) to use the Local Demo provider. It stores customers, projects, employees, operational cases, approvals, and audit events in Neon PostgreSQL through Prisma. One Next.js App Router application owns page rendering, server-side services, Server Actions, and the Better Auth Route Handler. The UI identifies Neon as the active source.

Neon is a conventional relational database. The **Data model** view presents an Ontology-style relationship explorer over those Neon records. It is a simulation for demonstrating connected data and workflow concepts; it does not implement Foundry Ontology objects/actions, Carbon Workspaces, or a real Palantir connection. Queries resolve on the server, and workflow mutations reuse the existing authenticated, role-checked, transactional services.

## Palantir Foundry: not connected yet

`DATA_PROVIDER=foundry` intentionally fails closed and displays setup instructions. This checkout has no authorized Foundry enrollment, generated OSDK package, or credentials. It does not send requests to Foundry and does not fall back to Neon when Foundry mode is selected.

A genuine provider needs an OSDK generated for the target Foundry Ontology and a dedicated server-side authentication/client path. Keep it separate from Prisma, Neon credentials, Local Demo records, and session secrets. Continue to enforce Ontix authorization server-side, and configure the Foundry service user's minimum required resource permissions. A Foundry request must never silently fall back to Neon.

## Modes

| `DATA_PROVIDER` | Behavior |
| --- | --- |
| `neon-demo` (default; `local` accepted as a compatibility alias) | Neon-backed Local Demo and clearly labeled simulated relationship explorer. |
| `foundry` | Stops before business data access and displays setup guidance until an authorized OSDK provider is implemented and configured. |

Official Palantir references:

- [Ontology SDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [TypeScript OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [Carbon overview](https://www.palantir.com/docs/foundry/carbon/overview)

See [PALANTIR_ACCESS_RESEARCH.md](PALANTIR_ACCESS_RESEARCH.md), [OSDK_INTEGRATION_STATUS.md](OSDK_INTEGRATION_STATUS.md), and [RECRUITER_DEMO.md](RECRUITER_DEMO.md) for findings and setup steps.
