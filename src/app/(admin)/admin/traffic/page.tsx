export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { loadTrafficCommand } from "@/lib/admin/traffic-command";
import { buildWeeklyExecutiveReport } from "@/lib/admin/weekly-executive-report";
import { buildLaunchReadiness } from "@/lib/admin/traffic-launch-readiness";
import { buildUtmCopyBank } from "@/lib/admin/utm-link-builder";

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

const CARD = "rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4";
const CARD_WARN = "rounded-xl border border-amber-400/40 bg-amber-400/[0.05] px-5 py-4";
const CARD_OK   = "rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] px-5 py-4";
const LABEL = "text-[10.5px] tracking-label uppercase text-slate-500 mb-1";
const BIG   = "font-bebas text-4xl leading-none text-cream";
const BIG_WARN = "font-bebas text-4xl leading-none text-amber-400";
const BIG_OK   = "font-bebas text-4xl leading-none text-emerald-400";

const PLATFORM_COLORS: Record<string, string> = {
  Facebook:       "bg-blue-600/20 text-blue-300",
  Instagram:      "bg-pink-500/20 text-pink-300",
  Threads:        "bg-white/10 text-slate-300",
  LinkedIn:       "bg-sky-700/20 text-sky-300",
  "X / Twitter":  "bg-slate-600/20 text-slate-300",
  YouTube:        "bg-ruby-400/[0.14] text-ruby-300",
  Google:         "bg-emerald-600/20 text-emerald-300",
  Bing:           "bg-teal-600/20 text-teal-300",
  "Organic Search": "bg-emerald-600/15 text-emerald-300",
  Email:          "bg-amber-500/15 text-amber-300",
  Direct:         "bg-slate-600/15 text-slate-400",
  "QR Code":      "bg-purple-600/15 text-purple-300",
  "Website Widget": "bg-gold-400/15 text-gold-300",
  Referral:       "bg-indigo-500/15 text-indigo-300",
  Other:          "bg-slate-700/20 text-slate-500",
};

const INTENT_BADGE: Record<string, string> = {
  high:   "bg-ruby-400/[0.14] text-ruby-300",
  medium: "bg-amber-500/15 text-amber-300",
  low:    "bg-slate-700/20 text-slate-400",
};

