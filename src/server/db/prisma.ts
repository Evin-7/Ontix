import "server-only";

import dotenv from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { PrismaClient } from "../../generated/prisma/client";

dotenv.config({ path: [".env.local", ".env"] });

const connectionString = process.env.DATABASE_URL;
// Bracket access keeps Next.js from replacing this build-only switch with its
// build-time value in the deployed server bundle.
const isBuildOnly = process.env["ONTIX_BUILD_SKIP_DATABASE"] === "1";

if (!connectionString && !isBuildOnly) {
  throw new Error(
    "The Neon workspace needs DATABASE_URL. Copy .env.example to .env.local and add the pooled Neon URL.",
  );
}

// Node 20 does not provide a global WebSocket. PrismaNeon uses the Neon
// WebSocket pool so interactive transactions remain available through Neon.
neonConfig.webSocketConstructor = WebSocket;

const adapter = new PrismaNeon(
  {
    // The Next build process loads the auth Route Handler to inspect its
    // exports. This reserved .invalid endpoint is used only for that build
    // process and cannot reach a database; runtime imports require the real
    // Neon URL above.
    connectionString: connectionString ?? "postgresql://ontix-build.invalid/ontix_build?sslmode=require",
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  },
  {
    onPoolError(error) {
      console.error("Neon connection pool error:", { errorType: error.name, code: "code" in error ? error.code : undefined });
    },
    onConnectionError(error) {
      console.error("Neon connection error:", { errorType: error.name, code: "code" in error ? error.code : undefined });
    },
  },
);

const globalForPrisma = globalThis as typeof globalThis & {
  ontixPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.ontixPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.ontixPrisma = prisma;
}
