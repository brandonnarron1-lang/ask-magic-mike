"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CopySnippetProps {
  value: string;
  label?: string;
  mono?: boolean;
  className?: string;
}

/**
 * Compact inline copy component for public surfaces.
 * For code-block-style copying, use CopyBlock from admin/copy-block.tsx.
 */
export function CopySnippet({ value, label, mono = true, className }: CopySnippetProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently fail
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2",
        className
      )}
    >
      <span
        className={cn(
          "flex-1 truncate text-xs text-slate-300",
          mono && "font-mono"
        )}
      >
        {label ?? value}
      </span>
      <button
        onClick={handleCopy}
        aria-label={`Copy ${label ?? "value"} to clipboard`}
        className={cn(
          "shrink-0 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] font-semibold transition-all duration-150",
          copied
            ? "border border-emerald-400/40 bg-emerald-400/[0.10] text-emerald-400"
            : "border border-white/[0.10] bg-white/[0.03] text-slate-400 hover:border-gold-400/30 hover:text-gold-300"
        )}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
