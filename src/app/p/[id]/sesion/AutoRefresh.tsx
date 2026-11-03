"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_MS = 10_000;

// Claude Code writes from another process, so this screen has to ask for changes.
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
