"use client";

import { useEffect } from "react";

// Only in production: in development it would keep serving old assets.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error(error));
    }
  }, []);

  return null;
}
