import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080806] text-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md w-full">
        {/* Eyebrow */}
        <p className="text-[10.5px] font-semibold tracking-[0.25em] uppercase text-gold-400/80 mb-6">
          404 — Page Not Found
        </p>

        {/* Headline */}
        <h1 className="font-display text-[2.6rem] sm:text-5xl font-bold text-[#F7F1E8] leading-tight mb-4">
          This page doesn&apos;t exist.{" "}
          <span className="text-gold-shimmer">Your home question does.</span>
        </h1>

        <p className="text-slate-300 text-[15px] leading-relaxed mb-10 max-w-sm mx-auto">
          {siteConfig.agentName} and the {siteConfig.parentBrandName} team
          can still answer your Wilson County real estate question — the page
          just moved.
        </p>

        {/* Primary CTA */}
        <Link
          href="/value"
          className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto
                     rounded-xl bg-gold-400 px-8 py-3.5 text-sm font-bold text-[#0A0A0A]
                     shadow-[0_18px_40px_-12px_rgba(212,160,23,0.45)]
                     hover:bg-gold-300 active:scale-[0.99] transition-all duration-200"
        >
          Ask Mike about my home
          <ArrowRight className="h-4 w-4" />
        </Link>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[11px] text-slate-600 uppercase tracking-[0.2em]">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Secondary actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] text-slate-300 hover:text-gold-300 transition-colors"
          >
            ← Back to homepage
          </Link>
          <span className="hidden sm:block text-slate-700">·</span>
          <a
            href={`tel:${siteConfig.agentPhone}`}
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-300 hover:text-gold-300 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            Call Mike directly
          </a>
        </div>

        {/* Trust note */}
        <p className="mt-12 text-[11px] text-slate-600">
          {siteConfig.brandName} &middot; {siteConfig.parentBrandName} &middot; Wilson, NC
        </p>
      </div>
    </div>
  );
}
