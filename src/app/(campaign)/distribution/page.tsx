import type { Metadata } from "next";
import Link from "next/link";
import { BrandShell } from "@/components/amm/brand-shell";
import { CopyBlock } from "@/components/admin/copy-block";
import { CopySnippet } from "@/components/ui/copy-snippet";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Partner Distribution — Embed Ask Magic Mike | Our Town Properties",
  description:
    "Embed Ask Magic Mike on any website, share it on Facebook, Instagram, email, or QR code. Copyable snippets and UTM-tracked campaign links for Wilson, NC real estate.",
  robots: { index: true, follow: true },
};

// ── Embed Snippet Copy Content ────────────────────────────────────────────────

const WORDPRESS_SIDEBAR_SNIPPET = `<!-- Ask Magic Mike — WordPress Sidebar Widget -->
<script async
  src="https://askmagicmike.com/embed/amm-loader.js"
  data-amm-widget="ask"
  data-amm-position="sidebar"
  data-amm-source="wordpress-sidebar"
  data-amm-campaign="widget"
></script>`;

const WORDPRESS_GUTENBERG_SNIPPET = `<!-- Ask Magic Mike — Gutenberg Custom HTML Block -->
<script async
  src="https://askmagicmike.com/embed/amm-loader.js"
  data-amm-widget="ask"
  data-amm-position="inline"
  data-amm-source="gutenberg"
  data-amm-campaign="widget"
></script>`;

const GENERIC_HTML_SNIPPET = `<!-- Ask Magic Mike — Generic HTML Embed -->
<script async
  src="https://askmagicmike.com/embed/amm-loader.js"
  data-amm-widget="ask"
  data-amm-source="website"
  data-amm-campaign="widget"
></script>`;

// ── Hero Trust Metrics ────────────────────────────────────────────────────────

const TRUST_METRICS = [
  { num: "2,500+", label: "deals closed" },
  { num: "30+", label: "years in Wilson" },
  { num: "6", label: "channels" },
  { num: "~3 min", label: "to deploy" },
] as const;

// ── Launch Paths ──────────────────────────────────────────────────────────────

const LAUNCH_PATHS = [
  {
    id: "widget",
    label: "Website Widget",
    anchor: "embed-snippets",
    accentClass: "bg-cyan-400/[0.08] border border-cyan-400/20 text-cyan-300",
    bestFor: "WordPress, any website, sidebar",
    description:
      "Embed the intake form directly. Prospects stay on your site — no redirect, no friction.",
    setup: "Under 5 minutes",
    ctaText: "Get embed code",
  },
  {
    id: "social",
    label: "Social & Email",
    anchor: "channel-links",
    accentClass: "bg-blue-400/[0.08] border border-blue-400/20 text-blue-300",
    bestFor: "Facebook, Instagram, email blast",
    description:
      "Share a UTM-tracked link. Works in bio links, posts, newsletters, and text campaigns.",
    setup: "Under 1 minute",
    ctaText: "Get channel links",
  },
  {
    id: "print",
    label: "QR / Print",
    anchor: "channel-links",
    accentClass: "bg-purple-400/[0.08] border border-purple-400/20 text-purple-300",
    bestFor: "Yard signs, open houses, mailers",
    description:
      "Drop the QR link into any free generator. Print on signs, flyers, and door hangers.",
    setup: "Under 2 minutes",
    ctaText: "Get QR links",
  },
] as const;

// ── Channel UTM Links ─────────────────────────────────────────────────────────

