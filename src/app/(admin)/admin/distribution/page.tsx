export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { loadTrafficCommand } from "@/lib/admin/traffic-command";
import { buildDistributionCommand } from "@/lib/admin/distribution-command";
import { AdminShell } from "@/components/admin/admin-shell";

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const CARD  = "rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4";
const LABEL = "text-[10.5px] tracking-label uppercase text-slate-500 mb-1";
const BIG   = "font-bebas text-4xl leading-none text-cream";
const BIG_OK   = "font-bebas text-4xl leading-none text-emerald-400";
const BIG_WARN = "font-bebas text-4xl leading-none text-amber-400";

const STATUS_COLOR: Record<string, string> = {
  active:  "text-emerald-400",
  partial: "text-amber-400",
  empty:   "text-slate-500",
};

const POST_STATUS_BADGE: Record<string, string> = {
  high_priority: "bg-ruby-400/[0.12] text-ruby-300",
  ready:         "bg-emerald-500/15 text-emerald-300",
  monitor:       "bg-slate-700/20 text-slate-400",
};

const POST_STATUS_LABEL: Record<string, string> = {
  high_priority: "High Priority",
  ready:         "Ready",
  monitor:       "Monitor",
};

const HEALTH_LABEL: Record<string, string> = {
  active:  "Active",
  partial: "Partial",
  empty:   "Not Started",
};

