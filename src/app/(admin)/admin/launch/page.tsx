export const dynamic  = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import {
  Rocket, CheckCircle2, AlertTriangle, XCircle,
  ArrowRight, Ban,
} from "lucide-react";
import { loadLaunchControl } from "@/lib/admin/launch-control";
import type { DimensionStatus, LaunchVerdict, ReadinessDimension } from "@/lib/admin/launch-control";
import { AdminShell } from "@/components/admin/admin-shell";

function verdictStyle(v: LaunchVerdict) {
  if (v === "Go")
    return {
      ring: "border-emerald-400/35 bg-emerald-400/[0.07]",
      text: "text-emerald-300",
      rim:  "via-emerald-400/40",
    };
  if (v === "Go With Conditions")
    return {
      ring: "border-amber-400/35 bg-amber-400/[0.06]",
      text: "text-amber-300",
      rim:  "via-amber-400/40",
    };
  return {
    ring: "border-ruby-400/35 bg-ruby-400/[0.07]",
    text: "text-ruby-300",
    rim:  "via-ruby-400/40",
  };
}

function dimIcon(status: DimensionStatus) {
  if (status === "pass")
    return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />;
  if (status === "warn")
    return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />;
  return <XCircle className="h-4 w-4 text-ruby-400 shrink-0" aria-hidden="true" />;
}

function dimCardStyle(status: DimensionStatus) {
  if (status === "pass") return "border-white/[0.06] bg-white/[0.02]";
  if (status === "warn") return "border-amber-400/[0.18] bg-amber-400/[0.03]";
  return "border-ruby-400/[0.22] bg-ruby-400/[0.04]";
}

