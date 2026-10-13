export function assertDevelopmentDatabase() {
  if (process.env.DATABASE_ENVIRONMENT !== "development") {
    throw new Error('set DATABASE_ENVIRONMENT="development" only after selecting a dedicated Neon development branch');
  }

  if (!process.env.DATABASE_BRANCH_NAME || /^(main|prod|production)$/i.test(process.env.DATABASE_BRANCH_NAME)) {
    throw new Error("set DATABASE_BRANCH_NAME to the dedicated non-production Neon branch name");
  }

  const pooledValue = process.env.DATABASE_URL;
  const directValue = process.env.DIRECT_DATABASE_URL;
  if (!pooledValue || !directValue) {
    throw new Error("DATABASE_URL and DIRECT_DATABASE_URL are both required");
  }

  let pooled;
  let direct;
  try {
    pooled = new URL(pooledValue);
    direct = new URL(directValue);
  } catch {
    throw new Error("both Neon connection URLs must be valid URLs");
  }

  const normalizedHost = (hostname) => hostname.replace("-pooler.", ".");
  if (
    !pooled.hostname.endsWith(".neon.tech") ||
    !direct.hostname.endsWith(".neon.tech") ||
    !pooled.hostname.includes("-pooler.") ||
    direct.hostname.includes("-pooler.")
  ) {
    throw new Error("use a Neon pooled URL for DATABASE_URL and its direct endpoint for DIRECT_DATABASE_URL");
  }

  if (
    pooled.hostname.includes("example") ||
    direct.hostname.includes("example") ||
    /replace|placeholder|change[_ -]?me|your[_ -]?password/i.test(`${pooled.username} ${pooled.password}`) ||
    /replace|placeholder|example/i.test(`${pooledValue} ${directValue}`)
  ) {
    throw new Error("replace the safe placeholders with the connection strings from your Neon development branch");
  }

  if (
    normalizedHost(pooled.hostname) !== direct.hostname ||
    pooled.pathname !== direct.pathname ||
    pooled.username !== direct.username ||
    pooled.password !== direct.password
  ) {
    throw new Error("the pooled and direct URLs must point to the same Neon branch and database");
  }

  if (pooled.searchParams.get("sslmode") !== "require" || direct.searchParams.get("sslmode") !== "require") {
    throw new Error("both Neon URLs must require TLS with sslmode=require");
  }
}