const DAY_PLATFORM_COLOR: Record<string, string> = {
  Facebook:       "text-blue-300",
  Instagram:      "text-pink-300",
  LinkedIn:       "text-sky-300",
  Threads:        "text-slate-300",
  "X / Twitter":  "text-slate-400",
  Email:          "text-amber-300",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DistributionCommandPage() {
  let data: Awaited<ReturnType<typeof buildDistributionCommand>> | null = null;
  let locked = false;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();
    const trafficData = await loadTrafficCommand(client);
    data = buildDistributionCommand(trafficData);
  } catch {
    locked = true;
  }

  if (locked || !data) {
    return (
      <AdminShell title="Distribution" eyebrow="Command Center" backHref="/admin" backLabel="← dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md text-center px-6">
            <h2 className="text-xl font-bold text-ruby-400 mb-3">Distribution Data Unavailable</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Supabase is not configured. Set{" "}
              <code className="text-amber-400 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="text-amber-400 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in your environment.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  const d = data;

  return (
    <AdminShell
      title="Distribution"
      eyebrow="Command Center · What to publish · Where · When"
      backHref="/admin"
      backLabel="← dashboard"
      headerRight={
        <span className="text-[10px] text-slate-700 tabular-nums hidden sm:block">
          Generated: {d.generatedAt}
        </span>
      }
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ---------------------------------------------------------------- */}
        {/* 1. Publishing Command Center — counts                             */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            1 · Publishing Command Center
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Distribution health:{" "}
            <span className={`font-semibold ${STATUS_COLOR[d.distributionHealth]}`}>
              {HEALTH_LABEL[d.distributionHealth]}
            </span>
            {" "}— Platforms with attribution traffic inferred as published.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={CARD}>
              <div className={LABEL}>Draft Ideas</div>
              <div className={BIG}>{d.publishingCounts.draftIdeas}</div>
              <p className="text-[11px] text-slate-600 mt-1">evergreen templates</p>
            </div>
            <div className={CARD}>
              <div className={LABEL}>Ready to Publish</div>
              <div className={BIG_OK}>{d.publishingCounts.readyToPublish}</div>
              <p className="text-[11px] text-slate-600 mt-1">intent score ≥ 80</p>
            </div>
            <div className={CARD}>
              <div className={LABEL}>Published Platforms</div>
              <div className={d.publishingCounts.publishedPlatforms > 0 ? BIG_OK : BIG_WARN}>
                {d.publishingCounts.publishedPlatforms}
              </div>
              <p className="text-[11px] text-slate-600 mt-1">of 6 have attribution traffic</p>
            </div>
            <div className={CARD}>
              <div className={LABEL}>Needs Refresh</div>
              <div className={d.publishingCounts.needsRefresh > 0 ? BIG_WARN : BIG}>
                {d.publishingCounts.needsRefresh}
              </div>
              <p className="text-[11px] text-slate-600 mt-1">traffic but 0 leads</p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Platform Coverage Matrix                                       */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            2 · Platform Coverage Matrix
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            &ldquo;Published&rdquo; = attribution traffic detected (inferred). All platforms have draft templates available.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
            <table className="w-full text-[13px]">
              <thead className="bg-white/[0.03] text-[10px] tracking-label uppercase text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2">Platform</th>
                  <th className="text-center px-4 py-2">Drafted</th>
                  <th className="text-center px-4 py-2">Published</th>
                  <th className="text-right px-4 py-2">Traffic 7d</th>
                  <th className="text-right px-4 py-2">Leads</th>
                  <th className="text-center px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.platformCoverageMatrix.map((row) => (
                  <tr
                    key={row.platform}
                    className={`border-t border-white/[0.06] ${row.gap ? "bg-amber-400/[0.02]" : "hover:bg-white/[0.02]"}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-300">{row.platform}</td>
                    <td className="px-4 py-2.5 text-center text-[11px] text-emerald-400">✓</td>
                    <td className="px-4 py-2.5 text-center text-[11px]">
                      {row.hasPublishedContent
                        ? <span className="text-emerald-400">✓</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-cream">
                      {row.traffic7d > 0 ? row.traffic7d : <span className="text-slate-600">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.leads30d > 0
                        ? <span className="text-emerald-400 font-semibold">{row.leads30d}</span>
                        : <span className="text-slate-600">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.gap ? (
                        <span className="inline-block rounded-full bg-amber-400/15 text-amber-400 text-[10px] font-semibold px-2 py-0.5">
                          No Posts Yet
                        </span>
                      ) : (row.hasPublishedContent && row.leads30d === 0) ? (
                        <span className="inline-block rounded-full bg-slate-700/30 text-slate-400 text-[10px] font-semibold px-2 py-0.5">
                          Needs Refresh
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold px-2 py-0.5">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 3. Recommended Publishing Queue — Top 25                          */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            3 · Recommended Publishing Queue
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Ranked by intent score. No posting actions — copy content into the native platform editor.
          </p>
          <div className="space-y-2">
            {d.priorityQueue.map((post) => (
              <div
                key={post.rank}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="text-[10px] font-mono text-slate-600 mt-0.5 w-5 flex-shrink-0">
                    {post.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-cream">{post.title}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5 leading-snug">{post.hook}</p>
                    <p className="text-[11px] text-gold-300/80 mt-1 font-medium">{post.cta}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${POST_STATUS_BADGE[post.status]}`}>
                      {POST_STATUS_LABEL[post.status]}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">{post.intentScore}</span>
                    <span className="text-[10px] text-slate-500">→ {post.recommendedPlatform}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 4. Traffic → Lead Attribution by Platform                         */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            4 · Traffic → Lead Attribution
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Based on existing UTM source attribution. No new tracking.
          </p>

          {d.trafficByPlatform.length === 0 ? (
            <div className={CARD}>
              <p className="text-slate-500 text-sm">
                No attribution traffic yet. Post AMM links using tracked UTMs from the Traffic Command Center.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
              <table className="w-full text-[13px]">
                <thead className="bg-white/[0.03] text-[10px] tracking-label uppercase text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-2">Platform</th>
                    <th className="text-right px-4 py-2">Traffic 7d</th>
                    <th className="text-right px-4 py-2">Leads</th>
                    <th className="text-right px-4 py-2">Conv %</th>
                  </tr>
                </thead>
                <tbody>
                  {d.trafficByPlatform.map((row) => (
                    <tr key={row.platform} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-semibold text-slate-300">{row.platform}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-cream">
                        {row.traffic7d}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={row.leads30d > 0 ? "text-emerald-400 font-semibold" : "text-slate-600"}>
                          {row.leads30d}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={row.conversionPct !== null && row.conversionPct > 0 ? "text-emerald-400" : "text-slate-600"}>
                          {row.conversionPct !== null ? `${row.conversionPct}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 5. Stale Content Detector                                         */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            5 · Stale Content Detector
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Platforms with attribution traffic ≥ 3 but 0 leads captured.
          </p>

          {d.stalePlatforms.length === 0 ? (
            <div className={CARD}>
              <p className="text-slate-500 text-sm">
                {d.distributionHealth === "empty"
                  ? "No platforms have traffic yet — nothing to flag as stale."
                  : "No stale platforms detected. Active platforms are converting."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {d.stalePlatforms.map((item) => (
                <div key={item.platform} className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-400 font-bold flex-shrink-0 text-sm" role="img" aria-label="Warning">⚠</span>
                    <div>
                      <p className="text-sm font-semibold text-cream mb-0.5">{item.platform}</p>
                      <p className="text-[12px] text-slate-400">{item.reason}</p>
                      <p className="text-[11px] text-gold-300/70 mt-1 font-medium">
                        {item.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 6. Weekly Publishing Plan                                         */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            6 · Weekly Publishing Plan
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            One post per platform, Monday–Friday. Copy content from section 3. No outbound behavior.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {d.weeklyPublishingPlan.map((item) => (
              <div key={item.day} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-1">
                  {item.day}
                </div>
                <div className={`text-[11px] font-semibold mb-1 ${DAY_PLATFORM_COLOR[item.platform] ?? "text-slate-300"}`}>
                  {item.platform}
                </div>
                <p className="text-[11px] text-slate-300 leading-snug line-clamp-3" title={item.topic}>
                  {item.topic}
                </p>
                <p className="text-[10px] text-slate-600 mt-1 leading-snug">{item.goal}</p>
                <div className="mt-1.5 text-[9px] font-mono text-slate-700">
                  intent: {item.intentScore}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 7. Next Publishing Actions                                        */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">
            7 · Next Publishing Actions
          </h2>
          <div className="space-y-2">
            {d.nextPublishingActions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="flex-shrink-0 text-gold-400 font-bold text-sm mt-0.5">→</span>
                <span className="text-[12px] text-slate-300 leading-snug">{action}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 8. Executive Summary                                              */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">
            8 · Executive Summary
          </h2>
          <div className="rounded-xl border border-white/[0.09] bg-white/[0.02] px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-1">
                  What Happened
                </p>
                <p className="text-[12px] text-slate-300 leading-relaxed">
                  {d.executiveSummary.whatHappened}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-1">
                  What Worked
                </p>
                <p className="text-[12px] leading-relaxed">
                  {d.executiveSummary.whatWorked
                    ? <span className="text-emerald-400">{d.executiveSummary.whatWorked}</span>
                    : <span className="text-slate-600 italic">No attribution data yet.</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-1">
                  What Failed / Needs Attention
                </p>
                <p className="text-[12px] leading-relaxed">
                  {d.executiveSummary.whatFailed
                    ? <span className="text-amber-400">{d.executiveSummary.whatFailed}</span>
                    : <span className="text-slate-600 italic">Nothing flagged.</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-1">
                  Next Post
                </p>
                <p className="text-[12px] text-gold-300 leading-relaxed font-medium">
                  {d.executiveSummary.nextPost}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                            */}
        {/* ---------------------------------------------------------------- */}
        <p className="text-[11px] text-slate-700 text-center pt-4">
          Distribution Command Center · Our Town Properties, Inc. · Wilson, NC · Read-only
        </p>
      </main>
    </AdminShell>
  );
}
