import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Test databases live here. libSQL holds the file lock on Windows until the
// worker process exits, so cleanup has to run after the workers are gone.
export default function setup() {
  const dir = mkdtempSync(join(tmpdir(), "topobreza4-test-"));
  process.env.TEST_DB_DIR = dir;

  execFileSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "push", "--force"], {
    env: {
      ...process.env,
      DATABASE_URL: `file:${join(dir, "template.db").replaceAll("\\", "/")}`,
      DATABASE_AUTH_TOKEN: "",
    },
    stdio: "pipe",
  });

  return () => {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  };
}
