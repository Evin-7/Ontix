# Ontix

![Ontix logo](public/ontix-logo.svg)

**Connected Data. Smarter Operations.**

Ontix is a full-stack operations workspace for customer accounts, projects, employees, operational cases, approvals, and audit activity. One Next.js App Router application serves the UI and server-side application logic. Workspace records persist in Neon PostgreSQL through Prisma.

Neon is a separate relational database provider. It is not Palantir Foundry or a genuine Palantir Ontology. The Data model view presents relationships over Neon records. Foundry mode uses the generated TypeScript OSDK to read six object types, traverse configured links on demand, and call three saved actions through server-side role-checked workflows. These paths have not yet completed an authenticated end-to-end verification; see [implementation status](docs/IMPLEMENTATION_STATUS.md). Foundry mode never falls back to Neon.

## Local setup

1. Create or select a free Neon project and a dedicated development branch. Do not use a production branch for schema or sample data work.
2. Copy `.env.example` to `.env.local`. Set the pooled `DATABASE_URL` and matching direct `DIRECT_DATABASE_URL` from that branch. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Keep `.env.local` private; Git ignores it.
3. Install and prepare the development branch:

```sh
npm ci
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. Provision the first administrator by setting the four `BOOTSTRAP_ADMIN_*` values in `.env.local`, then run:

```sh
npm run db:bootstrap-admin
```

The bootstrap command is one-time and development-branch guarded. Remove `BOOTSTRAP_ADMIN_PASSWORD` from `.env.local` after it succeeds. Seeded employee fixtures are not login accounts. Public sign-up is disabled.

5. Start the app with `npm run dev` and open `http://127.0.0.1:3000`.

If Neon credentials are not configured, schema generation, type checks, unit tests, lint, and the Next production build can still be run. Migration, seed, admin bootstrap, sign-in, and connectivity verification require a private `.env.local` targeting a disposable development branch.

## Architecture

- **Next.js App Router:** server-rendered pages, Route Handlers, and Server Actions share one TypeScript application. Business mutations use Server Actions; Better Auth is mounted at `/api/auth/[...all]`. Node.js 22 or newer is required.
- **Server-only data access:** Prisma, Neon credentials, authorization checks, service modules, validation, and workflows are never imported into browser code. The browser receives typed, limited view data and uses an HTTP-only session cookie.
- **Authentication and authorization:** The Neon workspace uses Better Auth with administrator-provisioned accounts linked to active employees. Foundry mode uses per-user Authorization Code + PKCE and group-derived roles. Both paths keep credentials server-side and enforce authorization at the server boundary; UI visibility does not replace authorization.
- **Modular services:** `src/lib/services/` contains customer, project, employee, operational case, approval, audit, and workspace read services. Data changes and audit events use one database transaction.
- **Neon provider:** Prisma ORM 7 uses Neon’s pooled endpoint for runtime operations and the matching direct endpoint for Prisma CLI migrations. Runtime runs on Node.js; Neon adapter pool size is capped at five connections per process.
- **Foundry provider:** Generated OSDK reads, bounded `$link` traversal, and three saved-action calls are implemented server-side. The authenticated live paths remain unverified. `foundry` mode requires Foundry sign-in and never falls back to Neon; see [docs/FOUNDRY_SETUP.md](docs/FOUNDRY_SETUP.md) and [docs/PROVIDERS.md](docs/PROVIDERS.md).
- **Current verification:** [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) records Foundry resources and local check results. [docs/PROJECT_WALKTHROUGH.md](docs/PROJECT_WALKTHROUGH.md) gives a concise walkthrough.
- **Relationship explorer:** The Neon provider resolves relationships over PostgreSQL records. Foundry mode traverses generated Ontology links through the OSDK. These are separate providers; only Foundry mode accesses Palantir Ontology data.
- **Project capabilities:** [docs/PROJECT_CAPABILITIES.md](docs/PROJECT_CAPABILITIES.md) summarizes implemented capabilities and remaining verification work.

## Data and workflows

The existing `employees`, teams, customers, projects, assignments, operational cases, approvals, and activity tables remain in place. A new additive migration creates separate Better Auth user, account, session, verification, and rate-limit tables. The auth user links to one employee; business records and audit foreign keys continue to reference employee IDs.

The seed inserts deterministic fictional records (5 teams, 15 employees, 30 customers, 20 projects, 80 cases, 25 approvals, and 161 events). Stable IDs and `skipDuplicates` make reruns safe; the seed does not update or delete existing rows.

Case assignment and escalation use revision compare-and-set updates and audit records in the same transaction. Approval requests transition cases and create requests atomically. Decisions atomically claim pending approvals, update the case, and write audit events; users cannot decide their own requests. Project updates use revision checks. Customer and project archives are soft state changes.

## Verification commands

```sh
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

With `.env.local` pointed at an isolated Neon development branch:

```sh
npm run db:status
npm run db:migrate
npm run db:seed
npm run db:connectivity
```

The database scripts require `DATABASE_ENVIRONMENT=development`, a non-production `DATABASE_BRANCH_NAME`, a Neon pooled `DATABASE_URL`, and the matching direct `DIRECT_DATABASE_URL`. They do not reset, drop, or overwrite existing data.

See [docs/DATABASE.md](docs/DATABASE.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Brand assets

Ontix uses an original connected-O mark in the primary indigo `#4F46E5`, with a light indigo variant for dark surfaces. The reusable React component is `src/components/branding/ontix-logo.tsx`; the full wordmark and icon SVG variants are in `public/`. Next.js serves the app favicon from `src/app/icon.svg`.

## Typography

Inter is the application-wide sans-serif, and JetBrains Mono is reserved for code and technical identifiers. Both are loaded through `next/font/google`, then emitted as same-origin optimized font assets by the Next.js build; browsers do not request fonts from Google at runtime. The font variables are attached in `src/app/layout.tsx`, and Tailwind CSS v4 maps `font-sans` and `font-mono` to those variables.

The Neon workspace supports administrator-provisioned sign-in. Foundry mode uses a separate Foundry OAuth sign-in and group-to-role mapping. Registration, password reset, and outbound email templates are not configured in this project, so there are no related UI or email assets to brand.
