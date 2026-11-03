import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { createMcpServer } from "./tools";

async function main() {
  // Claude Code starts this from each project's repo, but .env and the relative
  // DATABASE_URL have to resolve against this app to reach the same database.
  process.chdir(fileURLToPath(new URL("..", import.meta.url)));
  // stdout carries the MCP protocol, so nothing else may print there.
  config({ quiet: true });

  // Imported after dotenv so the client sees DATABASE_URL.
  const { db } = await import("../src/db/client");
  await createMcpServer(db).connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
