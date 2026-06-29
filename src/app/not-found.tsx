import Link from "next/link";
import { ArrowRight, Phone, Home } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-[#080806] text-cream flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,160,23,0.07) 0%, transparent 60%), " +
            "radial-gradient(ellipse 50% 40% at 80% 100%, rgba(193,39,45,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-md w-full">
        {/* Eyebrow */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/[0.06] px-3.5 py-1.5">
          <span className="text-[10px] font-semibold tracking-label uppercase text-gold-400/80">
            404 — Page Not Found
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-[2.6rem] sm:text-5xl font-bold text-cream leading-tight mb-4">
          This page doesn&apos;t exist.{" "}
          <span className="text-gradient-gold">Your home question does.</span>
        </h1>

        <p className="text-slate-400 text-[15px] leading-relaxed mb-10 max-w-sm mx-auto">
          {siteConfig.agentName} and the {siteConfig.parentBrandName} team can
          still answer your Wilson County real estate question — the page just
          moved.
        </p>

        {/* Primary CTA */}
        <Link
          href="/ask"
          className="btn-gold-premium inline-flex items-center justify-center gap-2.5 w-full sm:w-auto rounded-xl px-8 py-3.5 text-sm font-bold text-[#050505]"
        >
          Ask Mike about my home
          <ArrowRight className="h-4 w-4" />
        </Link>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 gold-rule" />
          <span className="text-[11px] text-slate-600 uppercase tracking-[0.2em]">or</span>
          <div className="flex-1 gold-rule" />
        </div>

        {/* Secondary actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-gold-300 transition-colors duration-150"
          >
            <Home className="h-3.5 w-3.5" />
            Back to homepage
          </Link>
          <span className="hidden sm:block text-slate-700">·</span>
          <a
            href={`tel:${siteConfig.agentPhone}`}
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-gold-300 transition-colors duration-150"
          >
            <Phone className="h-3.5 w-3.5" />
            Call Mike directly
          </a>
        </div>

        {/* Trust note */}
        <p className="mt-14 text-[11px] text-slate-700 tracking-wider">
          {siteConfig.brandName} &middot; {siteConfig.parentBrandName} &middot; Wilson, NC
        </p>
      </div>
    </div>
  );
}
