# Ontix database and provider architecture

## Provider boundary

Neon PostgreSQL is the persistent database for the Local Demo provider. One Next.js App Router application uses Prisma ORM 7 for server-side reads and writes. Neon does not represent Palantir Foundry or a genuine Foundry Ontology. The Foundry OSDK provider has a separate client, authentication, operations, and permission boundary; this checkout does not contain an authorized OSDK client. See [PROVIDERS.md](PROVIDERS.md).

## Runtime and connections

- Prisma CLI, client, and Neon adapter are pinned together at stable `7.10.0`; the Prisma 8 release candidate is not mixed with stable packages.
- Prisma 7 datasource configuration lives in `prisma.config.ts`; the schema declares PostgreSQL and the CLI uses `DIRECT_DATABASE_URL`.
- The Next.js Node runtime uses `@prisma/adapter-neon` with the pooled `DATABASE_URL`. The adapter uses a maximum of five connections per process and bounded connection and idle timeouts. A global singleton avoids creating a new pool during development hot reload.
- The Neon serverless driver uses the `ws` WebSocket constructor because this Node runtime does not expose the required global constructor.
- `.env.local` is loaded before `.env` by the Prisma config and database scripts.

## Environment values

Copy `.env.example` to ignored `.env.local`. Obtain both database URLs from the same dedicated Neon development branch. Never construct the direct URL by editing the pooled URL yourself.

| Variable | Use | Required form |
| --- | --- | --- |
| `DATABASE_URL` | Next.js runtime queries | Neon pooled endpoint; host includes `-pooler`; TLS required |
| `DIRECT_DATABASE_URL` | Prisma migrations and status | Matching direct endpoint; host does not include `-pooler` |
| `DATABASE_ENVIRONMENT` | Local mutation guard | `development` |
| `DATABASE_BRANCH_NAME` | Human safety guard | Dedicated branch name, not `main`, `prod`, or `production` |
| `DATA_PROVIDER` | Provider identity | `local` |
| `BETTER_AUTH_URL` | Auth origin | Local URL for development; exact canonical origin in deployment |
| `BETTER_AUTH_SECRET` | Session signing and encryption | At least 32 random characters; keep server-side |
| `BOOTSTRAP_ADMIN_*` | One-time admin provisioning | Private `.env.local` values; remove the password after provisioning |

The development-target guard validates Neon hosts, pooled/direct pairing, TLS, branch labels, and matching database/user/password without printing connection details. It cannot independently prove which Neon branch an endpoint belongs to. Before running a migration or seed, verify in the Neon Console that both URLs belong to the dedicated development branch. Keep `.env.local` out of source control, logs, screenshots, browser bundles, and issue reports.

## Schema and migrations

Existing business tables stay intact: teams, employees, legacy sessions, customers, projects, project assignments, operational cases, approvals, and activity events. The Prisma model for the physical `employees` table is named `Employee`; only the Prisma model name changed. Business foreign keys and audit actors continue to reference `employees.id`.

The additive auth migration creates independent `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications`, and `auth_rate_limits` tables. Each auth user may link to one employee. Better Auth credentials and session tokens never appear in page props. The linked employee's active state and role determine access on every server operation.

Existing workflow migrations add project revision and case escalation columns. `npm run db:migrate` uses `prisma migrate deploy` after the development-target guard. There is no reset command and the app does not call `migrate reset` or `db push`. Inspect the branch and migration status before applying any migration to a database with unknown tables or history.

## Seed and operator provisioning

`prisma/seed.ts` inserts fixed fictional `example.test` rows in parent-first order inside one transaction. Stable fixture IDs and `skipDuplicates` make reruns safe without overwriting existing rows. Seed employee password values are non-hash disabled sentinels, and seed employees do not create auth accounts.

The guarded `npm run db:bootstrap-admin` command creates or links a real active employee and provisions one Better Auth credential account using Better Auth's password hasher. It refuses demo fixture identities, existing auth accounts, and inactive employee records. It runs only against a development Neon branch and never prints the password or stored hash. Remove the temporary bootstrap password from `.env.local` after use.

## Authorization and transactions

All data services are server-only. Server Actions validate inputs and services enforce role permissions independently; a caller cannot gain access by crafting a browser request. Better Auth public sign-up is disabled. Accounts must be explicitly provisioned and linked to an active employee. Database-backed Better Auth rate-limit records support deployments with more than one application process.

- Case assignment, escalation, and approval requests use revision/status compare-and-set updates. The workflow mutation and audit event(s) commit together.
- Approval decisions atomically claim a pending request, update its related case, and write audit entries. A second concurrent decision fails; the requester cannot approve their own request.
- Project changes compare the submitted revision and write their audit event in the same transaction.
- Customer and project archival updates status and audit history; it does not remove the row or its relationships.
- Audit list responses omit the internal before/after JSON payloads and return only authorized view fields.

## Verification

Checks that do not need a database URL:

```sh
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

Database checks require a private `.env.local` pointed to an isolated development branch:

```sh
npm run db:status
npm run db:migrate
npm run db:seed
npm run db:connectivity
```

Schema validation and client generation do not establish live database connectivity. Do not claim connectivity or seed success unless the configured Neon branch was actually reached.

## References

- [Prisma ORM 7 with Next.js](https://www.prisma.io/docs/guides/v7/frameworks/nextjs)
- [Prisma ORM 7 database drivers](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers)
- [Prisma ORM 7 connections and pools](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon serverless driver configuration](https://github.com/neondatabase/serverless/blob/main/CONFIG.md)
- [Neon branching workflow](https://neon.com/docs/get-started-with-neon/workflow-primer)
