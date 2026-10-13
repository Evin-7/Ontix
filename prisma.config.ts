import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI schema operations must use Neon’s direct endpoint. Runtime
    // queries use the pooled DATABASE_URL through @prisma/adapter-neon.
    url: process.env.DIRECT_DATABASE_URL ?? "",
  },
});
