# Ontix recruiter demonstration

## Describe the integration accurately

Ontix is a Next.js App Router operations application with server-side services, role-checked workflows, transactional Neon persistence, and an Ontology-style data model explorer. In the current checkout, Neon is the active database. The relationship explorer is a simulation over Local Demo records; there is no live Palantir Foundry connection or Carbon Workspace.

Suggested wording:

> “I built an operations app that models customers, projects, teams, employees, cases, approvals, and audit events as connected business objects. The current demo provider is Neon/PostgreSQL, with a clearly marked Ontology-style layer. I researched the official Palantir OSDK and built the application boundary so a real Foundry provider can be added once there is an authorized enrollment and generated Ontology SDK.”

## Local Demo walkthrough

1. Configure `.env.local` with a dedicated Neon development branch and select `DATA_PROVIDER=neon-demo`. Follow the database setup in the repository README; do not use production credentials for the demo.
2. Sign in with the bootstrapped Ontix administrator.
3. Start at **Overview** and show dashboard metrics, active operational cases, approvals, and the recent audit trail.
4. Open **Data model**. The page identifies itself as simulated and identifies Neon as the data source. Choose a customer, project, team, employee, case, or approval; the server queries and returns its connected objects. Follow a relationship to continue traversing the model.
5. Use **Cases**, **Projects**, **Customers**, and **Approvals** to show the role-gated workflows. Approval decisions are transactionally recorded with their audit entries. Open **Activity** to inspect the audit history.
6. Explain that Neon supplies persistence, while the application layer presents an Ontology-style projection. Avoid saying this is Foundry, an Ontology SDK response, or a Carbon Workspace.

## What remains for a genuine Foundry demonstration

Create an AIP Developer Tier enrollment if available for your location, create a backend-service application in Developer Console, generate an OSDK from the target Ontology, and supply the application-specific package and credentials in private server configuration. Ontix must then implement and test real queries, link traversal, and actions before any of those can be presented as Foundry behavior. See [OSDK_INTEGRATION_STATUS.md](OSDK_INTEGRATION_STATUS.md) and [PALANTIR_ACCESS_RESEARCH.md](PALANTIR_ACCESS_RESEARCH.md).

A Carbon Workspace is created inside Foundry from Foundry resources. A deployed Ontix URL could be added as an external navigation link by an authorized Carbon administrator, but that does not embed Ontix or create a Carbon/OSDK connection.
