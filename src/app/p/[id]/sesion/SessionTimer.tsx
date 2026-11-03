"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/server/time";

// Starts from the server's clock so the first render matches the HTML.
export function SessionTimer({ startedAt, serverNow }: { startedAt: number; serverNow: number }) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      role="timer"
      className="font-display text-[clamp(52px,17.5vw,68px)] leading-[1.05] font-bold tracking-[0.02em] tabular-nums"
    >
      {formatElapsed(now - startedAt)}
    </span>
  );
}
