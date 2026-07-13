"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandShell } from "@/components/amm/brand-shell";
import { CopyBlock } from "@/components/admin/copy-block";
import { CAMPAIGN_PRESETS, type CampaignPreset } from "@/lib/content/campaign-presets";

const CATEGORY_ORDER = ["conversion", "capture", "awareness", "print", "email", "video"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  conversion: "Conversion",
  capture: "Lead Capture",
  awareness: "Awareness",
  print: "Print / QR",
  email: "Email",
  video: "Video",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  ...CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
];

// ── Preset Nav ────────────────────────────────────────────────────────────────

function PresetNav({
  active,
  onSelect,
  visiblePresets,
  filterCat,
}: {
  active: string;
  onSelect: (id: string) => void;
  visiblePresets: CampaignPreset[];
  filterCat: string;
}) {
  const btnClass = (id: string) =>
    [
      "w-full text-left rounded-lg px-3 py-2 text-xs transition-all duration-150",
      active === id
        ? "border border-gold-400/25 bg-gold-400/[0.08] text-gold-300 font-semibold"
        : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]",
    ].join(" ");

  if (filterCat !== "all") {
    return (
      <nav aria-label="Campaign presets" className="space-y-0.5">
        {visiblePresets.map((p) => (
          <button key={p.id} onClick={() => onSelect(p.id)} className={btnClass(p.id)}>
            {p.label}
          </button>
        ))}
      </nav>
    );
  }

  const grouped = CATEGORY_ORDER.reduce<Record<string, CampaignPreset[]>>((acc, cat) => {
    const presets = visiblePresets.filter((p) => p.category === cat);
    if (presets.length > 0) acc[cat] = presets;
    return acc;
  }, {});

  return (
    <nav aria-label="Campaign presets" className="space-y-4">
      {Object.entries(grouped).map(([cat, presets]) => (
        <div key={cat}>
          <p className="text-[9px] font-semibold tracking-label uppercase text-slate-600 px-2 mb-1.5">
            {CATEGORY_LABELS[cat] ?? cat}
          </p>
          <div className="space-y-0.5">
            {presets.map((p) => (
              <button key={p.id} onClick={() => onSelect(p.id)} className={btnClass(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ── Preset Detail ─────────────────────────────────────────────────────────────

function PresetDetail({ preset }: { preset: CampaignPreset }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${preset.badgeColor}`}
          >
            {preset.badge}
          </span>
          <span className="text-[10.5px] text-slate-600 uppercase tracking-label font-semibold">
            {CATEGORY_LABELS[preset.category] ?? preset.category}
          </span>
        </div>
        <h2 className="font-bebas text-2xl sm:text-3xl text-cream mb-1">{preset.label}</h2>
        <p className="text-xs text-slate-400">{preset.description}</p>
      </div>

      {/* Headline */}
      <CopyBlock
        label="Headline"
        sublabel="Use as your main copy header or subject line hook"
        content={preset.headline}
      />

      {/* Short Caption */}
      <CopyBlock
        label="Short Caption"
        sublabel="X · SMS · pull quote · ≤ 140 chars"
        content={preset.shortCaption}
        charLimit={140}
      />

      {/* Long Caption */}
      {preset.category !== "video" && preset.category !== "email" && preset.category !== "print" && (
        <CopyBlock
          label="Long Caption"
          sublabel="Facebook · Threads · Instagram · email body · ≤ 500 chars"
          content={preset.longCaption}
          charLimit={500}
        />
      )}

      {/* Email subject + body */}
      {preset.emailSubject && (
        <CopyBlock
          label="Email Subject Line"
          content={preset.emailSubject}
        />
      )}
      {preset.emailBody && (
        <CopyBlock
          label="Email Body"
          sublabel="Replace [First Name], [LINK], and [DATE] before sending"
          content={preset.emailBody}
        />
      )}

      {/* Video script */}
      {preset.videoScript && (
        <CopyBlock
          label="Video Script"
          sublabel="30–60 sec · Deliver in your own voice — do not read verbatim"
          content={preset.videoScript}
        />
      )}

      {/* Print long copy */}
      {preset.category === "print" && (
        <CopyBlock
          label="Flyer / Mailer Copy"
          sublabel="Replace with actual property or contact details before printing"
          content={preset.longCaption}
        />
      )}

      {/* CTA URL */}
      <CopyBlock
        label="CTA Link (with UTM)"
        sublabel="Use this exact URL — UTM params track the lead source"
        content={preset.ctaUrl}
        mono
      />

      {/* CTA label */}
      <CopyBlock
        label="CTA Button / Link Text"
        sublabel="Button or hyperlink label"
        content={preset.ctaLabel}
      />

      {/* Placement + Compliance */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <p className="text-[10.5px] font-semibold tracking-label uppercase text-slate-500 mb-1.5">
            Suggested Placement
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">{preset.placement}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3">
          <p className="text-[10.5px] font-semibold tracking-label uppercase text-amber-400/60 mb-1.5">
            Compliance Note
          </p>
          <p className="text-xs text-amber-300/70 leading-relaxed">{preset.complianceNote}</p>
        </div>
      </div>

      {/* Hashtags */}
      {preset.hashtags && (
        <CopyBlock
          label="Hashtags"
          sublabel="Instagram / Facebook — mix local + category tags"
          content={preset.hashtags}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [activeId, setActiveId] = useState(CAMPAIGN_PRESETS[0]?.id ?? "home_value");
  const [filterCat, setFilterCat] = useState("all");

  const visiblePresets =
    filterCat === "all"
      ? CAMPAIGN_PRESETS
      : CAMPAIGN_PRESETS.filter((p) => p.category === filterCat);

  function handleFilter(cat: string) {
    setFilterCat(cat);
    const next =
      cat === "all"
        ? CAMPAIGN_PRESETS
        : CAMPAIGN_PRESETS.filter((p) => p.category === cat);
    if (next.length > 0 && !next.find((p) => p.id === activeId)) {
      setActiveId(next[0].id);
    }
  }

  const activePreset =
    visiblePresets.find((p) => p.id === activeId) ?? visiblePresets[0];

  return (
    <BrandShell
      cinematicSrc="/assets/black-diamond/campaign-generator.svg"
      cinematicOverlay={0.44}
    >
      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="text-sm font-semibold tracking-label uppercase text-gold-400/80 hover:text-gold-300 transition-colors"
        >
          Ask Magic Mike
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[10.5px] tracking-label uppercase text-slate-600 border border-white/[0.06] rounded-full px-2.5 py-0.5">
            {CAMPAIGN_PRESETS.length} presets
          </span>
          <Link
            href="/distribution"
            className="text-xs text-slate-400 hover:text-gold-300 transition-colors hidden sm:block"
          >
            ← Widget Distribution
          </Link>
          <Link
            href="/ask"
            className="rounded-lg border border-gold-400/30 bg-gold-400/[0.07] px-4 py-2 text-xs font-semibold text-gold-300 hover:bg-gold-400/[0.12] transition-all"
          >
            Ask Mike
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-5 py-8 sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/[0.05] px-3.5 py-1.5 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400 motion-safe:animate-pulse" />
          <span className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400">
            Campaign Generator
          </span>
        </div>
        <h1 className="font-bebas text-3xl sm:text-4xl md:text-5xl tracking-tight text-cream mb-2">
          Ready-to-use campaigns.{" "}
          <span className="text-gradient-gold">Copy and post.</span>
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
            {CAMPAIGN_PRESETS.length} presets — Facebook posts, Instagram captions, email
            blasts, QR flyers, video scripts, and more. Every CTA is UTM-tracked.
          </p>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" aria-hidden="true" />
            All compliance-reviewed
          </span>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="relative flex flex-col md:flex-row gap-0 px-5 pb-16 sm:px-8 md:gap-6">
        {/* Preset selector sidebar */}
        <aside className="md:w-52 lg:w-60 shrink-0 mb-6 md:mb-0">
          <div className="sticky top-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            {/* Category filter tabs */}
            <div
              className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-white/[0.06]"
              role="group"
              aria-label="Filter by category"
            >
              {FILTER_OPTIONS.map(({ value, label }) => {
                const count =
                  value === "all"
                    ? CAMPAIGN_PRESETS.length
                    : CAMPAIGN_PRESETS.filter((p) => p.category === value).length;
                return (
                  <button
                    key={value}
                    onClick={() => handleFilter(value)}
                    aria-pressed={filterCat === value}
                    className={[
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-label transition-all duration-150",
                      filterCat === value
                        ? "bg-gold-400/[0.10] border border-gold-400/25 text-gold-300"
                        : "border border-transparent text-slate-600 hover:text-slate-400",
                    ].join(" ")}
                  >
                    {label}
                    <span className="ml-1 opacity-50">{count}</span>
                  </button>
                );
              })}
            </div>

            <PresetNav
              active={activeId}
              onSelect={setActiveId}
              visiblePresets={visiblePresets}
              filterCat={filterCat}
            />
          </div>
        </aside>

        {/* Active preset detail */}
        <main className="flex-1 min-w-0">
          {activePreset && <PresetDetail preset={activePreset} />}
        </main>
      </div>

      {/* Compliance footer */}
      <div className="border-t border-white/[0.05] px-5 py-6 sm:px-8">
        <p className="text-center text-[10px] text-slate-700 leading-relaxed max-w-2xl mx-auto">
          All campaigns require local customization before publishing. Replace all [PLACEHOLDER] values.
          Do not publish inaccurate property data, guarantee specific prices, or claim instant automated responses.
          Our Town Properties, Inc. · Mike Eatmon, REALTOR® · Wilson, NC · Equal Housing Opportunity.
        </p>
      </div>
    </BrandShell>
  );
}
