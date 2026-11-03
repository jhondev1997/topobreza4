import { randomUUID } from "node:crypto";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { Database } from "./client";
import * as schema from "./schema";

// Fresh database per call, copied from the template built in vitest.global-setup.ts.
export function createTestDb() {
  const dir = process.env.TEST_DB_DIR!;
  const path = join(dir, `${randomUUID()}.db`);
  copyFileSync(join(dir, "template.db"), path);

  const client = createClient({ url: `file:${path.replaceAll("\\", "/")}` });
  return {
    client,
    db: drizzle(client, { schema }) as unknown as Database,
    close: () => client.close(),
  };
}
