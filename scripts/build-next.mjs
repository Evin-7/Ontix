import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const nextCli = resolve(projectRoot, "node_modules/next/dist/bin/next");
const result = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: projectRoot,
  env: { ...process.env, ONTIX_BUILD_SKIP_DATABASE: "1" },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
