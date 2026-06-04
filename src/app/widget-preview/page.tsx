import type { Metadata } from "next";
import { BrandShell } from "@/components/amm/brand-shell";
import { BrandHeader } from "@/components/amm/brand-header";
import { MagicMikeWidgetShell } from "@/components/amm/magic-mike-widget-shell";
import { MagicMikeWidgetController } from "@/components/amm/magic-mike-widget-controller";
import { MagicMikeWidgetFloating } from "@/components/amm/magic-mike-widget-floating";
import { BrandKitShowcase } from "@/components/amm/brand-kit-showcase";
import { ComplianceFooter } from "@/components/amm/compliance-footer";
import { ammTokens } from "@/components/amm/tokens";

export const metadata: Metadata = {
  title: "Ask Magic Mike — Brand Kit & Widget Preview (internal)",
  description:
    "Internal preview of the Ask Magic Mike v2 brand kit and the Magic Mike chat widget visual system. Mike Eatmon, Our Town Properties. AI-assisted intake, local human follow-up.",
  robots: { index: false, follow: false },
};

const ANSWER_BODY = (
  <div className="text-[13px] text-[#F4F4F4]/95 leading-relaxed">
    <p className="font-semibold text-gold-200 mb-1">
      Preliminary range — subject to review
    </p>
    <p>
      Based on the Wilson-area market context Mike&apos;s team monitors, your
      home may fall inside a preliminary value range. This is not an
      appraisal. Mike Eatmon or the Our Town Properties team will follow up
      with local guidance.
    </p>
  </div>
);

const LEAD_BODY = (
  <div className="space-y-3">
    <p className="text-[11px] tracking-[0.18em] uppercase text-gold-300">
      Start your local read
    </p>
    <p className="text-[14px] font-semibold text-[#F4F4F4] leading-snug">
      Share your address and Mike&apos;s team will follow up.
    </p>
    <div className="rounded-xl border border-white/12 bg-black/45 px-3 py-2.5 text-[13px] text-slate-300">
      123 Nash St NW, Wilson, NC 27896
    </div>
    <button
      type="button"
      className="inline-flex w-full items-center justify-center rounded-xl bg-gold-400 px-4 py-3 text-[13px] font-bold text-[#050505] shadow-[0_18px_40px_-12px_rgba(212,175,55,0.55)]"
    >
      Start with your address
    </button>
    <p className="text-[11px] text-slate-400">
      Subject to review. Not an instant offer. Not an appraisal.
    </p>
  </div>
);

export default function WidgetPreviewPage() {
  return (
    <BrandShell>
      <BrandHeader />

      <main className="relative z-10 flex-1 px-5 sm:px-6 pb-20 pt-4 max-w-6xl mx-auto w-full">
        <section className="mb-10">
          <div className={`${ammTokens.eyebrow} mb-4`}>
            <span className={ammTokens.eyebrowDot} />
            <span>Internal · brand kit v2 preview</span>
          </div>
          <h1
            className={`${ammTokens.headlineDisplay} mb-3`}
            style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.4rem)" }}
          >
            Ask Magic Mike widget &amp; brand kit preview
          </h1>
          <p className="text-[14px] text-slate-300 max-w-2xl">
            Visual proof that the v2 brand kit drives the funnel. Includes the
            chat widget shell at four states, the kit&apos;s expression /
            action / motion concept references, and the canonical token
            palette. Not indexed.
          </p>
        </section>

        {/* Live functional widget — drives the deterministic flow + posts
            to /api/leads. This is the cell the preview QA checklist
            interacts with end-to-end. */}
        <section className="mb-12" data-testid="widget-live-demo">
          <h2 className={`${ammTokens.headlineDisplay} text-[20px] mb-4`}>
            MagicMikeWidgetController — live demo
          </h2>
          <p className="text-[12.5px] text-slate-300 mb-3">
            Pick an intent, answer 1–3 questions, submit → POST /api/leads.
            Use this cell for the preview QA checklist. Same controller is
            mounted on `/value` as a floating widget bottom-right.
          </p>
          <div className="max-w-[420px]">
            <MagicMikeWidgetController />
          </div>
        </section>

        {/* Four widget states */}
        <section className="mb-12">
          <h2
            className={`${ammTokens.headlineDisplay} text-[20px] mb-4`}
          >
            MagicMikeWidgetShell — kit states
          </h2>
          <div
            data-testid="widget-state-grid"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"
          >
            <WidgetCell label="01 · idle">
              <MagicMikeWidgetShell variant="idle" />
            </WidgetCell>
            <WidgetCell label="02 · thinking">
              <MagicMikeWidgetShell variant="thinking" hideInput />
            </WidgetCell>
            <WidgetCell label="03 · answer reveal">
              <MagicMikeWidgetShell
                variant="answer"
                answer={ANSWER_BODY}
                prompts={[
                  "Compare selling options",
                  "Request a direct-purchase review",
                ]}
                hideInput
              />
            </WidgetCell>
            <WidgetCell label="04 · lead capture">
              <MagicMikeWidgetShell
                variant="lead"
                lead={LEAD_BODY}
                prompts={[]}
                hideInput
              />
            </WidgetCell>
          </div>
        </section>

        {/* Showcase */}
        <BrandKitShowcase />

        <div className="mt-12">
          <ComplianceFooter
            variant="inline"
            testId="widget-preview-disclosure"
          />
        </div>
      </main>

      <MagicMikeWidgetFloating label="Ask Magic Mike" />
    </BrandShell>
  );
}

function WidgetCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <figure
      data-testid={`widget-cell-${label.split(" ")[0]}`}
      className="flex flex-col items-center"
    >
      <p className="mb-3 text-[10.5px] tracking-[0.18em] uppercase text-gold-300">
        {label}
      </p>
      {children}
    </figure>
  );
}