const CATEGORY_LABEL: Record<string, string> = {
  home_value:    "Home Value",
  selling:       "Selling",
  buying:        "Buying",
  investing:     "Investing",
  cash_offer:    "Cash Offer",
  relocation:    "Relocation",
  market_timing: "Market Timing",
  financing:     "Financing",
  general:       "General",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TrafficCommandPage() {
  let data: Awaited<ReturnType<typeof loadTrafficCommand>> | null = null;
  let locked = false;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();
    data = await loadTrafficCommand(client);
  } catch {
    locked = true;
  }

  if (locked || !data) {
    return (
      <div className="min-h-screen bg-[#080806] flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <h1 className="text-xl font-bold text-ruby-400 mb-3">Traffic Command Unavailable</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Supabase is not configured. Set{" "}
            <code className="text-amber-400 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-amber-400 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in your environment.
          </p>
        </div>
      </div>
    );
  }

  const d = data;
  const report = buildWeeklyExecutiveReport(d);
  const launchReadiness = buildLaunchReadiness();
  const utmBank = buildUtmCopyBank();
  const { summary: s, sourceRollup, questionIntel, contentOpportunities, viralPosts, marketHeatmap } = d;
  const hasData = s.leads30d > 0 || s.sessions7d > 0;

  const convRateDisplay = s.conversionRate !== null ? `${s.conversionRate}%` : "—";
  const returningPct = s.sessions7d > 0
    ? `${Math.round((s.returning7d / s.sessions7d) * 100)}%`
    : "0%";

  return (
    <AdminShell
      title="Traffic Command Center"
      backHref="/admin"
      headerRight={
        <div className="flex items-center gap-3">
          <Link href="/admin/revenue" className="text-[10px] text-slate-500 hover:text-gold-300 transition-colors">revenue →</Link>
          <Link href="/admin/distribution" className="text-[10px] text-slate-500 hover:text-gold-300 transition-colors">distribution →</Link>
        </div>
      }
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ---------------------------------------------------------------- */}
        {/* A. Launch Readiness                                               */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">
            Launch Readiness
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* AMM Links */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] px-5 py-4">
              <div className="text-[10.5px] tracking-label uppercase text-slate-500 mb-1">AMM Links</div>
              <div className="font-bebas text-3xl leading-none text-emerald-400">Safe ✓</div>
              <p className="text-[11px] text-slate-500 mt-1">askmagicmike.com — post freely</p>
            </div>
            {/* OTP Facebook */}
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.05] px-5 py-4">
              <div className="text-[10.5px] tracking-label uppercase text-slate-500 mb-1">OTP Facebook Links</div>
              <div className="font-bebas text-3xl leading-none text-amber-400">
                {launchReadiness.otpFacebookLinksSafe ? "Clear ✓" : "Blocked ⚠"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {launchReadiness.otpFacebookLinksSafe
                  ? "ourtownproperties.com Facebook preview OK"
                  : "Pending Regency/host WAF whitelist"}
              </p>
            </div>
            {/* Primary posting domain */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className="text-[10.5px] tracking-label uppercase text-slate-500 mb-1">Post Here First</div>
              <div className="text-lg font-semibold text-cream mt-1 break-all">
                {launchReadiness.recommendedPrimaryPostingDomain}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">All platforms. All previews pass.</p>
            </div>
            {/* Social preview score */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className="text-[10.5px] tracking-label uppercase text-slate-500 mb-1">Social Preview Score</div>
              <div className="font-bebas text-3xl leading-none text-amber-400">40/42</div>
              <p className="text-[11px] text-slate-500 mt-1">AMM 3/3 ✓ · OTP Facebook 2 blocks</p>
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 mb-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">
              Launch Checklist
            </h3>
            <div className="space-y-2">
              {launchReadiness.launchChecklist.map((item) => (
                <div key={item.step} className="flex items-start gap-3 text-[12px]">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5
                    ${item.status === "done"    ? "bg-emerald-500/20 text-emerald-400"
                    : item.status === "blocked" ? "bg-amber-400/20 text-amber-400"
                    : "bg-slate-700/30 text-slate-500"}`}
                  >
                    {item.status === "done" ? "✓" : item.status === "blocked" ? "!" : "○"}
                  </span>
                  <div>
                    <span className={item.status === "done" ? "text-slate-400 line-through" : "text-slate-300"}>
                      {item.action}
                    </span>
                    {item.blockerNote && (
                      <p className="text-[11px] text-amber-400/70 mt-0.5">{item.blockerNote}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next best action */}
          <div className="rounded-xl border border-gold-400/20 bg-gold-400/[0.03] px-5 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-300/70">
              Next Action
            </span>
            <p className="text-[12px] text-slate-300 mt-1 leading-relaxed">
              {launchReadiness.nextBestAction}
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* B. UTM Copy Bank                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            UTM Copy Bank
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            {utmBank.disclaimer}
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
            <table className="w-full text-[12px]">
              <thead className="bg-white/[0.03] text-[10px] tracking-label uppercase text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2">Platform</th>
                  <th className="text-left px-4 py-2">Tracked URL — copy &amp; paste</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Placement Note</th>
                </tr>
              </thead>
              <tbody>
                {utmBank.links.map((link) => (
                  <tr key={link.platform} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-slate-300">{link.platformLabel}</span>
                      {link.safeToPostOnFacebook && (
                        <span className="ml-2 inline-block rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] px-1.5 py-0.5 font-semibold">FB SAFE</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-[11px] text-gold-300/80 break-all select-all">
                        {link.fullUrl}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-[11px] text-slate-500 max-w-xs">
                      {link.placementNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* C. Do Not Post Yet                                                */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            Do Not Post Yet — Facebook Blocked
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            {launchReadiness.blockerReason}
          </p>
          <div className="space-y-3">
            {launchReadiness.doNotPostList.map((item, i) => (
              <div key={i} className="rounded-xl border border-ruby-400/20 bg-ruby-400/[0.04] px-5 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 text-ruby-400 font-bold text-sm mt-0.5">✗</span>
                  <div>
                    <code className="text-[11px] font-mono text-ruby-300/80">{item.url}</code>
                    <span className="ml-2 text-[10px] text-slate-500 italic">on {item.platform}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-3">
            Resolution: Contact Regency / Liquid Web support. Request{" "}
            <code className="text-amber-400 text-[10px]">facebookexternalhit/1.1</code>{" "}
            be whitelisted in the cPanel WAF for{" "}
            <code className="text-amber-400 text-[10px]">ourtownproperties.com</code>.
            After confirmation, run{" "}
            <code className="text-amber-400 text-[10px]">pnpm run amm:verify:social-preview</code>{" "}
            to confirm 42/42.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* D. Empty-state guidance (no traffic data yet)                     */}
        {/* ---------------------------------------------------------------- */}
        {!hasData && (
          <section>
            <div className="rounded-xl border border-white/[0.09] bg-white/[0.02] px-6 py-8 text-center">
              <p className="text-xl font-semibold text-slate-400 mb-2">Waiting for Traffic</p>
              <p className="text-sm text-slate-500 mb-6 max-w-lg mx-auto leading-relaxed">
                No sessions or leads are recorded yet. The system is not broken — it is waiting for
                real visitors to arrive. Publish AMM links using the UTM Copy Bank above, then
                return here after clicks and leads start arriving.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                {[
                  {
                    step: "1",
                    label: "Publish AMM links",
                    body: "Use the UTM Copy Bank above to post tracked askmagicmike.com links on Facebook, Instagram, LinkedIn, Threads, and X.",
                  },
                  {
                    step: "2",
                    label: "Review attribution after clicks",
                    body: "Return to this page after your first post. Source attribution will populate as sessions and leads arrive.",
                  },
                  {
                    step: "3",
                    label: "Never create fake leads",
                    body: "Do not submit test leads to make charts look alive. Synthetic data corrupts attribution and the Revenue Command Center snapshot.",
                  },
                ].map((card) => (
                  <div key={card.step} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <div className="font-bebas text-2xl text-gold-400 mb-1">{card.step}</div>
                    <p className="text-[12px] font-semibold text-slate-300 mb-1">{card.label}</p>
                    <p className="text-[11px] text-slate-500 leading-snug">{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 0. Live Traffic KPIs                                              */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">
            0 · Live Traffic KPIs
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: "Sessions 24h",      value: s.sessions24h,   warn: false },
              { label: "Sessions 7d",       value: s.sessions7d,    warn: false },
              { label: "Leads 24h",         value: s.leads24h,      warn: false },
              { label: "Leads 7d",          value: s.leads7d,       warn: false },
              { label: "Conversion Rate",   value: convRateDisplay, warn: false, isText: true },
              { label: "Returning 7d",      value: returningPct,    warn: false, isText: true },
            ].map((item) => (
              <div key={item.label} className={CARD}>
                <div className={BIG}>{item.value}</div>
                <div className={LABEL + " mt-1"}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 1. Top Dimensions                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">
            1 · Top Dimensions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Top Source",       value: s.topSource       ?? "—" },
              { label: "Top Campaign",     value: s.topCampaign     ?? "—" },
              { label: "Top Landing Page", value: s.topLandingPage  ?? "—" },
              { label: "Top Question",     value: s.topQuestion     ?? "—" },
            ].map((item) => (
              <div key={item.label} className={CARD}>
                <div className={LABEL}>{item.label}</div>
                <p className="text-sm text-cream leading-snug line-clamp-2" title={item.value}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Source Attribution Rollup                                      */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            2 · Source Attribution Rollup
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Organic: {sourceRollup.organicCount} &middot; Paid: {sourceRollup.paidCount} &middot; Social: {sourceRollup.socialCount} &middot; Direct: {sourceRollup.directCount}
          </p>

          {sourceRollup.rows.length === 0 ? (
            <div className={CARD}>
              <p className="text-slate-500 text-sm">No attribution data yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
              <table className="w-full text-[13px]">
                <thead className="bg-white/[0.03] text-[10px] tracking-label uppercase text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-2">Platform</th>
                    <th className="text-left px-4 py-2">Raw Source</th>
                    <th className="text-right px-4 py-2">Count</th>
                    <th className="text-right px-4 py-2">Paid?</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceRollup.rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PLATFORM_COLORS[row.platform] ?? "bg-slate-700/20 text-slate-400"}`}>
                          {row.platform}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                        {row.rawSource ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-cream font-semibold">
                        {row.count}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.isPaid
                          ? <span className="text-[11px] text-amber-400 font-semibold">Paid</span>
                          : <span className="text-[11px] text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 3. Organic vs Paid Summary                                        */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">
            3 · Organic vs Paid &middot; Returning vs New
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={CARD}>
              <div className={LABEL}>Organic</div>
              <div className={BIG_OK}>{sourceRollup.organicCount}</div>
            </div>
            <div className={CARD}>
              <div className={LABEL}>Paid</div>
              <div className={BIG}>{sourceRollup.paidCount}</div>
            </div>
            <div className={CARD}>
              <div className={LABEL}>Social</div>
              <div className={BIG}>{sourceRollup.socialCount}</div>
            </div>
            <div className={CARD}>
              <div className={LABEL}>Widget (OTP)</div>
              <div className={s.widgetLeads7d > 0 ? BIG_OK : BIG}>
                {s.widgetLeads7d}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 4. Question Intelligence                                           */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            4 · Top Questions — Last 7 Days
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            {questionIntel.totalQuestionsAnalyzed} questions analyzed &middot; Top category: {questionIntel.topCategory ? CATEGORY_LABEL[questionIntel.topCategory] : "—"} &middot; High-intent: {questionIntel.highIntentCount}
          </p>

          {questionIntel.topQuestions.length === 0 ? (
            <div className={CARD}>
              <p className="text-slate-500 text-sm">No question data yet. Submit questions via the AMM funnel to see patterns.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
              <table className="w-full text-[13px]">
                <thead className="bg-white/[0.03] text-[10px] tracking-label uppercase text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-2">Question</th>
                    <th className="text-right px-4 py-2">Count</th>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-left px-4 py-2">Intent</th>
                    <th className="text-left px-4 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {questionIntel.topQuestions.map((q, i) => (
                    <tr key={i} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                      <td className="px-4 py-2 text-slate-300 max-w-sm">
                        <span className="line-clamp-2" title={q.text}>{q.text}</span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-cream font-semibold">
                        {q.count}
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-[11px] text-slate-400">
                          {CATEGORY_LABEL[q.category] ?? q.category}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${INTENT_BADGE[q.intent]}`}>
                          {q.intent}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-slate-600">
                        {q.source ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 5. Content Opportunity Engine                                      */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            5 · Content Opportunity Engine — Top 25
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Ranked by intent score. Sorted to match your top question category.
          </p>
          <div className="space-y-2">
            {contentOpportunities.slice(0, 25).map((opp) => (
              <div
                key={opp.rank}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="text-[10px] font-mono text-slate-600 mt-0.5 w-5 flex-shrink-0">
                    {opp.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-cream">{opp.title}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5 leading-snug">{opp.hook}</p>
                    <p className="text-[11px] text-gold-300/80 mt-1 font-medium">{opp.cta}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-600 font-mono">{opp.intentScore}</span>
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                      opp.intentScore >= 80 ? "bg-ruby-400/[0.12] text-ruby-300"
                      : opp.intentScore >= 60 ? "bg-amber-500/15 text-amber-300"
                      : "bg-slate-700/20 text-slate-500"
                    }`}>
                      {opp.intentScore >= 80 ? "high" : opp.intentScore >= 60 ? "med" : "low"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 6. Viral Post Builder                                             */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            6 · Viral Post Builder
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Generated from:{" "}
            <span className="text-slate-400 italic">
              &ldquo;{viralPosts.generatedFromQuestion ?? "top lead question"}&rdquo;
            </span>
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(
              [
                { key: "facebook", label: "Facebook", color: "text-blue-300" },
                { key: "linkedin", label: "LinkedIn", color: "text-sky-300" },
                { key: "threads",  label: "Threads",  color: "text-slate-300" },
                { key: "x",        label: "X / Twitter", color: "text-slate-400" },
              ] as const
            ).map(({ key, label, color }) => {
              const post = viralPosts[key];
              return (
                <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${color}`}>
                      {label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">
                      {post.characterCount} chars
                    </span>
                  </div>
                  <pre className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {post.body}
                  </pre>
                  {post.hashtags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {post.hashtags.map((tag) => (
                        <span key={tag} className="text-[10px] text-gold-300/60 font-mono">{tag}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-700 mt-2 italic">
                    Copy and paste into the native {label} editor. Do not post from this page.
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 7. Local Market Heatmap                                           */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            7 · Local Market Heatmap
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Segment breakdown by traffic source.
            Top segment: <span className="text-slate-400 capitalize">{marketHeatmap.topSegment?.replace("_", " ") ?? "—"}</span>
          </p>

          {/* Segment totals */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {(
              [
                { key: "buyers",     label: "Buyers",      color: BIG_OK },
                { key: "sellers",    label: "Sellers",     color: BIG },
                { key: "investors",  label: "Investors",   color: BIG },
                { key: "cash_buyers",label: "Cash Buyers", color: BIG_WARN },
                { key: "home_value", label: "Home Value",  color: BIG },
              ] as const
            ).map(({ key, label, color }) => (
              <div key={key} className={CARD}>
                <div className={LABEL}>{label}</div>
                <div className={color}>{marketHeatmap.bySegment[key]}</div>
              </div>
            ))}
          </div>

          {/* Cells table */}
          {marketHeatmap.cells.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
              <table className="w-full text-[13px]">
                <thead className="bg-white/[0.03] text-[10px] tracking-label uppercase text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-2">Platform</th>
                    <th className="text-left px-4 py-2">Segment</th>
                    <th className="text-right px-4 py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {marketHeatmap.cells.slice(0, 15).map((cell, i) => (
                    <tr key={i} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PLATFORM_COLORS[cell.platform] ?? "bg-slate-700/20 text-slate-400"}`}>
                          {cell.platform}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-400 capitalize">
                        {cell.segment.replace("_", " ")}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-cream">
                        {cell.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 8. Weekly Executive Report                                        */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            8 · Weekly Executive Report
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">Period: {report.periodLabel}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className={CARD}>
              <div className={LABEL}>Revenue Pipeline</div>
              <div className={BIG}>{report.revenue.highIntentLeads24h}</div>
              <p className="text-[11px] text-slate-500 mt-1">high-intent leads (last 24h)</p>
            </div>
            <div className={CARD}>
              <div className={LABEL}>Conversion Rate</div>
              <div className={BIG}>{report.revenue.conversionRate}</div>
              <p className="text-[11px] text-slate-500 mt-1">sessions → leads</p>
            </div>
            <div className={CARD}>
              <div className={LABEL}>Top Source</div>
              <div className="text-lg font-semibold text-cream mt-1">
                {report.revenue.topSource ?? "—"}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2">
              Recommendations ({report.recommendations.length})
            </h3>
            <div className="space-y-1.5">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-slate-300">
                  <span className="text-gold-400 mt-0.5 flex-shrink-0">•</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export text block */}
          <div className="rounded-xl border border-white/[0.06] bg-black/30 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2">
              Export Text — Copy to clipboard, paste into email / Slack / notes
            </p>
            <pre className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
              {report.exportText}
            </pre>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                            */}
        {/* ---------------------------------------------------------------- */}
        <p className="text-[11px] text-slate-700 text-center pt-4">
          Ask Magic Mike Traffic Command Center &middot; Our Town Properties, Inc. &middot; Wilson, NC &middot; Read-only view
        </p>
      </main>
    </AdminShell>
  );
}
