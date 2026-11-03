import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Falta DATABASE_URL. Copia .env.example a .env.");
}

export const db = drizzle(
  createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    // The app and the MCP server are separate processes sharing the local file.
    timeout: 5000,
  }),
  { schema },
);

export type Database = typeof db;