const CHANNELS = [
  {
    id: "facebook",
    label: "Facebook",
    description: "Post, ad, or bio link",
    color: "border-blue-500/25 bg-blue-500/[0.05]",
    icon: "📘",
    url: "https://askmagicmike.com/?utm_source=facebook&utm_medium=social&utm_campaign=distribution",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Bio link or story swipe-up",
    color: "border-pink-500/25 bg-pink-500/[0.05]",
    icon: "📸",
    url: "https://askmagicmike.com/?utm_source=instagram&utm_medium=bio&utm_campaign=distribution",
  },
  {
    id: "email",
    label: "Email",
    description: "Newsletter or drip campaign",
    color: "border-amber-500/25 bg-amber-500/[0.05]",
    icon: "✉️",
    url: "https://askmagicmike.com/?utm_source=email&utm_medium=newsletter&utm_campaign=distribution",
  },
  {
    id: "qr-sign-rider",
    label: "QR — Sign Rider",
    description: "For yard signs and sign riders",
    color: "border-purple-500/25 bg-purple-500/[0.05]",
    icon: "🏷️",
    url: "https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=sign-rider",
  },
  {
    id: "qr-open-house",
    label: "QR — Open House",
    description: "For open house signs and tables",
    color: "border-cyan-500/25 bg-cyan-500/[0.05]",
    icon: "🏠",
    url: "https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=open-house",
  },
  {
    id: "sms",
    label: "SMS / Text",
    description: "Text campaigns and replies",
    color: "border-green-500/25 bg-green-500/[0.05]",
    icon: "💬",
    url: "https://askmagicmike.com/?utm_source=sms&utm_medium=text&utm_campaign=distribution",
  },
] as const;

// ── How It Works Steps ────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    num: "01",
    label: "Visitor clicks your link or widget",
    body: "A prospect sees your Facebook post, Instagram bio, QR code, email, or embedded widget and clicks through to Ask Magic Mike.",
  },
  {
    num: "02",
    label: "They answer three quick questions",
    body: "The intake form captures their question, address, name, phone, and email in under 60 seconds. No account required.",
  },
  {
    num: "03",
    label: "Mike reviews and responds personally",
    body: "Mike Eatmon or the Our Town Properties team follows up by phone, text, or email — whichever the visitor prefers. No bots. No call centers.",
  },
] as const;

// ── UTM Param Reference ───────────────────────────────────────────────────────

