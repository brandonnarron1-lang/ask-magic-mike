"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[app-error]", error.message);
  }, [error]);

  return (
    <div className="relative min-h-screen bg-[#080806] text-cream flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(193,39,45,0.05) 0%, transparent 60%), " +
            "radial-gradient(ellipse 50% 40% at 20% 100%, rgba(212,160,23,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-md w-full">
        {/* Eyebrow */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 motion-safe:animate-pulse shrink-0" />
          <span className="text-[10px] font-semibold tracking-label uppercase text-amber-400/80">
            Something went wrong
          </span>
        </div>

        <h1 className="font-display text-[2.4rem] sm:text-5xl font-bold text-cream leading-tight mb-4">
          We hit a snag.
        </h1>

        <p className="text-slate-400 text-[15px] leading-relaxed mb-10 max-w-sm mx-auto">
          This page encountered an error. Your request wasn&apos;t lost — try
          refreshing and it should recover.
        </p>

        {/* Primary CTA */}
        <button
          onClick={reset}
          className="btn-gold-premium inline-flex items-center justify-center gap-2.5 w-full sm:w-auto rounded-xl px-8 py-3.5 text-sm font-bold text-[#050505]"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>

        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-gold-300 transition-colors duration-150"
          >
            <Home className="h-3.5 w-3.5" />
            Back to homepage
          </Link>
        </div>

        {error.digest && (
          <p className="mt-12 text-[10px] font-mono text-slate-700">
            ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
