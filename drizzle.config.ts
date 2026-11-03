import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Falta DATABASE_URL. Copia .env.example a .env.");
}

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
});
