# Ontix project capabilities

This document records what exists in the repository. It describes code evidence, not employment history or production usage.

| Area | Implemented capability | Evidence boundary |
| --- | --- | --- |
| TypeScript application | Next.js App Router UI, server-rendered pages, Route Handlers, and Server Actions | Local build evidence is recorded in `IMPLEMENTATION_STATUS.md`. |
| Operations workflows | Customer and project management, case assignment/escalation, approvals, and audit events | Neon-backed flows use validation, authorization, revision checks, and database transactions. |
| Relational data model | Prisma ORM over Neon PostgreSQL with employee, team, customer, project, case, approval, and activity records | Development fixtures are fictional and should not be described as customer data. |
| Palantir Foundry | Generated TypeScript OSDK, bounded paged reads, generated `$link` traversal, and three server-side saved-action handlers | Authenticated Foundry OAuth and OSDK requests have not yet passed an end-to-end run. |
| Authentication and access | Better Auth for the Neon provider; PKCE and group-derived default-deny roles in Foundry mode | Foundry groups are not a person-level Employee identity mapping. Approval actions requiring that mapping are not implemented. |
| Delivery foundation | Standalone Next.js output, multi-stage Dockerfile, and GitHub Actions CI workflow | The image has not been built locally yet; no cloud deployment or release pipeline exists. |
| Microsoft Azure | The Azure portal account currently has no subscription or resources available | No Azure AI resource, model deployment, app endpoint, or Azure deployment is configured; Azure provisioning requires an active subscription. |

## Technical areas to discuss

- Keep provider boundaries explicit so Foundry data never silently falls back to PostgreSQL.
- Keep provider credentials and Foundry access tokens on the server.
- Apply authorization at the service or action boundary rather than relying on hidden UI controls.
- Bound OSDK reads and relationship traversal to keep response sizes predictable.
- Use revision checks and transactions to protect concurrent workflows and audit history.

Before describing an integration or deployment as operational, run it with an authorized account and capture the resulting evidence. The remaining Foundry checks are listed in [implementation status](IMPLEMENTATION_STATUS.md).
