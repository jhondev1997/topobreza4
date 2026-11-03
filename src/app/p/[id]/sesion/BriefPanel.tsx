"use client";

import { useRef, useState } from "react";

// navigator.clipboard only exists on secure contexts, and the phone reaches the
// dev server over plain http on the local network.
function copyWithSelection(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  return copied;
}

async function copy(text: string) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied: try the fallback.
  }
  return copyWithSelection(text);
}

export function BriefPanel({ brief }: { brief: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = async () => {
    setStatus((await copy(brief)) ? "copied" : "failed");
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <section className="flex flex-col gap-2.5 border border-panel-line bg-panel p-3.5 [clip-path:polygon(0_0,calc(100%-18px)_0,100%_18px,100%_100%,0_100%)]">
      <div className="flex items-center justify-between gap-2 pr-3">
        <h2 className="font-display text-xs font-bold tracking-[0.16em] text-muted">BRIEF</h2>
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className="focus-inset min-h-11 border border-line-strong px-3.5 font-display text-[13px] font-bold tracking-[0.06em] text-text uppercase"
        >
          {status === "copied" ? "Copiado" : status === "failed" ? "No se pudo" : "Copiar"}
        </button>
      </div>
      <pre className="font-mono text-xs leading-[1.6] whitespace-pre-wrap text-text-2">{brief}</pre>
    </section>
  );
}
