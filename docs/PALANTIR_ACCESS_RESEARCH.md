# Palantir access research

Research checked on 2026-10-13 against Palantir’s public documentation, Palantir’s official Developer Community, and the Palantir-maintained OSDK TypeScript repository.

## Findings

- **A legitimate free Foundry/AIP option exists.** Palantir documents an account-based AIP Developer Tier trial that provides platform access. Start at [build.palantir.com](https://build.palantir.com/) or use the [Developer Tier signup linked from Palantir docs](https://signup.palantirfoundry.com/signup?signupPermitCode=DEVELOPER_DOCS&tracking-code=developer_docs). Palantir staff describe the tier as free with limited capacity shown in Control Panel; the published limits prevent exceeding the free tier and incurring charges. The signup requires an account; the free tier is not anonymous API access.
- **India was identified as a supported country.** A Palantir Developer Community staff reply explicitly confirmed India was supported in April 2025. The signup form’s current country selection is the final check because country availability can change.
- **Payment requirements are not publicly established by the sources reviewed.** The public docs and the signup form as accessed for this research did not let us verify whether payment-card information is requested. We should not promise that a card is or is not required.
- **No shared developer credentials, anonymous Foundry API, or general-purpose public Foundry sandbox was found.** Tutorials, starter packs, and sample projects are developer resources. The Carbon tutorial’s Training and Resources Project is inside a Foundry enrollment; it is not a public unauthenticated environment.
- **Public Applications are a configured Foundry feature, not a free sandbox.** They require an existing enrollment, application setup, and security approval.
- **No real Ontix-to-Foundry connection was established.** This repository has no Foundry enrollment URL, generated Ontology SDK, client registration, or authorized token. No Foundry requests were made.

## Official setup path

1. Open [build.palantir.com](https://build.palantir.com/) and register for the AIP Developer Tier if the signup page confirms the country is eligible. Complete the email/phone verification and passkey setup described in Palantir’s [login guide](https://www.palantir.com/docs/foundry/getting-started/login).
2. In the enrollment, open Ontology Manager from the Workspace sidebar (or `<your-enrollment-url>/workspace/ontology`). Create object types with the guided wizard, connect a backing datasource or create action-populated objects, define properties and primary/title keys, configure object security, and save the Ontology. Define link types between related object types and action types for permitted writeback. See [create an object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type) and the [Ontology Manager overview](https://www.palantir.com/docs/foundry/ontology-manager/overview).
3. Open **Developer Console** at `<your-enrollment-url>/workspace/developer-console/` and create a **Backend service** application with the Ontology SDK enabled. Select the Ontology and only the required object, link, action, function, and query resources. Developer Console restricts each application to its configured resources and operations.
4. Generate the application-specific TypeScript OSDK. Palantir’s generated package is enrollment-specific and distributed from that enrollment’s Artifacts npm registry; a generic npm package cannot supply Ontix’s object types.
5. For the Next.js server, configure a **backend service/confidential OAuth client** with the minimum permissions required for the demonstration. Keep the client secret and Foundry token in local server environment or a hosting secret manager. Never add `NEXT_PUBLIC_` prefixes or commit them. Requests run with the Foundry service user’s permissions, not automatically as the signed-in Ontix employee, so Ontix must keep its own authentication and role checks server-side and the service user must have only the minimum required access.
6. Share the generated SDK package name/version and non-secret API metadata, then put the secret into the private local environment file. A harmless object read can then be implemented and verified against the user-authorized enrollment.

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
