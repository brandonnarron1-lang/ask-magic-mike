"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[app-error]", error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080806] text-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md w-full">
        <p className="text-[10.5px] font-semibold tracking-[0.25em] uppercase text-amber-400/80 mb-6">
          Something went wrong
        </p>

        <h1 className="font-display text-[2.4rem] sm:text-5xl font-bold text-[#F7F1E8] leading-tight mb-4">
          We hit a snag.
        </h1>

        <p className="text-slate-300 text-[15px] leading-relaxed mb-10 max-w-sm mx-auto">
          This page encountered an error. Your request wasn&apos;t lost — try
          refreshing and it should recover.
        </p>

        {/* Primary — try again */}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto
                     rounded-xl bg-gold-400 px-8 py-3.5 text-sm font-bold text-[#0A0A0A]
                     shadow-[0_18px_40px_-12px_rgba(212,160,23,0.45)]
                     hover:bg-gold-300 active:scale-[0.99] transition-all duration-200"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>

        <div className="mt-4">
          <Link
            href="/"
            className="text-[13px] text-slate-400 hover:text-gold-300 transition-colors"
          >
            ← Back to homepage
          </Link>
        </div>

        {error.digest && (
          <p className="mt-10 text-[10px] font-mono text-slate-700">
            ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