const UTM_PARAMS = [
  { param: "utm_source", values: "facebook · instagram · email · qr · sms · website · wordpress", note: "Where the click originated" },
  { param: "utm_medium", values: "social · bio · newsletter · print · text · sidebar · inline", note: "Distribution method" },
  { param: "utm_campaign", values: "sign-rider · open-house · widget · distribution · listing-[MLSID]", note: "Campaign or context" },
  { param: "utm_content", values: "Any descriptive string — e.g. header · footer · cta-button", note: "A/B variant or placement" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

export default function DistributionPage() {
  return (
    <BrandShell>
      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-label uppercase text-gold-400/80 hover:text-gold-300 transition-colors">
          Ask Magic Mike
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="text-xs text-slate-400 hover:text-gold-300 transition-colors hidden sm:block"
          >
            Campaign Generator →
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
      <section className="relative px-5 py-12 text-center sm:px-8 sm:py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/[0.05] px-3.5 py-1.5 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400 motion-safe:animate-pulse" />
          <span className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400">
            Partner Distribution
          </span>
        </div>
        <h1 className="font-bebas text-4xl sm:text-5xl md:text-6xl tracking-tight text-cream mb-4">
          Embed Ask Magic Mike.{" "}
          <span className="text-gradient-gold">Everywhere.</span>
        </h1>
        <p className="max-w-xl mx-auto text-sm text-slate-400 leading-relaxed mb-6">
          Website widget, Facebook, Instagram, email, QR code, sign rider — every channel
          with UTM attribution built in. Mike reviews every lead personally.
        </p>

        {/* Trust metrics */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap mb-8">
          {TRUST_METRICS.map((m) => (
            <div key={m.label} className="text-center">
              <div className="font-bebas text-2xl sm:text-3xl text-gold-300 leading-tight">{m.num}</div>
              <div className="text-[9.5px] font-semibold uppercase tracking-label text-slate-600">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/ask"
            className="btn-gold-premium text-sm px-6 py-2.5"
          >
            Ask Mike a Question
          </Link>
          <Link
            href="/value"
            className="rounded-xl border border-white/[0.10] bg-white/[0.03] px-6 py-2.5 text-sm text-slate-300 hover:border-gold-400/20 hover:text-gold-300 transition-all"
          >
            Home Value Estimate
          </Link>
        </div>
      </section>

      {/* Launch Paths */}
      <section className="relative px-5 pb-10 sm:px-8" aria-label="Launch Paths">
        <div className="max-w-3xl mx-auto">
          <div className="gold-rule mb-8" />
          <p className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70 mb-1">
            Launch Paths
          </p>
          <h2 className="font-bebas text-2xl sm:text-3xl text-cream mb-6">
            Three ways to deploy Mike.
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {LAUNCH_PATHS.map((path) => (
              <a
                key={path.id}
                href={`#${path.anchor}`}
                className="group rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-4 block hover:border-gold-400/15 transition-all"
              >
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold mb-3 ${path.accentClass}`}>
                  {path.label}
                </span>
                <p className="text-sm font-semibold text-cream mb-1">{path.bestFor}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{path.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-600">
                    Setup: <span className="text-slate-500">{path.setup}</span>
                  </span>
                  <span className="text-[10.5px] text-gold-400/50 group-hover:text-gold-300 transition-colors">
                    {path.ctaText} →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Embed Snippets */}
      <section
        id="embed-snippets"
        className="relative px-5 pb-12 sm:px-8"
        aria-label="Embed Widget Snippets"
      >
        <div className="max-w-3xl mx-auto">
          <div className="gold-rule mb-8" />
          <p className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70 mb-1">
            Embed Widget Snippets
          </p>
          <h2 className="font-bebas text-2xl sm:text-3xl text-cream mb-2">
            Drop it on any site in 30 seconds.
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Copy the snippet for your platform. The script loads asynchronously — it
            will not slow your page. Always use{" "}
            <code className="text-gold-400/80 font-mono">askmagicmike.com</code>{" "}
            as the source — never use a Vercel preview URL in production embeds.
          </p>

          <div className="space-y-4">
            <div id="wordpress-sidebar">
              <CopyBlock
                label="WordPress Sidebar"
                sublabel="Appearance → Widgets → Custom HTML"
                content={WORDPRESS_SIDEBAR_SNIPPET}
                mono
              />
            </div>
            <CopyBlock
              label="WordPress Gutenberg Block"
              sublabel="Block editor → Custom HTML block"
              content={WORDPRESS_GUTENBERG_SNIPPET}
              mono
            />
            <CopyBlock
              label="Generic HTML / Any Platform"
              sublabel="Paste before </body> on any HTML page"
              content={GENERIC_HTML_SNIPPET}
              mono
            />
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              <strong className="text-amber-200">Before publishing:</strong> run{" "}
              <code className="font-mono">scripts/amm/verify-production-alias.mjs</code> to
              confirm the canonical URL is live. Never use a Vercel preview URL in embeds —
              preview deployments are ephemeral and will break your embed.
            </p>
          </div>
        </div>
      </section>

      {/* Channel Links */}
      <section
        id="channel-links"
        className="relative px-5 pb-12 sm:px-8"
        aria-label="Channel Direct Links"
      >
        <div className="max-w-3xl mx-auto">
          <div className="gold-rule mb-8" />
          <p className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70 mb-1">
            Channel Direct Links
          </p>
          <h2 className="font-bebas text-2xl sm:text-3xl text-cream mb-2">
            Every channel. Attribution included.
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            UTM-tagged links for each channel. Copy the link and paste it wherever it goes —
            Facebook post, Instagram bio, email CTA, or QR code generator.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHANNELS.map((ch) => (
              <div
                key={ch.id}
                id={ch.id}
                className={`rounded-xl border px-4 py-3 ${ch.color}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span aria-hidden="true">{ch.icon}</span>
                  <span className="text-sm font-semibold text-slate-200">{ch.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">{ch.description}</p>
                <CopySnippet value={ch.url} label={ch.url} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="relative px-5 pb-12 sm:px-8"
        aria-label="How Mike Reviews"
      >
        <div className="max-w-3xl mx-auto">
          <div className="gold-rule mb-8" />
          <p className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70 mb-1">
            How It Works
          </p>
          <h2 className="font-bebas text-2xl sm:text-3xl text-cream mb-6">
            Click → Question → Mike responds.
          </h2>

          <div className="space-y-4">
            {HOW_STEPS.map((step) => (
              <div key={step.num} className="flex gap-4">
                <div className="shrink-0 font-bebas text-3xl text-gold-400/30 leading-none w-10">
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-semibold text-cream mb-1">{step.label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ask Magic Mike never posts on your behalf, never automatically shares visitor
              information, and never contacts leads through automated channels. Mike Eatmon or
              the Our Town Properties team follows up personally.
            </p>
          </div>
        </div>
      </section>

      {/* UTM Attribution Reference */}
      <section
        id="attribution"
        className="relative px-5 pb-12 sm:px-8"
        aria-label="UTM Attribution Reference"
      >
        <div className="max-w-3xl mx-auto">
          <div className="gold-rule mb-8" />
          <p className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70 mb-1">
            UTM Source Attribution
          </p>
          <h2 className="font-bebas text-2xl sm:text-3xl text-cream mb-2">
            Know where every lead came from.
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            All distribution links include standard UTM parameters. Use these in your CRM
            or analytics dashboard to track which channel generates the most qualified leads.
          </p>

          <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70">
                    Parameter
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70">
                    Common Values
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70 hidden sm:table-cell">
                    Tracks
                  </th>
                </tr>
              </thead>
              <tbody>
                {UTM_PARAMS.map((row) => (
                  <tr key={row.param} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-2.5 font-mono text-gold-300/80">{row.param}</td>
                    <td className="px-4 py-2.5 text-slate-400">{row.values}</td>
                    <td className="px-4 py-2.5 text-slate-600 hidden sm:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section
        id="compliance"
        className="relative px-5 pb-12 sm:px-8"
        aria-label="Compliance and Disclosure"
      >
        <div className="max-w-3xl mx-auto">
          <div className="gold-rule mb-8" />
          <p className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70 mb-1">
            Compliance & Disclosure
          </p>
          <h2 className="font-bebas text-2xl sm:text-3xl text-cream mb-4">
            Use it right.
          </h2>

          <div className="space-y-2.5">
            {[
              "Always include the Equal Housing Opportunity mark on print materials.",
              "Do not promise specific sale outcomes, on-the-spot valuations, or AVM-generated estimates.",
              "Ask Magic Mike is an intake and follow-up tool — not an MLS search, AVM, or certified property assessment service.",
              "Mike Eatmon or the Our Town Properties team reviews every lead personally. Do not imply real-time automated responses.",
              "Embed scripts must always point to askmagicmike.com — never a Vercel preview-deployment URL.",
              "Our Town Properties, Inc. · Mike Eatmon, REALTOR® · Wilson, NC · Licensed NC real estate professional.",
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-gold-400/40 translate-y-1.5" aria-hidden="true" />
                <p className="text-[11px] text-slate-400 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative px-5 pb-16 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-gold-400/20 bg-gold-400/[0.04] px-6 py-8 text-center">
            <h2 className="font-bebas text-2xl sm:text-3xl text-cream mb-2">
              Ready to put Mike to work?
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Ask a question, get a home value estimate, or open the admin widget center.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/ask"
                className="btn-gold-premium text-sm px-6 py-2.5"
              >
                Ask Mike Anything
              </Link>
              <Link
                href="/value"
                className="rounded-xl border border-white/[0.10] bg-white/[0.03] px-6 py-2.5 text-sm text-slate-300 hover:border-gold-400/20 hover:text-gold-300 transition-all"
              >
                Home Value Estimate
              </Link>
              <Link
                href="/campaigns"
                className="rounded-xl border border-white/[0.10] bg-white/[0.03] px-6 py-2.5 text-sm text-slate-300 hover:border-gold-400/20 hover:text-gold-300 transition-all"
              >
                Campaign Generator →
              </Link>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05]">
              <p className="text-[10px] text-slate-600">
                Admin only:{" "}
                <Link href="/admin/widgets" className="underline hover:text-slate-500 transition-colors">
                  Open Widget Center
                </Link>
                {" · "}
                <Link href="/admin/distribution" className="underline hover:text-slate-500 transition-colors">
                  View Distribution Analytics
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Legal bar */}
      <div className="border-t border-white/[0.05] px-5 py-6 sm:px-8">
        <p className="text-center text-[10px] text-slate-700 leading-relaxed max-w-2xl mx-auto">
          Not an appraisal. Not an instant offer. Broker-reviewed guidance only.
          Our Town Properties, Inc. · Mike Eatmon, REALTOR® · Wilson, NC.
          Equal Housing Opportunity.{" "}
          <Link href="/" className="underline hover:text-slate-500 transition-colors">
            askmagicmike.com
          </Link>
          {" "}·{" "}
          <a href={siteConfig.parentBrandUrl} className="underline hover:text-slate-500 transition-colors">
            ourtownproperties.com
          </a>
        </p>
      </div>
    </BrandShell>
  );
}
