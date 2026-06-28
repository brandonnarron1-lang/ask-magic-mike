"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CopyBlockProps {
  label: string;
  sublabel?: string;
  content: string;
  charLimit?: number;
  className?: string;
  mono?: boolean;
}

export function CopyBlock({
  label,
  sublabel,
  content,
  charLimit,
  className,
  mono = false,
}: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-https dev) — silently fail
    }
  }

  const count   = content.length;
  const overLimit = charLimit ? count > charLimit : false;

  return (
    <div className={cn("rounded-xl border border-white/[0.07] bg-white/[0.02]", className)}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="min-w-0">
          <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-300/80">{label}</p>
          {sublabel && (
            <p className="text-[10px] text-slate-600 mt-0.5">{sublabel}</p>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {charLimit && (
            <span className={`text-[10.5px] tabular-nums font-mono ${overLimit ? "text-ruby-400 font-bold" : "text-slate-600"}`}>
              {count.toLocaleString()}/{charLimit.toLocaleString()}
            </span>
          )}
          <button
            onClick={handleCopy}
            aria-label={`Copy ${label} to clipboard`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-semibold transition-all duration-150",
              copied
                ? "border-emerald-400/40 bg-emerald-400/[0.10] text-emerald-400"
                : "border-white/[0.10] bg-white/[0.03] text-slate-400 hover:border-gold-400/30 hover:bg-gold-400/[0.06] hover:text-gold-300"
            )}
          >
            {copied
              ? <Check className="h-3 w-3" aria-hidden="true" />
              : <Copy className="h-3 w-3" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <pre
          className={cn(
            "whitespace-pre-wrap text-sm leading-relaxed text-slate-300 break-words",
            mono && "font-mono text-xs"
          )}
        >
          {content}
        </pre>
      </div>

      {overLimit && charLimit && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-ruby-400 font-semibold">
            {count - charLimit} chars over limit — trim before posting
          </p>
        </div>
      )}
    </div>
  );
}
