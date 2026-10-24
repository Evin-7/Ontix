# Ontix project walkthrough

Ontix is a full-stack operations workspace built with TypeScript, React, and Next.js. It manages customer accounts, projects, teams, employees, operational cases, approvals, and activity records.

## Walkthrough

1. **Operations overview:** Show the dashboard, search, case queue, project health, approvals, and activity feed.
2. **Workflow controls:** Open a case or project and show the server-side validation, role checks, revision handling, and transactional audit updates.
3. **Data relationships:** In the Data model view, select an entity and inspect its connected records. This view resolves PostgreSQL relationships on the server.
4. **Foundry integration:** Explain that Foundry mode is a separate provider. Its generated TypeScript OSDK supports bounded reads, generated `$link` traversal, and guarded saved actions.
5. **Security boundary:** Show that Foundry tokens stay server-side, OAuth uses PKCE, roles default to deny, and record access remains subject to Foundry permissions.

## Project description

> “Ontix is my TypeScript full-stack operations application. I built the Next.js workspace, PostgreSQL data model and workflows, server-side access controls, and a separate Palantir Foundry integration using generated OSDK types. Foundry reads, relationships, and saved-action handlers are implemented in code; I’m still validating the authenticated live path end to end.”

Adjust the description to match your actual contribution. Do not claim that the Foundry path is connected, deployed, or used with real customer data until those outcomes have been verified.

## Data and integration status

The repository includes fictional records for development and walkthroughs. The Neon-backed workspace and the Foundry provider are separate: the relationship explorer over Neon does not issue Ontology queries, and Foundry mode never falls back to Neon. The current Foundry OAuth, OSDK read, relationship, and action paths have not completed a successful authenticated end-to-end run. See [implementation status](IMPLEMENTATION_STATUS.md) for the evidence and remaining checks.

The repository includes a Dockerfile and CI workflow. It has no Azure deployment or release pipeline, and no Azure AI Foundry resource is currently configured in the application.
