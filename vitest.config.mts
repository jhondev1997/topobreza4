import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Tests touch real database files, which can stall when the machine is busy.
    testTimeout: 30_000,
    include: ["src/**/*.test.ts", "mcp/**/*.test.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
  },
});
