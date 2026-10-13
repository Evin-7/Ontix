# Ontix deployment instructions

Ontix runs as one Next.js App Router application. The web UI, business Server Actions, and Better Auth Route Handler deploy together on a Node.js-compatible Next.js host. Do not deploy an additional Express, NestJS, or FastAPI service.

## Environment

Set these as server-side environment variables in the hosting environment:

- `DATABASE_URL`: Neon pooled endpoint for the intended database branch.
- `DIRECT_DATABASE_URL`: matching direct endpoint for the migration job only; do not expose it to the application browser or use it for routine runtime queries.
- `BETTER_AUTH_URL`: the exact canonical HTTPS origin of the deployed app.
- `BETTER_AUTH_SECRET`: at least 32 random characters, stored in the host secret manager.
- `DATA_PROVIDER=local`: explicitly select the Local Demo provider.
- `DATABASE_ENVIRONMENT` and `DATABASE_BRANCH_NAME`: set for the dedicated development branch when running guarded local mutation scripts.

Keep all database credentials and auth secrets out of `NEXT_PUBLIC_*`, client components, generated static assets, logs, and commits. Palantir access tokens, if a separate Foundry provider is later configured, must be kept in their own server-side secret scope and never shared with the Neon provider.

## Build and run

Use a Node.js runtime supported by the pinned Next.js and Prisma releases. Install the lockfile dependencies and build the full-stack app:

```sh
npm ci
npm run db:generate
npm run typecheck
npm test
npm run build
npm start
```

Prisma's development client is a process singleton and the Neon adapter pool is limited to five connections per app process. Account for that pool limit across all concurrently running app instances and use the Neon pooled endpoint.

## Database rollout

Use a separate Neon branch for development and testing. Verify the configured endpoint in the Neon Console before running local mutation scripts: their environment labels are safeguards, but cannot independently prove the actual Neon branch. Review migration SQL and status before applying it to any shared or production database. Local scripts `db:migrate`, `db:seed`, `db:status`, `db:connectivity`, and `db:bootstrap-admin` reject production-like labels and validate the paired Neon URLs.

For production, run committed migrations in a separately reviewed release job using the direct URL for the approved environment and a production-specific safeguard. Do not set `DATABASE_ENVIRONMENT=development` to bypass the local guard. Never run `prisma migrate reset` or overwrite/drop existing tables without explicit approval. Seed data is fictional and intended only for an isolated demo branch.

The first administrator is provisioned out of band by the development-only bootstrap command. For shared or production deployments, create a reviewed operator-provisioning procedure before enabling the app. Public sign-up is disabled; every authenticated identity must be linked to an active employee with an authorized role.

## Foundry provider boundary

The Local Demo provider reads and writes Neon records only. A real Foundry OSDK integration requires its own authorized environment, generated Ontology SDK, credentials, and permission rules. Keep its client and operation path independent; never use Neon records or tokens as a Foundry fallback. Details: [PROVIDERS.md](PROVIDERS.md).
