# Ontix recruiter demonstration

![Ontix logo](../public/ontix-logo.svg)

## Current integration state

The Foundry enrollment and `ontix` project were verified in the existing authenticated Brave session. A single empty dataset was created, but fictional rows have not yet been imported. No Foundry Ontology types, links, actions, OSDK application, or authenticated Ontix request have been verified. The dashboard's Integrations view therefore says **Not connected**.

## Describe the integration accurately

Ontix is a Next.js App Router operations application with server-side services, role-checked workflows, transactional Neon persistence, and an Ontology-style data model explorer. In the current checkout, Neon is the active database. The relationship explorer is a simulation over Local Demo records; there is no live Palantir Foundry connection or Carbon Workspace.

Suggested wording:

> “I built an operations app that models customers, projects, teams, employees, cases, approvals, and audit events as connected business objects. The current demo provider is Neon/PostgreSQL, with a clearly marked Ontology-style layer. The Foundry project is accessible and the integration boundary is prepared, but live OSDK reads and actions are still pending the generated Ontology SDK and server-side credentials.”

## Local Demo walkthrough

1. Configure `.env.local` with a dedicated Neon development branch and select `DATA_PROVIDER=neon-demo`. Follow the database setup in the repository README; do not use production credentials for the demo.
2. Sign in with the bootstrapped Ontix administrator.
3. Start at **Overview** and show dashboard metrics, active operational cases, approvals, and the recent audit trail.
4. Open **Data model**. The page identifies itself as simulated and identifies Neon as the data source. Choose a customer, project, team, employee, case, or approval; the server queries and returns its connected objects. Follow a relationship to continue traversing the model.
5. Use **Cases**, **Projects**, **Customers**, and **Approvals** to show the role-gated workflows. Approval decisions are transactionally recorded with their audit entries. Open **Activity** to inspect the audit history.
6. Explain that Neon supplies persistence, while the application layer presents an Ontology-style projection. Avoid saying this is Foundry, an Ontology SDK response, or a Carbon Workspace.

## What remains for a genuine Foundry demonstration

Import the fictional CSVs, repair the unindexed ontology types, configure and test the five requested actions, generate the TypeScript OSDK, and complete a real per-user OAuth/OSDK test. Ontix must not present records or workflow results as Foundry behavior until real reads, links, and actions are verified. See [FOUNDRY_SETUP.md](FOUNDRY_SETUP.md), [ONTOLOGY_SCHEMA.md](ONTOLOGY_SCHEMA.md), [OSDK_INTEGRATION.md](OSDK_INTEGRATION.md), [OSDK_INTEGRATION_STATUS.md](OSDK_INTEGRATION_STATUS.md), and [PALANTIR_ACCESS_RESEARCH.md](PALANTIR_ACCESS_RESEARCH.md).

A Carbon Workspace is created inside Foundry from Foundry resources. A deployed Ontix URL could be added as an external navigation link by an authorized Carbon administrator, but that does not embed Ontix or create a Carbon/OSDK connection.
