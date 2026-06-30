import { Globe, Facebook, Instagram, Mail, QrCode, MessageSquare, Code2, Link2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";
import { CopyBlock } from "@/components/admin/copy-block";

// ─── Embed snippets ──────────────────────────────────────────────────────────

const EMBED_SNIPPETS = [
  {
    id: "wordpress-sidebar",
    label: "WordPress · Sidebar Widget",
    sublabel: "Appearance → Widgets → Custom HTML",
    badge: "WordPress",
    badgeColor: "border-blue-400/25 bg-blue-400/[0.05] text-blue-300",
    snippet: `<div
  data-amm-widget="true"
  data-utm-source="wordpress"
  data-utm-medium="embed"
  data-utm-campaign="home-value"
  data-utm-content="sidebar"
></div>
<script
  src="https://askmagicmike.com/embed/amm-loader.js"
  async
  defer
></script>`,
    note: "Paste into Appearance → Widgets → Custom HTML block.",
  },
  {
    id: "wordpress-block",
    label: "WordPress · Post / Page Block",
    sublabel: "Gutenberg → Custom HTML block",
    badge: "Gutenberg",
    badgeColor: "border-blue-400/25 bg-blue-400/[0.05] text-blue-300",
    snippet: `<div
  data-amm-widget="true"
  data-utm-source="wordpress"
  data-utm-medium="embed"
  data-utm-campaign="home-value"
  data-utm-content="post-body"
></div>
<script
  src="https://askmagicmike.com/embed/amm-loader.js"
  async
  defer
></script>`,
    note: "Add a Custom HTML block inside any post or page.",
  },
  {
    id: "generic-html",
    label: "Generic HTML · Any Page",
    sublabel: "Squarespace, Wix, raw HTML, landing page builder",
    badge: "HTML",
    badgeColor: "border-gold-400/25 bg-gold-400/[0.05] text-gold-300",
    snippet: `<div
  data-amm-widget="true"
  data-utm-source="website"
  data-utm-medium="embed"
  data-utm-campaign="home-value"
  data-utm-content="page-body"
></div>
<script
  src="https://askmagicmike.com/embed/amm-loader.js"
  async
  defer
></script>`,
    note: "Works in any HTML surface. Change utm_source and utm_content to match the placement.",
  },
];

// ─── Channel direct links ────────────────────────────────────────────────────

const CHANNEL_LINKS = [
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "border-blue-400/20 bg-blue-400/[0.04]",
    iconColor: "text-blue-400",
    url: "https://askmagicmike.com/?utm_source=facebook&utm_medium=social&utm_campaign=home-value",
    note: "Add to Facebook bio, post captions, or as a post link. FB-safe domain.",
  },
  {
    id: "instagram",
    label: "Instagram · Bio Link",
    icon: Instagram,
    color: "border-pink-400/20 bg-pink-400/[0.04]",
    iconColor: "text-pink-400",
    url: "https://askmagicmike.com/?utm_source=instagram&utm_medium=bio&utm_campaign=ask-mike",
    note: "Paste as your single Instagram bio link. Updates attribution for any click.",
  },
  {
    id: "email",
    label: "Email · Newsletter Button",
    icon: Mail,
    color: "border-amber-400/20 bg-amber-400/[0.04]",
    iconColor: "text-amber-400",
    url: "https://askmagicmike.com/ask?utm_source=email&utm_medium=newsletter&utm_campaign=home-value&chip=home_worth",
    note: "Use as the href for your primary email CTA button. Pre-selects home value chip.",
  },
  {
    id: "qr",
    label: "QR Code · Sign Rider / Flyer",
    icon: QrCode,
    color: "border-emerald-500/20 bg-emerald-500/[0.04]",
    iconColor: "text-emerald-400",
    url: "https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=home-value&utm_content=sign-rider",
    note: "Encode this URL into your QR code. Export as SVG for print. Change utm_content per placement.",
  },
  {
    id: "sms",
    label: "SMS / Text Blast",
    icon: MessageSquare,
    color: "border-emerald-400/20 bg-emerald-400/[0.04]",
    iconColor: "text-emerald-300",
    url: "https://askmagicmike.com/ask?utm_source=sms&utm_medium=text&utm_campaign=home-value&chip=home_worth",
    note: "Append to any outbound SMS. Short and trackable. Pair with a URL shortener if needed.",
  },
  {
    id: "open-house",
    label: "Open House QR",
    icon: QrCode,
    color: "border-ruby-400/20 bg-ruby-400/[0.04]",
    iconColor: "text-ruby-400",
    url: "https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=open-house&utm_content=flyer",
    note: "QR for open house flyers. Change utm_content to the property address slug.",
  },
];

