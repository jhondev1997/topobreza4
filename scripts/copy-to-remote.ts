import { createClient } from "@libsql/client";
import { copyData } from "../src/db/copy-data";

// Copies local.db into the database in DATABASE_URL (see `.env.turso` in the
// README), which must already have the schema.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL. Crea .env.turso como indica el README.");

  const source = createClient({ url: "file:./local.db" });
  const target = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  console.log("Filas copiadas:", await copyData(source, target));
  source.close();
  target.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
