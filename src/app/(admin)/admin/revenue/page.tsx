export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { loadRevenueCommand } from "@/lib/admin/revenue-command";
import { buildRevenueSentinel } from "@/lib/admin/revenue-sentinel";
import type { SentinelSeverity } from "@/lib/admin/revenue-sentinel";
import { buildLeadSourceReconciliation } from "@/lib/admin/lead-source-reconciliation";

export default async function RevenueCommandPage() {
  // createAdminClient throws when env vars are absent — we wrap in try/catch
  // and render a locked state (same pattern as admin dashboard).
  let data: Awaited<ReturnType<typeof loadRevenueCommand>> | null = null;
  let locked = false;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();
    data = await loadRevenueCommand(client);
  } catch {
    locked = true;
  }

  if (locked || !data) {
    return (
      <div className="min-h-screen bg-[#080806] flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <h1 className="text-xl font-bold text-ruby-400 mb-3">Admin Unavailable</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Supabase is not configured. Set{" "}
            <code className="text-amber-400 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-amber-400 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            in your environment.
          </p>
        </div>
      </div>
    );
  }

  const d = data;
  const sentinel = buildRevenueSentinel(d);
  const reconciliation = buildLeadSourceReconciliation(d);

  const STATUS_STYLES: Record<SentinelSeverity, { pill: string; label: string }> = {
    ok:       { pill: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25", label: "All clear" },
    info:     { pill: "bg-blue-500/15 text-blue-400 border border-blue-500/25",         label: "Info" },
    warning:  { pill: "bg-amber-400/15 text-amber-400 border border-amber-400/30",      label: "Needs attention" },
    critical: { pill: "bg-ruby-400/[0.12] text-ruby-400 border border-ruby-400/25",     label: "Critical" },
  };

  const ALERT_BORDER: Record<SentinelSeverity, string> = {
    ok:       "border-white/[0.06]",
    info:     "border-blue-500/25 bg-blue-500/[0.04]",
    warning:  "border-amber-400/30 bg-amber-400/[0.04]",
    critical: "border-ruby-400/30 bg-ruby-400/[0.04]",
  };

  const ALERT_ICON: Record<SentinelSeverity, string> = {
    ok: "✓", info: "ℹ", warning: "⚠", critical: "✕",
  };

  const PRIORITY_DOT: Record<string, string> = {
    urgent: "bg-ruby-400",
    high:   "bg-amber-400",
    normal: "bg-slate-500",
  };

  return (
    <div className="min-h-screen bg-[#080806] text-[#F4F4F4]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0D0B07] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-gold-300/85">
              Ask Magic Mike · Admin
            </p>
            <h1 className="font-display text-[22px] font-semibold text-[#F4F4F4]">
              Revenue Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Lead source, qualification, and follow-up visibility for Ask Magic Mike.
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Read-only. No outbound messaging is sent from this page.
            </p>
            <p className="text-[11px] text-slate-700 mt-1">
              Generated at:{" "}
              <span className="text-slate-500">{d.generatedAt}</span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link href="/admin/traffic" className="hover:text-gold-300">traffic</Link>
            <Link href="/admin" className="hover:text-gold-300">
              &larr; dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ------------------------------------------------------------------ */}
        {/* Today Action Board                                                   */}
        {/* ------------------------------------------------------------------ */}
        <section>
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Today Action Board
            </h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[sentinel.overallStatus].pill}`}>
              <span>{ALERT_ICON[sentinel.overallStatus]}</span>
              {STATUS_STYLES[sentinel.overallStatus].label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-5 -mt-2">
            What needs attention now, based on lead source, urgency, routing, and attribution health. Read-only. No outbound messaging is sent from this page.
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Actions",         value: sentinel.summary.actionCount,        warn: sentinel.summary.actionCount > 0,       positive: false },
              { label: "Critical",        value: sentinel.summary.criticalCount,      warn: sentinel.summary.criticalCount > 0,     positive: false },
              { label: "Warnings",        value: sentinel.summary.warningCount,       warn: sentinel.summary.warningCount > 0,      positive: false },
              { label: "High Intent 24 h",value: sentinel.summary.highIntent24h,      warn: sentinel.summary.highIntent24h > 0,     positive: true  },
              { label: "WP Attr 24 h",   value: sentinel.summary.wordpressWidget24h, warn: sentinel.summary.wordpressWidget24h === 0, positive: false },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border px-4 py-3 ${
                  s.warn && !s.positive ? "border-amber-400/40 bg-amber-400/[0.05]"
                  : s.warn && s.positive ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className={`font-bebas text-3xl leading-none ${
                  s.warn && !s.positive ? "text-amber-400"
                  : s.warn && s.positive ? "text-emerald-400"
                  : "text-[#F4F4F4]"
                }`}>
                  {s.value}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.1em]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Today action list */}
          {sentinel.todayActions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">
                Action Items ({sentinel.todayActions.length})
              </h3>
              <div className="space-y-2">
                {sentinel.todayActions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${PRIORITY_DOT[item.priority] ?? "bg-slate-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[#F4F4F4]">{item.title}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                          item.priority === "urgent" ? "text-ruby-400"
                          : item.priority === "high" ? "text-amber-400"
                          : "text-slate-500"
                        }`}>{item.priority}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.reason}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 italic">{item.action}</p>
                      {item.leadDetailHref && (
                        <Link
                          href={item.leadDetailHref}
                          className="mt-1 inline-block text-[11px] text-gold-400/80 hover:text-gold-300 underline underline-offset-2"
                        >
                          View lead →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentinel alerts */}
          {sentinel.alerts.length > 0 && (
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">
                Alerts ({sentinel.alerts.length})
              </h3>
              <div className="space-y-2">
                {sentinel.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border px-4 py-3 ${ALERT_BORDER[alert.severity]}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-bold ${
                        alert.severity === "critical" ? "text-ruby-400"
                        : alert.severity === "warning"  ? "text-amber-400"
                        : alert.severity === "info"     ? "text-blue-400"
                        : "text-emerald-400"
                      }`}>
                        {ALERT_ICON[alert.severity]}
                      </span>
                      <span className="text-sm font-medium text-[#F4F4F4]">{alert.title}</span>
                      {alert.value !== undefined && (
                        <span className="ml-auto text-xs text-slate-500 font-mono">{alert.metric}: {alert.value}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{alert.message}</p>
                    <p className="text-[11px] text-slate-500 mt-1 italic">{alert.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sentinel.alerts.length === 0 && sentinel.todayActions.length === 0 && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] px-4 py-3">
              <span className="text-sm text-emerald-400">✓ No alerts. Funnel and attribution look healthy.</span>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Lead Source Reconciliation                                          */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
            Lead Source Reconciliation
          </h2>
          <p className="text-[11px] text-slate-600 mb-4">
            Supabase truth vs. snapshot &middot; synthetic/test leads excluded from follow-up and revenue queues &middot; snapshot window: last 30 d
          </p>

          {/* Data freshness */}
          <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border text-[11px] w-fit ${
            reconciliation.dataFreshnessStatus === "fresh"   ? "border-emerald-500/30 bg-emerald-500/[0.04] text-emerald-400"
            : reconciliation.dataFreshnessStatus === "stale" ? "border-amber-400/40 bg-amber-400/[0.05] text-amber-400"
            : "border-slate-600/40 bg-slate-800/20 text-slate-500"
          }`}>
            <span className="font-semibold">
              {reconciliation.dataFreshnessStatus === "fresh" ? "✓ Data fresh"
               : reconciliation.dataFreshnessStatus === "stale" ? "⚠ Snapshot stale"
               : "ℹ Freshness unknown"}
            </span>
            {reconciliation.stalenessMinutes !== null && (
              <span className="text-slate-500 font-mono">
                ({reconciliation.stalenessMinutes} min ago)
              </span>
            )}
          </div>

          {/* Real vs synthetic grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total Leads (30 d)",     value: reconciliation.totalLeads,          warn: false },
              { label: "Real Leads (30 d)",       value: reconciliation.realLeads,           warn: false, positive: reconciliation.realLeads > 0 },
              { label: "Synthetic / Test (all)",  value: reconciliation.syntheticLeads,      warn: reconciliation.syntheticLeads > 0 },
              { label: "Synthetic in 30 d",       value: reconciliation.syntheticLeads30d,   warn: reconciliation.syntheticLeads30d > 0 },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border px-4 py-3 ${
                  s.warn            ? "border-amber-400/40 bg-amber-400/[0.05]"
                  : s.positive      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className={`font-bebas text-3xl leading-none ${
                  s.warn       ? "text-amber-400"
                  : s.positive ? "text-emerald-400"
                  : "text-[#F4F4F4]"
                }`}>
                  {s.value}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.1em]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Attribution health */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Widget Leads 24 h",  value: reconciliation.websiteWidgetLeads24h, warn: false },
              { label: "Widget Leads 7 d",   value: reconciliation.websiteWidgetLeads7d,  warn: false },
              { label: "Unattributed 7 d",   value: reconciliation.unattributedLeads7d,   warn: reconciliation.unattributedLeads7d > 0 },
              { label: "WP-Attributed 7 d",  value: reconciliation.wordpressAttributedLeads7d, warn: false },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border px-4 py-3 ${
                  s.warn ? "border-amber-400/40 bg-amber-400/[0.05]" : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className={`font-bebas text-3xl leading-none ${s.warn ? "text-amber-400" : "text-[#F4F4F4]"}`}>
                  {s.value}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.1em]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: "Latest Lead (any)",     ts: reconciliation.latestLeadAt },
              { label: "Latest Real Lead",       ts: reconciliation.latestRealLeadAt },
              { label: "Latest Synthetic Lead",  ts: reconciliation.latestSyntheticLeadAt },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-[0.1em] mb-1">{s.label}</div>
                <div className="text-sm text-slate-300">
                  {s.ts ? new Date(s.ts).toLocaleString() : <span className="text-slate-600">None</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Reconciliation warnings */}
          {reconciliation.warnings.length > 0 && (
            <div className="space-y-2 mb-4">
              {reconciliation.warnings.map((w, i) => (
                <div key={i} className="rounded-lg border border-amber-400/30 bg-amber-400/[0.04] px-4 py-2.5 flex items-start gap-2">
                  <span className="text-amber-400 font-bold text-sm mt-0.5 flex-shrink-0">⚠</span>
                  <p className="text-[12px] text-slate-300 leading-relaxed">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Synthetic exclusion note */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 mb-4">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">Synthetic/test leads are excluded</span>{" "}
              from real follow-up and revenue action queues.
              They are flagged by email markers ({" "}
              <span className="font-mono text-slate-500 text-[10px]">qa+amm-</span>,{" "}
              <span className="font-mono text-slate-500 text-[10px]">@example.com</span>,{" "}
              <span className="font-mono text-slate-500 text-[10px]">amm-wordpress-smoke</span>,{" "}
              <span className="font-mono text-slate-500 text-[10px]">DO_NOT_CONTACT</span>{" "}
              ), kept for audit purposes, and never surfaced in the Action Priority Queue.
              Do not contact them.
            </p>
          </div>

          {/* Recommended next action */}
          <div className={`rounded-lg border px-4 py-3 ${
            reconciliation.dataFreshnessStatus === "stale" ? "border-amber-400/40 bg-amber-400/[0.04]"
            : reconciliation.recommendedNextAction.toLowerCase().includes("follow") ? "border-gold-400/30 bg-gold-400/[0.03]"
            : "border-emerald-500/20 bg-emerald-500/[0.03]"
          }`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
              Recommended Next Action
            </div>
            <p className="text-sm text-[#F4F4F4]">{reconciliation.recommendedNextAction}</p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Regency Pending — Social Preview Blocker Status                     */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            Social Preview Readiness &middot; External Blocker Status
          </h2>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 px-5 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 font-bold text-sm mt-0.5 flex-shrink-0">⚠</span>
              <div>
                <p className="text-[12px] font-semibold text-amber-300">
                  Facebook preview blocker: Pending host cPanel / ModSecurity whitelist
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  <span className="font-semibold text-slate-300">What&apos;s blocked:</span>{" "}
                  <code className="text-slate-400 text-[10px]">facebookexternalhit/1.1</code> returns HTTP 403 site-wide on ourtownproperties.com.
                  Diagnosed as a host-level cPanel ModSecurity rule — NOT a WordPress or .htaccess issue.
                  WordPress .htaccess is clean (verified via WP .htaccess Editor plugin).
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  <span className="font-semibold text-slate-300">Fix required:</span>{" "}
                  cPanel &rsaquo; Security &rsaquo; ModSecurity &rsaquo; find the rule firing on{" "}
                  <code className="text-[10px] text-slate-400">facebookexternalhit</code> in the
                  &ldquo;Hits List&rdquo;, then whitelist that rule ID for ourtownproperties.com, or
                  ask the host (Regency / Liquid Web) to allow facebookexternalhit and bare Mozilla/5.0.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { label: "AMM Funnel Links",        status: "safe",    detail: "UTM-tracked links verified via synthetic test lead" },
                { label: "OTP → AMM Social Links",  status: "pending", detail: "Wait for WAF whitelist before Facebook sharing" },
                { label: "Social Preview Score",    status: "partial", detail: "40/42 PASS (last verified 2026-06-23). Two FB 403s remain." },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg border px-3 py-2.5 ${
                  item.status === "safe"    ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : item.status === "pending" ? "border-amber-400/30 bg-amber-400/[0.04]"
                  : "border-blue-500/25 bg-blue-500/[0.04]"
                }`}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
                    {item.label}
                  </div>
                  <div className={`text-xs font-semibold mb-0.5 ${
                    item.status === "safe"    ? "text-emerald-400"
                    : item.status === "pending" ? "text-amber-400"
                    : "text-blue-300"
                  }`}>
                    {item.status === "safe" ? "✓ Safe" : item.status === "pending" ? "⚠ Pending" : "◑ Partial"}
                  </div>
                  <p className="text-[10.5px] text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>

            <p className="text-[10.5px] text-slate-600 italic">
              This card is read-only. It does not trigger any host actions. Contact the host administrator to apply the WAF whitelist.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 0. Executive Snapshot — What changed in the last 24h               */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            0 &middot; Executive Snapshot &mdash; Last 24 h
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "New Leads",            value: d.funnelHealth.leads24h,       warn: false },
              { label: "High Intent",          value: d.funnelHealth.highIntent24h,  warn: d.funnelHealth.highIntent24h > 0, positive: true },
              { label: "WordPress Attr (24 h)", value: d.funnelHealth.wordpressWidget24h, warn: false },
              { label: "Unattributed (7 d)",   value: d.funnelHealth.unattributed7d, warn: d.funnelHealth.unattributed7d > 0 },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border px-5 py-4 ${
                  s.warn && !s.positive ? "border-amber-400/40 bg-amber-400/[0.05]"
                  : s.warn && s.positive ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className={`font-bebas text-4xl leading-none ${
                  s.warn && !s.positive ? "text-amber-400"
                  : s.warn && s.positive ? "text-emerald-400"
                  : "text-[#F4F4F4]"
                }`}>
                  {s.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.1em]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 1. Funnel Health                                                     */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            1 &middot; Funnel Health
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Last 24 h",              value: d.funnelHealth.leads24h,          warn: false },
              { label: "Last 7 d",               value: d.funnelHealth.leads7d,           warn: false },
              { label: "Last 30 d",              value: d.funnelHealth.leads30d,          warn: false },
              { label: "Unattributed (7 d)",     value: d.funnelHealth.unattributed7d,    warn: d.funnelHealth.unattributed7d > 0 },
              { label: "WordPress Widget (7 d)", value: d.funnelHealth.wordpressWidget7d, warn: false },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border px-5 py-4 ${
                  s.warn
                    ? "border-amber-400/40 bg-amber-400/[0.05]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className={`font-bebas text-4xl leading-none ${s.warn ? "text-amber-400" : "text-[#F4F4F4]"}`}>
                  {s.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.1em]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 1b. Traffic Path Scorecard                                           */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            1b &middot; Traffic Path Scorecard
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
            <table className="w-full text-[13px]">
              <thead className="bg-white/[0.03] text-[10px] tracking-[0.14em] uppercase text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2">Path (utm_medium)</th>
                  <th className="text-right px-4 py-2">Leads 7d</th>
                  <th className="text-right px-4 py-2">Leads 30d</th>
                  <th className="text-right px-4 py-2">Avg Score</th>
                  <th className="text-right px-4 py-2">Hot/Urgent</th>
                  <th className="text-right px-4 py-2">Missing Attr</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["website_widget",    "Website Widget",    d.trafficPathScorecard.website_widget],
                  ["homepage_cta",      "Homepage CTA",      d.trafficPathScorecard.homepage_cta],
                  ["agent_profile_cta", "Agent Profile CTA", d.trafficPathScorecard.agent_profile_cta],
                  ["direct_unknown",    "Direct / Unknown",  d.trafficPathScorecard.direct_unknown],
                ] as const).map(([key, label, row]) => (
                  <tr key={key} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 font-mono text-[12px] text-gold-300/80">{label}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#F4F4F4]">{row.leads7d}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-300">{row.leads30d}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-300">
                      {row.avgScore !== null ? row.avgScore : <span className="text-slate-600">&mdash;</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.hotUrgentCount > 0
                        ? <span className="text-red-300 font-semibold">{row.hotUrgentCount}</span>
                        : <span className="text-slate-600">0</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.missingAttribution30d > 0
                        ? <span className="text-amber-400">{row.missingAttribution30d}</span>
                        : <span className="text-slate-600">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 2. Source Attribution                                                */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            2 &middot; Source Attribution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AttributionTable title="By Referrer Type" rows={d.sourceAttribution.byReferrerType} />
            <AttributionTable title="By UTM Source"    rows={d.sourceAttribution.byUtmSource} />
            <AttributionTable title="By UTM Medium"    rows={d.sourceAttribution.byUtmMedium} />
            <AttributionTable
              title="By Campaign"
              rows={d.sourceAttribution.byCampaign}
              highlightKey="website_widget"
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 3. Qualification                                                     */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            3 &middot; Qualification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Temperature */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">Temperature</p>
              {Object.keys(d.qualification.byTemperature).length === 0 ? (
                <p className="text-slate-500 text-sm">No data</p>
              ) : (
                <table className="w-full text-[13px]">
                  <tbody>
                    {Object.entries(d.qualification.byTemperature)
                      .sort((a, b) => b[1] - a[1])
                      .map(([temp, count]) => (
                        <tr key={temp} className="border-t border-white/[0.05]">
                          <td className="py-1 text-slate-300 capitalize">{temp}</td>
                          <td className="py-1 text-right tabular-nums text-[#F4F4F4] font-semibold">{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Score bands */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">Score Bands</p>
              <table className="w-full text-[13px]">
                <tbody>
                  {(Object.entries(d.qualification.byScoreBand) as [string, number][])
                    .map(([band, count]) => (
                      <tr key={band} className="border-t border-white/[0.05]">
                        <td className="py-1 text-slate-300">{band}</td>
                        <td className="py-1 text-right tabular-nums text-[#F4F4F4] font-semibold">{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Missing score */}
            <div className={`rounded-xl border px-5 py-4 ${d.qualification.missingScore > 0 ? "border-amber-400/30 bg-amber-400/[0.04]" : "border-white/[0.06] bg-white/[0.02]"}`}>
              <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">Missing Score</p>
              <div className={`font-bebas text-5xl leading-none ${d.qualification.missingScore > 0 ? "text-amber-400" : "text-[#F4F4F4]"}`}>
                {d.qualification.missingScore}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Leads with no composite score in lead_scores
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 4. Routing                                                           */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            4 &middot; Routing
          </h2>
          {d.routing === null ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 px-5 py-4">
              <p className="text-slate-400 text-sm">
                lead_routing table not available &mdash; this table is optional.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">Assigned</p>
                <div className="font-bebas text-5xl text-emerald-400">{d.routing.assigned}</div>
              </div>
              <div className={`rounded-xl border px-5 py-4 ${d.routing.unassigned > 0 ? "border-amber-400/30 bg-amber-400/[0.03]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">Unassigned</p>
                <div className={`font-bebas text-5xl ${d.routing.unassigned > 0 ? "text-amber-400" : "text-[#F4F4F4]"}`}>
                  {d.routing.unassigned}
                </div>
                {d.routing.oldestUnassignedAge && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Oldest: {new Date(d.routing.oldestUnassignedAge).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">Status Counts</p>
                <table className="w-full text-[13px]">
                  <tbody>
                    {Object.entries(d.routing.statusCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => (
                        <tr key={status} className="border-t border-white/[0.05]">
                          <td className="py-1 text-slate-300">{status}</td>
                          <td className="py-1 text-right tabular-nums text-[#F4F4F4] font-semibold">{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 5. Follow-Up Queue                                                   */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
            5 &middot; Action Priority Queue
          </h2>
          <p className="text-[11px] text-slate-600 mb-3">
            Top 20 non-synthetic leads &middot; sorted: urgent/hot → score desc → newest &middot; synthetic/test excluded
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
            <table className="w-full text-[13px]">
              <thead className="bg-white/[0.03] text-[10.5px] tracking-[0.16em] uppercase text-slate-300">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Phone</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Medium</th>
                  <th className="text-left px-3 py-2">Campaign</th>
                  <th className="text-left px-3 py-2">Score</th>
                  <th className="text-left px-3 py-2">Temp</th>
                  <th className="text-left px-3 py-2">Assigned</th>
                  <th className="text-left px-3 py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {d.followUpQueue.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-slate-400">
                      No leads in queue.
                    </td>
                  </tr>
                ) : (
                  d.followUpQueue.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-t border-white/[0.06] hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-2 text-slate-400 text-[12px] whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-[#F4F4F4]">
                        {lead.firstName ?? "(unnamed)"}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {lead.hasEmail ? "✓" : <span className="text-slate-600">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {lead.hasPhone ? "✓" : <span className="text-slate-600">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {lead.utmSource ?? <span className="text-slate-600">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-300 text-[12px] font-mono">
                        {lead.utmMedium ?? <span className="text-slate-600">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {lead.utmCampaign ? (
                          <span className={lead.utmCampaign === "website_widget" ? "text-gold-300 font-semibold" : ""}>
                            {lead.utmCampaign}
                          </span>
                        ) : (
                          <span className="text-slate-600">&mdash;</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300 tabular-nums">
                        {lead.score !== null ? lead.score : <span className="text-slate-600">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2">
                        {lead.temperature ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                            lead.temperature === "urgent" ? "bg-ruby-400/[0.14] text-ruby-300" :
                            lead.temperature === "hot"    ? "bg-gold-400/20 text-gold-300" :
                            lead.temperature === "warm"   ? "bg-amber-500/15 text-amber-300" :
                            "bg-white/[0.05] text-slate-400"
                          }`}>
                            {lead.temperature.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-600">&mdash;</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {lead.assigned ? (
                          <span className="text-emerald-400">&#10003;</span>
                        ) : (
                          <span className="text-amber-400">&#10007;</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={lead.leadDetailUrl}
                          className="text-gold-300 hover:underline text-[12px]"
                        >
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 5b. Integrity Warnings                                              */}
        {/* ------------------------------------------------------------------ */}
        {(d.attributionIntegrity.missingAttribution7d > 0 ||
          d.attributionIntegrity.missingReferrerType > 0 ||
          d.qualification.missingScore > 0 ||
          d.syntheticResidues.length > 0) && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
              5b &middot; Integrity Warnings
            </h2>
            <div className="space-y-2">
              {d.attributionIntegrity.missingAttribution7d > 0 && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-400/[0.04] px-4 py-3 flex items-start gap-3">
                  <span className="text-amber-400 font-bold text-sm mt-0.5">⚠</span>
                  <div>
                    <p className="text-amber-300 text-sm font-semibold">
                      {d.attributionIntegrity.missingAttribution7d} WordPress campaign lead{d.attributionIntegrity.missingAttribution7d === 1 ? "" : "s"} missing source_attribution (last 7 d)
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Leads without a source_attribution row cannot be tracked to their traffic source. Check amm-loader.js is loading on OTP pages.
                    </p>
                  </div>
                </div>
              )}
              {d.attributionIntegrity.missingReferrerType > 0 && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.03] px-4 py-3 flex items-start gap-3">
                  <span className="text-amber-400/70 font-bold text-sm mt-0.5">⚠</span>
                  <div>
                    <p className="text-amber-300/80 text-sm font-semibold">
                      {d.attributionIntegrity.missingReferrerType} source_attribution row{d.attributionIntegrity.missingReferrerType === 1 ? "" : "s"} missing referrer_type
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      referrer_type determines traffic category (direct/referral/paid). Missing values reduce Traffic Path Scorecard accuracy.
                    </p>
                  </div>
                </div>
              )}
              {d.qualification.missingScore > 0 && (
                <div className="rounded-lg border border-slate-600/40 bg-slate-800/20 px-4 py-3 flex items-start gap-3">
                  <span className="text-slate-400 font-bold text-sm mt-0.5">ℹ</span>
                  <div>
                    <p className="text-slate-300 text-sm font-semibold">
                      {d.qualification.missingScore} lead{d.qualification.missingScore === 1 ? "" : "s"} missing composite score
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Leads without a score cannot be prioritized in the action queue. Scoring runs asynchronously; recent leads may not be scored yet.
                    </p>
                  </div>
                </div>
              )}
              {d.syntheticResidues.length > 0 && (
                <div className="rounded-lg border border-ruby-400/30 bg-ruby-400/[0.04] px-4 py-3 flex items-start gap-3">
                  <span className="text-ruby-400 font-bold text-sm mt-0.5">✕</span>
                  <div>
                    <p className="text-ruby-300 text-sm font-semibold">
                      {d.syntheticResidues.length} synthetic/test lead{d.syntheticResidues.length === 1 ? "" : "s"} visible in production
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      These are excluded from the action queue. See Synthetic / Test Residue section below. Do not contact them.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 6. Attribution Integrity                                             */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            6 &middot; Attribution Integrity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <IntegrityCard
              label="Missing Attribution (7 d)"
              value={d.attributionIntegrity.missingAttribution7d}
              warn={d.attributionIntegrity.missingAttribution7d > 0}
            />
            <IntegrityCard
              label="Missing Referrer Type"
              value={d.attributionIntegrity.missingReferrerType}
              warn={d.attributionIntegrity.missingReferrerType > 0}
            />
            <IntegrityCard
              label="Website Widget Count (all)"
              value={d.attributionIntegrity.websiteWidgetCount}
              warn={false}
            />
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 col-span-full md:col-span-1">
              <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">Latest Attribution Row</p>
              <p className="text-sm text-slate-300">
                {d.attributionIntegrity.latestAttributionAt
                  ? new Date(d.attributionIntegrity.latestAttributionAt).toLocaleString()
                  : <span className="text-slate-600">None</span>}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 col-span-full md:col-span-1">
              <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">Latest Lead Created At</p>
              <p className="text-sm text-slate-300">
                {d.attributionIntegrity.latestLeadAt
                  ? new Date(d.attributionIntegrity.latestLeadAt).toLocaleString()
                  : <span className="text-slate-600">None</span>}
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 7. Synthetic / Test Residue                                          */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            7 &middot; Synthetic / Test Residue
          </h2>
          {d.syntheticResidues.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-5 py-4">
              <p className="text-emerald-400 text-sm font-medium">
                No synthetic residue detected.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                No test-marker emails found in the leads table.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.05] px-5 py-4">
              <p className="text-amber-400 text-sm font-bold mb-2">
                Warning: {d.syntheticResidues.length} synthetic / test lead
                {d.syntheticResidues.length === 1 ? "" : "s"} detected in production
              </p>
              <p className="text-[11px] text-slate-400 mb-3">
                These rows match synthetic-marker patterns and should NOT be in
                production. They are excluded from the follow-up queue above.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="text-[10px] tracking-[0.14em] uppercase text-slate-500">
                    <tr>
                      <th className="text-left py-1 pr-4">ID</th>
                      <th className="text-left py-1 pr-4">Email</th>
                      <th className="text-left py-1">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.syntheticResidues.map((r) => (
                      <tr key={r.id} className="border-t border-white/[0.06]">
                        <td className="py-1 pr-4 font-mono text-slate-400 text-[11px]">{r.id}</td>
                        <td className="py-1 pr-4 text-amber-300">{r.email}</td>
                        <td className="py-1 text-slate-500">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <p className="mt-6 text-[11px] text-slate-700 text-center">
          Ask Magic Mike Revenue Command Center &middot; Our Town Properties, Inc. &middot; Wilson, NC &middot; Read-only view
        </p>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper sub-components (server-component-safe)
// ---------------------------------------------------------------------------

function AttributionTable({
  title,
  rows,
  highlightKey,
}: {
  title: string;
  rows: Record<string, number>;
  highlightKey?: string;
}) {
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
      <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">{title}</p>
      {entries.length === 0 ? (
        <p className="text-slate-500 text-sm">No data</p>
      ) : (
        <table className="w-full text-[13px]">
          <tbody>
            {entries.map(([key, count]) => (
              <tr
                key={key}
                className={`border-t border-white/[0.05] ${
                  highlightKey && key === highlightKey ? "bg-gold-400/[0.06]" : ""
                }`}
              >
                <td className={`py-1 ${highlightKey && key === highlightKey ? "text-gold-300 font-semibold" : "text-slate-300"}`}>
                  {key}
                </td>
                <td className="py-1 text-right tabular-nums text-[#F4F4F4] font-semibold">
                  {count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function IntegrityCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        warn
          ? "border-amber-400/40 bg-amber-400/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <p className="text-[10.5px] tracking-[0.16em] uppercase text-slate-500 mb-2">{label}</p>
      <div
        className={`font-bebas text-4xl leading-none ${
          warn ? "text-amber-400" : "text-[#F4F4F4]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
