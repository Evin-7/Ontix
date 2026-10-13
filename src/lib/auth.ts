import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000";
const configuredSecret = process.env.BETTER_AUTH_SECRET;
// Bracket access keeps Next.js from replacing this build-only switch with its
// build-time value in the deployed server bundle.
const isBuildOnly = process.env["ONTIX_BUILD_SKIP_DATABASE"] === "1";
const authSecret = configuredSecret ?? (isBuildOnly ? "ontix-build-only-secret-not-for-runtime" : undefined);

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET must be configured before Ontix can start.");
}

export function assertAuthConfigured() {
  if (!isBuildOnly && !configuredSecret) {
    throw new Error("BETTER_AUTH_SECRET must be configured before Ontix can accept requests.");
  }
  if (configuredSecret && configuredSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
}

export const auth = betterAuth({
  appName: "Ontix",
  baseURL,
  trustedOrigins: [baseURL],
  // The build-only value lets Next inspect the route during `next build`; app
  // startup and request handling always require a private configured secret.
  secret: authSecret,
  database: prismaAdapter(prisma, { provider: "postgresql", transaction: true }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    storage: "database",
    modelName: "AuthRateLimit",
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  },
  user: {
    modelName: "AuthUser",
    additionalFields: {
      employeeId: {
        type: "string",
        required: false,
        input: false,
        returned: false,
      },
    },
  },
  session: {
    modelName: "AuthSession",
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60 * 4,
  },
  account: { modelName: "AuthAccount" },
  verification: { modelName: "AuthVerification" },
  advanced: {
    cookiePrefix: "ontix",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
});
