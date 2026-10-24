# Ontix deployment instructions

Ontix runs as one Next.js App Router application. The web UI, Route Handlers, and server-side workflows deploy together on a Node.js-compatible Next.js host. Do not deploy an additional Express, NestJS, or FastAPI service. A standalone Docker image and GitHub Actions CI build are defined, but this checkout has no image publishing, cloud deployment, or infrastructure-as-code yet.

## Environment

Set these as server-side environment variables in the hosting environment:

- `DATABASE_URL`: Neon pooled endpoint for the intended database branch.
- `DIRECT_DATABASE_URL`: matching direct endpoint for the migration job only; do not expose it to the application browser or use it for routine runtime queries.
- `BETTER_AUTH_URL`: the exact canonical HTTPS origin of the deployed app.
- `BETTER_AUTH_SECRET`: at least 32 random characters, stored in the host secret manager.
- `DATA_PROVIDER`: choose `neon-demo` for the Neon workspace or `foundry` for the Foundry workspace. The default is `neon-demo`.
- `DATABASE_ENVIRONMENT` and `DATABASE_BRANCH_NAME`: set for the dedicated development branch when running guarded local mutation scripts.
- For `DATA_PROVIDER=foundry`: `FOUNDRY_STACK_URL`, `FOUNDRY_CLIENT_ID`, `FOUNDRY_REDIRECT_URI`, `ONTIX_APPLICATION_URL`, `FOUNDRY_TOKEN_ENCRYPTION_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and one or more `FOUNDRY_*_GROUP_IDS` role mappings. Keep the token key, Redis token, and group IDs server-side. The public OAuth client ID is not a secret, but belongs in server configuration.

For a Neon workspace deployment, add the pooled `DATABASE_URL`, canonical `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `DATA_PROVIDER=neon-demo` as server-side environment variables. Keep `DIRECT_DATABASE_URL` in the separately controlled migration/release environment; runtime queries use only the pooler. For Foundry mode, use the Foundry configuration listed above and the exact public HTTPS origin and callback registered with Developer Console. Set up the shared session store in a region appropriate to the app runtime. Never add database URLs, auth secrets, access tokens, or encryption keys to a `NEXT_PUBLIC_*` variable. This checkout is not linked to a hosting project, so no environment changes or deployment have been made.

Keep all database credentials and auth secrets out of `NEXT_PUBLIC_*`, client components, generated static assets, logs, and commits. Palantir access tokens must stay encrypted in the Foundry session store and isolated from Neon configuration.

## Build and run

Use Node.js 22 or newer, as declared in `package.json` and required by the installed Prisma dependency. Install the lockfile dependencies and build the full-stack app:

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

For production, run committed migrations in a separately reviewed release job using the direct URL for the approved environment and a production-specific safeguard. Do not set `DATABASE_ENVIRONMENT=development` to bypass the local guard. Never run `prisma migrate reset` or overwrite/drop existing tables without explicit approval. Seed data is fictional and intended only for an isolated development branch.

The first administrator is provisioned out of band by the development-only bootstrap command. For shared or production deployments, create a reviewed operator-provisioning procedure before enabling the app. Public sign-up is disabled; every authenticated identity must be linked to an active employee with an authorized role.

## Foundry provider boundary

The Neon workspace provider reads and writes Neon records only. Its relationship explorer resolves the relational links among those records. `DATA_PROVIDER=foundry` uses Foundry sign-in, user-scoped OSDK reads, bounded relationship traversal, and guarded action calls; it does not fall back to Neon. These live operations have not yet completed end-to-end verification. Details: [FOUNDRY_SETUP.md](FOUNDRY_SETUP.md), [PROVIDERS.md](PROVIDERS.md), and [OSDK_INTEGRATION_STATUS.md](OSDK_INTEGRATION_STATUS.md).
