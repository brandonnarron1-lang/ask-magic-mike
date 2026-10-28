"use client";

import { useEffect, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

function legacyCopy(value: string) {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard copy was rejected");
}

export function CopyDemandAsset({ label, value, comfortable = false }: { label: string; value: string; comfortable?: boolean }) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timeout = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function copy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        legacyCopy(value);
      }
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  const visibleLabel = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label;

  return (
    <button
      type="button"
      onClick={copy}
      className={`${comfortable ? "min-h-11 text-sm" : "text-[10px]"} min-w-0 max-w-full rounded-full border border-white/10 bg-white/[.04] px-3 py-2 font-bold uppercase tracking-[0.12em] text-[#d9ceb8] [overflow-wrap:anywhere] transition motion-reduce:transition-none hover:border-[#cda24a66] hover:bg-[#cda24a12] hover:text-[#f0cf79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9edbe2]`}
      aria-label={`${label} to clipboard`}
    >
      <span aria-live="polite">{visibleLabel}</span>
    </button>
  );
}
