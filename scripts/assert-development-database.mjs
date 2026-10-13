import dotenv from "dotenv";
import { assertDevelopmentDatabase } from "./development-target.mjs";

dotenv.config({ path: [".env.local", ".env"] });

try {
  assertDevelopmentDatabase();
  console.log("Development Neon target verified; credentials were not displayed.");
} catch (error) {
  console.error(`Refusing database mutation: ${error.message}`);
  process.exitCode = 1;
}
