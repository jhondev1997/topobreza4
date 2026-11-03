import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the phone use `pnpm dev` over the home network; only affects development.
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        // A new service worker has to reach the browser on the next visit.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
