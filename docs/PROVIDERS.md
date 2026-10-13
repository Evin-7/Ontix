# Ontix data providers

## Local Demo: Neon PostgreSQL

The Local Demo provider stores customers, projects, employees, operational cases, approvals, and audit events in Neon PostgreSQL through Prisma. One Next.js App Router application owns page rendering, server-side services, Server Actions, and the Better Auth Route Handler. Its UI labels the active source as **Local Demo · Neon PostgreSQL**.

The Neon provider is a conventional relational database. It does not implement Foundry Ontology objects/actions, Carbon Workspaces, or a real Palantir connection.

## Palantir Foundry: separate integration boundary

A genuine Foundry OSDK integration requires an authorized Foundry environment, a generated OSDK client for that environment's Ontology, and its own authentication, object types, actions, and permissions. Those credentials and generated client are not present here, so this checkout does not claim or simulate a Foundry connection.

If configured later, the Foundry provider must own a separate server-side client and operation path. It must not share the Neon Prisma client, Neon credentials, Local Demo records, or session secrets. A Foundry request must never silently fall back to Neon, and a Local Demo request must never be described as a Foundry or Ontology operation. The UI should show the active provider explicitly.

Official Palantir references:

- [Ontology SDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [TypeScript OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [Carbon overview](https://www.palantir.com/docs/foundry/carbon/overview)
