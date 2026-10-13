# Palantir access research

Research checked on 2026-10-13 against Palantir’s public documentation, Palantir’s official Developer Community, and the Palantir-maintained OSDK TypeScript repository.

## Findings

- **A legitimate free Foundry/AIP option exists.** Palantir documents an account-based AIP Developer Tier trial that provides platform access. Start at [build.palantir.com](https://build.palantir.com/) or use the [Developer Tier signup linked from Palantir docs](https://signup.palantirfoundry.com/signup?signupPermitCode=DEVELOPER_DOCS&tracking-code=developer_docs). Palantir staff describe the tier as free with limited capacity shown in Control Panel; the published limits prevent exceeding the free tier and incurring charges. The signup requires an account; the free tier is not anonymous API access.
- **India was identified as a supported country.** A Palantir Developer Community staff reply explicitly confirmed India was supported in April 2025. The signup form’s current country selection is the final check because country availability can change.
- **Payment requirements are not publicly established by the sources reviewed.** The public docs and the signup form as accessed for this research did not let us verify whether payment-card information is requested. We should not promise that a card is or is not required.
- **No shared developer credentials, anonymous Foundry API, or general-purpose public Foundry sandbox was found.** Tutorials, starter packs, and sample projects are developer resources. The Carbon tutorial’s Training and Resources Project is inside a Foundry enrollment; it is not a public unauthenticated environment.
- **Public Applications are a configured Foundry feature, not a free sandbox.** They require an existing enrollment, application setup, and security approval.
- **No real Ontix-to-Foundry OSDK connection has been established.** A later UI check on 2026-10-13 verified the user's authenticated Brave session could open the provided enrollment and the `ontix` project. That check did not use an API token or make an Ontix OSDK request. There is still no generated Ontology SDK, completed client registration, or successful authenticated Foundry response from Ontix.

## Official setup path

1. Open [build.palantir.com](https://build.palantir.com/) and register for the AIP Developer Tier if the signup page confirms the country is eligible. Complete the email/phone verification and passkey setup described in Palantir’s [login guide](https://www.palantir.com/docs/foundry/getting-started/login).
2. In the enrollment, open Ontology Manager from the Workspace sidebar (or `<your-enrollment-url>/workspace/ontology`). Create object types with the guided wizard, connect a backing datasource or create action-populated objects, define properties and primary/title keys, configure object security, and save the Ontology. Define link types between related object types and action types for permitted writeback. See [create an object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type) and the [Ontology Manager overview](https://www.palantir.com/docs/foundry/ontology-manager/overview).
3. Create the Developer Console app as a **public client** with **user permissions** and **Authorization Code + PKCE**. Select only the needed Ontology object, link, and action resources. For Ontix, the app `Ontix Web Integration` now exists with callback `http://127.0.0.1:3000/api/foundry/oauth/callback` and six object types/five links. Palantir intersects user permissions, app resource restrictions, and requested operation scopes.
4. Create the needed Ontology actions and confirm their parameters and transition rules against the actual property schemas. Run Test Run on fictional records and inspect whether any configured function or webhook could cause external side effects. Add the saved actions to the app's resource restrictions.
5. Generate the application-specific TypeScript OSDK v2. Palantir's generated package is enrollment-specific and distributed from that enrollment's package registry; a generic npm package cannot provide Ontix's generated ontology types. Install only the package name, version, registry, and methods shown by Developer Console.
6. The existing Next.js server uses the public client’s PKCE flow and a per-user Foundry grant. It keeps tokens encrypted server-side, while Better Auth remains the local Ontix sign-in and role system. The Foundry grant does not by itself replace Ontix identity, sessions, authorization, or persistence. No client secret exists for the public client. Never add `NEXT_PUBLIC_` prefixes or commit encryption keys/tokens.
7. Once the local development database and secret are configured, test a real OSDK read, all relationships, a permitted action, refresh, disconnect, expiry, and authorization denial. Do not remove Neon or claim an integration until those tests succeed.

Palantir’s official docs do not establish that a payment card is required for Developer Tier signup. Verify this in the live signup process before proceeding if the form asks for billing information.

## Carbon Workspaces

Carbon is Palantir Foundry’s application for assembling curated, permissioned operational workspaces from Foundry resources. Its home page can include Ontology-aware search, object types, links, and modules; its menu provides navigation among workspace resources. It is unrelated to IBM Carbon Design System.

Creating a Carbon workspace requires access to a Foundry enrollment and appropriate editor/administrator permissions. A workspace is stored as a file resource in a Foundry Project and can be configured through the Carbon UI or edited as YAML. The docs reviewed describe no Carbon-specific public REST API or SDK for creating or managing workspaces from Ontix. An authorized Carbon administrator can add a deployed Ontix URL as an external navigation link; that is navigation only and does not make Ontix a Carbon workspace or provide shared authentication/OSDK access. The official Carbon tutorial uses a Foundry-internal Training and Resources Project, not a public demo environment.

References: [Carbon overview](https://www.palantir.com/docs/foundry/carbon/overview), [workspace overview](https://www.palantir.com/docs/foundry/carbon/workspaces-overview), [create a workspace](https://www.palantir.com/docs/foundry/carbon/workspaces-create), [permissions](https://www.palantir.com/docs/foundry/carbon/permissions-configure), [YAML configuration](https://www.palantir.com/docs/foundry/carbon/code-reference), [external links](https://www.palantir.com/docs/foundry/carbon/configuration-general).

## References

- [Palantir developer resources and free Developer Tier signup](https://www.palantir.com/docs/foundry/developers)
- [Getting started and access options](https://www.palantir.com/docs/foundry/getting-started/overview)
- [Palantir Developer Community: Developer Tier billing and limits](https://community.palantir.com/t/developer-tier-billing-and-usage/1074)
- [Palantir Developer Community: India availability](https://community.palantir.com/t/palantir-availability-from-india/3672)
- [Developer Console: create an application](https://www.palantir.com/docs/foundry/developer-console/create-application)
- [Create an Ontology object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type)
- [TypeScript OSDK in an existing application](https://www.palantir.com/docs/foundry/developer-console/how-to-add-to-existing-typescript)
- [Server-side TypeScript OSDK bootstrap](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-server-side-typescript)
- [Add the generated OSDK to a bootstrapped repository](https://www.palantir.com/docs/foundry/ontology-sdk/add-osdk-to-bootstrapped-repository)
- [Palantir-maintained TypeScript OSDK](https://github.com/palantir/osdk-ts)
- [Public Applications overview](https://www.palantir.com/docs/foundry/consumer-mode/public-application-overview)
- [Public Applications setup and security requirements](https://www.palantir.com/docs/foundry/consumer-mode/public-application-setup)