// ─── Intent quick links ──────────────────────────────────────────────────────

const INTENT_LINKS = [
  {
    chip: "home_worth",
    label: "What's my home worth?",
    url: "https://askmagicmike.com/ask?chip=home_worth&q=What+is+my+home+worth+in+Wilson%2C+NC%3F&utm_source=direct&utm_medium=intent-link&utm_campaign=home-value",
  },
  {
    chip: "should_sell_now",
    label: "Should I sell now?",
    url: "https://askmagicmike.com/ask?chip=should_sell_now&q=Is+now+a+good+time+to+sell+my+home+in+Wilson%2C+NC%3F&utm_source=direct&utm_medium=intent-link&utm_campaign=sell-timing",
  },
  {
    chip: "tour_home",
    label: "I'd like to tour a home",
    url: "https://askmagicmike.com/ask?chip=tour_home&q=I+would+like+to+tour+homes+for+sale+in+Wilson+or+Eastern+NC&utm_source=direct&utm_medium=intent-link&utm_campaign=buyer-tour",
  },
  {
    chip: "what_can_afford",
    label: "What can I afford?",
    url: "https://askmagicmike.com/ask?chip=what_can_afford&q=What+price+range+can+I+realistically+afford+in+Wilson%2C+NC%3F&utm_source=direct&utm_medium=intent-link&utm_campaign=buyer-affordability",
  },
  {
    chip: "talk_to_mike",
    label: "Talk to Mike directly",
    url: "https://askmagicmike.com/ask?chip=talk_to_mike&q=I+would+like+to+talk+directly+with+Mike+Eatmon&utm_source=direct&utm_medium=intent-link&utm_campaign=direct-contact",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WidgetsPage() {
  return (
    <AdminShell
      title="Widget Distribution"
      eyebrow="Command Center · Embed · Channel Links · Intent Shortcuts"
      backHref="/admin"
      backLabel="← dashboard"
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">

        {/* ── Header callout ── */}
        <div className="rounded-xl border border-gold-400/[0.14] bg-gold-400/[0.04] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ boxShadow: "inset 0 1px 0 rgba(212,160,23,0.08)" }}
        >
          <div>
            <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-400/70 mb-1">
              Distribution Rules
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              All links use <code className="text-gold-300 text-xs">askmagicmike.com</code> — never{" "}
              <code className="text-ruby-300 text-xs">ourtownproperties.com</code> (Facebook preview will fail).
              Change <code className="text-slate-400 text-xs">utm_content</code> per placement.
              Never hardcode preview Vercel URLs.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/admin/distribution"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-400 hover:text-gold-300 hover:border-gold-400/20 transition-colors"
            >
              Distribution Analytics
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/marketing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold-400/20 bg-gold-400/[0.06] px-3 py-1.5 text-[11px] text-gold-300 hover:bg-gold-400/[0.10] transition-colors"
            >
              Campaign Assets
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* ── 1. Embed Widget Snippets ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Code2 className="h-4 w-4 text-gold-400/60 shrink-0" aria-hidden="true" />
            <AdminSectionHeading>Embed Widget Snippets</AdminSectionHeading>
          </div>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Copy the full snippet and paste into your HTML surface. The loader script injects a
            responsive iframe hosting the full intake flow. No additional dependencies.
          </p>
          <div className="space-y-4">
            {EMBED_SNIPPETS.map((s) => (
              <div key={s.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                    <p className="text-[12.5px] font-semibold text-slate-200">{s.label}</p>
                    <span className={`hidden sm:inline-block shrink-0 text-[9px] tracking-label uppercase border px-1.5 py-0.5 rounded font-semibold ${s.badgeColor}`}>
                      {s.badge}
                    </span>
                  </div>
                  <p className="hidden md:block text-[10.5px] text-slate-600 shrink-0">{s.sublabel}</p>
                </div>
                {/* Code block via CopyBlock */}
                <div className="px-5 py-4">
                  <CopyBlock
                    label="HTML Snippet"
                    content={s.snippet}
                    mono
                  />
                  <p className="mt-2.5 text-[11px] text-slate-600 leading-snug">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. Channel Direct Links ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Link2 className="h-4 w-4 text-gold-400/60 shrink-0" aria-hidden="true" />
            <AdminSectionHeading>Channel Direct Links</AdminSectionHeading>
          </div>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Pre-built UTM-tagged URLs for each distribution channel. Copy and paste into the native platform.
            This system never posts on your behalf.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CHANNEL_LINKS.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.id}
                  className={`rounded-2xl border p-5 ${c.color} relative overflow-hidden`}
                >
                  {/* Top rim */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" aria-hidden="true" />

                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`h-7 w-7 rounded-lg border border-white/[0.08] bg-white/[0.04] flex items-center justify-center ${c.iconColor}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <p className="text-[12px] font-semibold text-slate-200">{c.label}</p>
                  </div>

                  <CopyBlock
                    label="URL"
                    content={c.url}
                    mono
                  />

                  <p className="mt-2.5 text-[10.5px] text-slate-500 leading-snug">{c.note}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. Intent Quick Links ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Globe className="h-4 w-4 text-gold-400/60 shrink-0" aria-hidden="true" />
            <AdminSectionHeading>Intent Quick Links</AdminSectionHeading>
          </div>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Pre-filled intake URLs — each pre-selects an intent chip and populates the question field.
            Use these when you know the visitor intent (home value newsletter, buyer landing page, etc.).
            Replace <code className="text-slate-400">utm_source</code> before using.
          </p>
          <div className="space-y-3">
            {INTENT_LINKS.map((item) => (
              <div key={item.chip} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-slate-600 tracking-wider">{item.chip}</span>
                    <span className="h-3 w-px bg-white/[0.08] shrink-0" />
                    <p className="text-[12px] font-medium text-slate-300 truncate">{item.label}</p>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <CopyBlock
                    label="Pre-filled intent URL"
                    content={item.url}
                    mono
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Mobile / Responsive Notes ── */}
        <section>
          <AdminSectionHeading className="mb-4">Mobile &amp; Embed Notes</AdminSectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-400/60 mb-3">
                Embed Behavior
              </p>
              <ul className="space-y-2 text-[12px] text-slate-400 leading-relaxed">
                <li className="flex gap-2"><span className="text-gold-400/50 shrink-0">→</span> Responsive: adapts from 320px to full desktop</li>
                <li className="flex gap-2"><span className="text-gold-400/50 shrink-0">→</span> Min height 520px on mobile</li>
                <li className="flex gap-2"><span className="text-gold-400/50 shrink-0">→</span> No cookies, no cross-site storage</li>
                <li className="flex gap-2"><span className="text-gold-400/50 shrink-0">→</span> UTM params forwarded to intake automatically</li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-400/[0.14] bg-amber-400/[0.03] px-5 py-4">
              <p className="text-[10.5px] tracking-label uppercase font-semibold text-amber-400/60 mb-3">
                Before Publishing
              </p>
              <ul className="space-y-2 text-[12px] text-slate-400 leading-relaxed">
                <li className="flex gap-2"><span className="text-amber-400/50 shrink-0">!</span> Confirm production alias is live — run <code className="text-amber-300 text-[11px]">verify-production-alias.mjs</code></li>
                <li className="flex gap-2"><span className="text-amber-400/50 shrink-0">!</span> Never use a Vercel preview URL in embeds</li>
                <li className="flex gap-2"><span className="text-amber-400/50 shrink-0">!</span> Test on iOS Safari and Chrome Android before scaling</li>
                <li className="flex gap-2"><span className="text-amber-400/50 shrink-0">!</span> UTM source must be set — blank source loses attribution</li>
              </ul>
            </div>
          </div>
        </section>

        <p className="text-[11px] text-slate-700 text-center pt-4">
          Widget Distribution · Ask Magic Mike · Our Town Properties, Inc. · Wilson, NC · Read-only
        </p>
      </main>
    </AdminShell>
  );
}