function DimensionCard({ dim }: { dim: ReadinessDimension }) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${dimCardStyle(dim.status)}`}>
      <div className="flex items-start gap-2.5 mb-2">
        {dimIcon(dim.status)}
        <span className="text-[11px] font-bold uppercase tracking-label text-slate-300 leading-tight">
          {dim.label}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{dim.detail}</p>
      {dim.ownerAction && (
        <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-white/[0.04]">
          <ArrowRight className="h-3 w-3 text-gold-400/70 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[10.5px] text-gold-400/80 leading-snug">{dim.ownerAction}</p>
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  step,
  action,
  status,
  blockerNote,
}: {
  step: number;
  action: string;
  status: "done" | "blocked" | "waiting";
  blockerNote?: string;
}) {
  const dotCls =
    status === "done"
      ? "bg-emerald-400"
      : status === "blocked"
      ? "bg-ruby-400"
      : "bg-slate-600";
  const textCls =
    status === "done"
      ? "text-slate-400"
      : status === "blocked"
      ? "text-ruby-300"
      : "text-slate-400";

  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] text-[9px] font-bold text-slate-500">
        {step}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-[11.5px] leading-snug ${textCls}`}>{action}</p>
        {blockerNote && (
          <p className="text-[10px] text-ruby-400/70 mt-0.5">{blockerNote}</p>
        )}
      </div>
      <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${dotCls}`} aria-label={status} />
    </li>
  );
}

export default async function LaunchControlPage() {
  const data = await loadLaunchControl();

  const vs = verdictStyle(data.verdict);
  const scoreColor =
    data.readinessScore >= 88
      ? "text-emerald-300"
      : data.readinessScore >= 63
      ? "text-amber-300"
      : "text-ruby-300";

  return (
    <AdminShell
      title="Launch Control"
      eyebrow="Campaign Readiness"
      backHref="/admin"
      backLabel="← dashboard"
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Verdict banner ── */}
        <div className={`relative overflow-hidden rounded-2xl border px-6 py-5 ${vs.ring}`}>
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${vs.rim} to-transparent`} aria-hidden="true" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-label text-slate-500 mb-1.5">
                Launch Verdict
              </p>
              <p className={`font-display text-3xl font-bold ${vs.text}`}>
                {data.verdict}
              </p>
              <p className="text-[11.5px] text-slate-500 mt-1.5 max-w-md leading-relaxed">
                {data.verdictReason}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className={`font-bebas text-6xl leading-none ${scoreColor}`}>
                {data.readinessScore}
              </div>
              <div className="text-[10px] uppercase tracking-label text-slate-600 mt-0.5">
                Readiness Score
              </div>
            </div>
          </div>
          <p className="mt-3 text-[9.5px] text-slate-700">
            Generated {new Date(data.generatedAt).toLocaleTimeString()} ·{" "}
            {data.configured ? "Live data" : "Supabase not configured — partial data"}
          </p>
        </div>

        {/* ── Dimensions grid ── */}
        <section aria-labelledby="dimensions-heading">
          <h2
            id="dimensions-heading"
            className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
          >
            Readiness Dimensions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.dimensions.map((dim) => (
              <DimensionCard key={dim.key} dim={dim} />
            ))}
          </div>
        </section>

        {/* ── Owner actions ── */}
        {data.ownerActions.length > 0 && (
          <section aria-labelledby="owner-actions-heading">
            <h2
              id="owner-actions-heading"
              className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
            >
              Owner Actions Required
            </h2>
            <div className="rounded-xl border border-gold-400/20 bg-gold-400/[0.03] px-5 py-4 space-y-2.5">
              <div className="absolute inset-x-0 top-0 h-px" aria-hidden="true" />
              {data.ownerActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-gold-400/25 bg-gold-400/10 text-[9px] font-bold text-gold-400 mt-px">
                    {i + 1}
                  </span>
                  <p className="text-[11.5px] text-slate-300 leading-snug">{action}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Data quality summary ── */}
        {data.reconciliation && (
          <section aria-labelledby="data-quality-heading">
            <h2
              id="data-quality-heading"
              className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
            >
              Data Quality Snapshot
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Real Leads (30d)",
                  value: data.reconciliation.realLeads,
                  color: "text-cream",
                },
                {
                  label: "Synthetic / Test",
                  value: data.reconciliation.syntheticLeads30d,
                  color: data.reconciliation.syntheticLeads30d > 0 ? "text-amber-400" : "text-slate-600",
                },
                {
                  label: "Widget Leads (7d)",
                  value: data.reconciliation.websiteWidgetLeads7d,
                  color: "text-gold-400",
                },
                {
                  label: "Unattributed (7d)",
                  value: data.reconciliation.unattributedLeads7d,
                  color: data.reconciliation.unattributedLeads7d > 0 ? "text-amber-400" : "text-cream",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
                >
                  <div className={`font-bebas text-3xl leading-none ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-600 mt-1 uppercase tracking-[0.1em]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            {data.reconciliation.warnings.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.03] px-4 py-3 space-y-1">
                {data.reconciliation.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-400/70 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-[10.5px] text-amber-300/80">{w}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Next best action ── */}
        <section
          aria-labelledby="nba-heading"
          className="rounded-xl border border-cyan-500/[0.14] bg-white/[0.01] px-5 py-4"
        >
          <div className="h-px bg-cyan-500/20 -mx-5 mb-4" aria-hidden="true" />
          <h2
            id="nba-heading"
            className="text-[10px] font-bold uppercase tracking-label text-cyan-400/60 mb-2"
          >
            Recommended Next Action
          </h2>
          <p className="text-[12px] text-slate-300 leading-relaxed">{data.nextBestAction}</p>
          <p className="mt-2 text-[10px] text-slate-600">
            Social preview score: {data.socialPreviewScore}
          </p>
        </section>

        {/* ── Traffic checklist ── */}
        <section aria-labelledby="checklist-heading">
          <h2
            id="checklist-heading"
            className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
          >
            Launch Checklist
          </h2>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-1">
            <ul role="list" className="divide-y divide-white/[0.03]">
              {data.trafficChecklist.map((item) => (
                <ChecklistRow
                  key={item.step}
                  step={item.step}
                  action={item.action}
                  status={item.status}
                  blockerNote={item.blockerNote}
                />
              ))}
            </ul>
          </div>
          <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Done
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ruby-400" />Blocked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />Waiting
            </span>
          </div>
        </section>

        {/* ── Do-not-post list ── */}
        {data.doNotPostList.length > 0 && (
          <section aria-labelledby="dnp-heading">
            <h2
              id="dnp-heading"
              className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
            >
              Do Not Post
            </h2>
            <div className="rounded-xl border border-ruby-400/18 bg-ruby-400/[0.02] overflow-hidden">
              {data.doNotPostList.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-5 py-3.5 border-b border-ruby-400/[0.08] last:border-0"
                >
                  <Ban className="h-3.5 w-3.5 text-ruby-400/70 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-ruby-300/90 truncate">
                      {entry.platform} — {entry.url}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{entry.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Quick links ── */}
        <div className="flex flex-wrap gap-3 pt-2">
          {[
            { href: "/admin/ops",        label: "Lead Ops Queue →" },
            { href: "/admin/routing",    label: "Agent Routing →" },
            { href: "/admin/traffic",    label: "Traffic Command →" },
            { href: "/admin/revenue",    label: "Revenue Dashboard →" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[11px] text-slate-500 hover:text-gold-300 transition-colors border border-white/[0.06] rounded-lg px-3.5 py-2 hover:border-gold-400/25"
            >
              {label}
            </Link>
          ))}
        </div>

        <p className="text-[10px] text-slate-700 text-center pb-4">
          Launch Control · Ask Magic Mike Admin · Our Town Properties, Inc. · Wilson, NC
        </p>
      </main>
    </AdminShell>
  );
}
