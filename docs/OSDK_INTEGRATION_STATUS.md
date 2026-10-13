# OSDK integration status

## Current state

**Genuine Foundry integration: not connected.** No real OSDK query, relationship traversal, action, or network response has been run from Ontix. This checkout contains no authorized Foundry stack URL, generated OSDK package, client ID, client secret, or service-user permissions.

`DATA_PROVIDER=neon-demo` runs the existing Local Demo. Its Data model page performs authenticated, server-side relationship queries over Neon records and is explicitly labeled as an Ontology-style simulation. Existing case and approval actions continue to use Ontix authorization, transactional writes, and audit logs. None of these operations reach Foundry.

`DATA_PROVIDER=foundry` displays setup guidance and stops before business data access. It does not fall back to Neon. A complete Foundry provider is not yet implemented because the types and methods are generated for a specific authorized Ontology; adding a generic client without that generated contract would not enable real object queries or actions.

## Integration design after account setup

Use a Foundry **backend service** and confidential OAuth client on the Next.js Node.js server. Palantir’s OSDK supports TypeScript and is generated for a particular Ontology in Developer Console. The official client and OAuth packages are `@osdk/client` and `@osdk/oauth`; the generated package and its private registry instructions come from the user’s Developer Console application.

The service-user trade-off must remain visible: calls run with the service user’s Foundry permissions, not automatically as the signed-in Ontix employee. Ontix must keep its own authentication and role checks server-side, while the service user receives only minimum necessary Foundry resource access. Do not send Foundry client secrets or access tokens to the browser.

Suggested private server settings after the OSDK is generated:

| Setting | Purpose |
| --- | --- |
| `FOUNDRY_STACK_URL` | The user’s Foundry enrollment URL. |
| `FOUNDRY_CLIENT_ID` | Developer Console backend application identifier. |
| `FOUNDRY_CLIENT_SECRET` | Confidential OAuth secret, kept in server-only secret storage. |
| `FOUNDRY_ONTOLOGY_RID` | The generated SDK’s Ontology RID. |
| Generated OSDK package + version | Ontology-specific object, link, action, and query bindings from the private Artifacts registry. |

These values are not currently consumed by Ontix. Do not configure `DATA_PROVIDER=foundry` expecting a live provider yet. Do not commit generated registry authentication or credential files.

## Testing boundary

Palantir publishes `@osdk/unit-testing`, an **experimental** package available through `@osdk/unit-testing/experimental`. Its `createMockClient`, mock objects, and object sets support unit tests for code written against a generated OSDK without contacting Foundry. They do not establish a connection or prove real permissions, ontology data, or remote action behavior.

The package is not installed in this checkout because there is no generated OSDK client or Foundry-backed service code to test with it. Once those exist, use those official mocks for isolated tests and run a separate, explicitly authorized smoke test against the configured development enrollment. Only a successful real response should be described as a genuine integration.

References: [OSDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview), [TypeScript OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk), [server-side OSDK setup](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-server-side-typescript), [OSDK unit testing](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-testing).
