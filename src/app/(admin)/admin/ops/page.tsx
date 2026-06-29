export const dynamic  = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import {
  AlertTriangle, Phone, Mail, Tag, Users, ArrowRight,
  CheckCircle2, Activity,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { buildOpsQueue, groupOpsQueue } from "@/lib/admin/ops-queue";
import type { OpsQueueItem } from "@/lib/admin/ops-queue";

function temperatureDot(temp: string | null) {
  const map: Record<string, string> = {
    urgent: "bg-ruby-400",
    hot:    "bg-gold-400",
    warm:   "bg-amber-400",
    nurture: "bg-slate-500",
    low:    "bg-slate-700",
  };
  const cls = temp ? (map[temp] ?? "bg-slate-700") : "bg-slate-700";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${cls} shrink-0`}
      aria-label={temp ?? "unknown temperature"}
    />
  );
}

function urgencyBadge(label: string, priority: number) {
  const cls =
    priority === 1
      ? "bg-ruby-400/[0.12] text-ruby-300 border-ruby-400/25"
      : priority === 2
      ? "bg-gold-400/[0.12] text-gold-300 border-gold-400/25"
      : priority === 3
      ? "bg-amber-400/[0.10] text-amber-300 border-amber-400/20"
      : "bg-slate-400/[0.07] text-slate-400 border-slate-400/15";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

function gradeBadge(grade: string | null) {
  if (!grade) return null;
  const cls =
    grade === "A+" || grade === "A"
      ? "text-gold-400 border-gold-400/20 bg-gold-400/[0.08]"
      : grade === "B"
      ? "text-amber-400 border-amber-400/15 bg-amber-400/[0.05]"
      : "text-slate-500 border-slate-500/15 bg-slate-500/[0.04]";
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[9px] font-bold ${cls}`}
    >
      {grade}
    </span>
  );
}

function OpsRow({ item }: { item: OpsQueueItem }) {
  return (
    <Link
      href={item.detailUrl}
      className="group flex items-center gap-3 border-b border-white/[0.03] px-4 py-3 hover:bg-white/[0.025] transition-colors"
    >
      {temperatureDot(item.temperature)}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
            {item.leadLabel}
          </span>
          {gradeBadge(item.grade)}
          {urgencyBadge(item.urgencyLabel, item.priority)}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {item.score !== null && (
            <span className="text-[10px] text-slate-600 tabular-nums">
              Score: <span className="text-slate-400">{item.score}</span>
            </span>
          )}
          {item.missingAttribution && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500/70">
              <Tag className="h-2.5 w-2.5" aria-hidden="true" />
              no attribution
            </span>
          )}
          {!item.hasEmail && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-600">
              <Mail className="h-2.5 w-2.5" aria-hidden="true" />
              no email
            </span>
          )}
          {!item.hasPhone && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-600">
              <Phone className="h-2.5 w-2.5" aria-hidden="true" />
              no phone
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {!item.assigned && (
          <span className="text-[9.5px] border border-slate-700/50 text-slate-600 rounded px-1.5 py-0.5">
            unassigned
          </span>
        )}
        <span className="text-[10px] text-slate-600 tabular-nums">{item.ageLabel}</span>
        <ArrowRight
          className="h-3.5 w-3.5 text-slate-700 group-hover:text-gold-400 transition-colors"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

function GroupHeader({
  label,
  count,
  priority,
}: {
  label: string;
  count: number;
  priority: number;
}) {
  const rimCls =
    priority === 1
      ? "via-ruby-400/30"
      : priority === 2
      ? "via-gold-400/30"
      : priority === 3
      ? "via-amber-400/25"
      : "via-slate-400/15";

  return (
    <div className="relative px-4 py-2 bg-white/[0.015] border-b border-white/[0.04]">
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${rimCls} to-transparent`}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-label text-slate-500">
          {label}
        </span>
        <span className="text-[9.5px] text-slate-700 tabular-nums">{count}</span>
      </div>
    </div>
  );
}

export default async function LeadOpsPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return (
      <AdminShell
        title="Lead Ops"
        eyebrow="Priority Queue"
        backHref="/admin"
        backLabel="← dashboard"
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md text-center px-6">
            <div className="mb-4 flex justify-center">
              <Activity className="h-10 w-10 text-slate-600" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-slate-300 mb-3">Ops Queue Unavailable</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Supabase is not configured. Set{" "}
              <code className="text-amber-400 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="text-amber-400 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              in your production environment.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { loadRevenueCommand } = await import("@/lib/admin/revenue-command");
  const { loadDashboardMetrics } = await import("@/lib/admin/dashboard-metrics");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;
  const [revenue, metrics] = await Promise.all([
    loadRevenueCommand(client),
    loadDashboardMetrics(),
  ]);

  const queueItems = buildOpsQueue(revenue.followUpQueue);
  const groups     = groupOpsQueue(queueItems);
  const synth      = revenue.syntheticResidues;

  const p1Count = queueItems.filter((i) => i.priority === 1).length;
  const p2Count = queueItems.filter((i) => i.priority === 2).length;

  return (
    <AdminShell
      title="Lead Ops"
      eyebrow="Priority Queue"
      backHref="/admin"
      backLabel="← dashboard"
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Top-line metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "In Queue",
              value: queueItems.length,
              color: "text-cream",
            },
            {
              label: "Immediate",
              value: p1Count,
              color: p1Count > 0 ? "text-ruby-300" : "text-cream",
            },
            {
              label: "High Priority",
              value: p2Count,
              color: p2Count > 0 ? "text-gold-300" : "text-cream",
            },
            {
              label: "SLA Overdue",
              value: metrics.totals.overdueSla,
              color: metrics.totals.overdueSla > 0 ? "text-ruby-300" : "text-cream",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
            >
              <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.1em]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Immediate-action alert ── */}
        {p1Count > 0 && (
          <div className="rounded-xl border border-ruby-400/30 bg-ruby-400/[0.04] px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-ruby-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] font-bold text-ruby-300">
              {p1Count} lead{p1Count !== 1 ? "s" : ""} need immediate action — respond now to avoid SLA breach
            </p>
          </div>
        )}

        {/* ── Priority queue ── */}
        <section aria-labelledby="queue-heading">
          <h2
            id="queue-heading"
            className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
          >
            Priority Action Queue
            <span className="ml-2 normal-case tracking-normal font-normal text-slate-700">
              · synthetic leads excluded
            </span>
          </h2>

          {queueItems.length === 0 ? (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-5 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400/30 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-slate-500">Queue is clear.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                No leads require priority action right now.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              {groups.map((group) => (
                <div key={group.priority} role="region" aria-label={group.label}>
                  <GroupHeader
                    label={group.label}
                    count={group.items.length}
                    priority={group.priority}
                  />
                  {group.items.map((item) => (
                    <OpsRow key={item.id} item={item} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Source snapshot ── */}
        {Object.keys(revenue.sourceAttribution.byReferrerType).length > 0 && (
          <section aria-labelledby="source-heading">
            <h2
              id="source-heading"
              className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
            >
              Source Performance Snapshot
            </h2>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(revenue.sourceAttribution.byReferrerType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => (
                    <div
                      key={source}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2"
                    >
                      <span className="font-bebas text-[18px] leading-none text-gold-400 tabular-nums">
                        {count}
                      </span>
                      <span className="text-[11px] text-slate-400 capitalize">{source}</span>
                    </div>
                  ))}
              </div>
              {revenue.funnelHealth.unattributed7d > 0 && (
                <p className="mt-3 text-[10.5px] text-amber-400/70 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {revenue.funnelHealth.unattributed7d} lead{revenue.funnelHealth.unattributed7d !== 1 ? "s" : ""} missing source attribution in the last 7 days
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Synthetic residues ── */}
        {synth.length > 0 && (
          <section aria-labelledby="synth-heading">
            <h2
              id="synth-heading"
              className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
            >
              Synthetic / Test Lead Residues
              <span className="ml-2 normal-case tracking-normal font-normal text-slate-700">
                · excluded from queue above
              </span>
            </h2>
            <div className="rounded-xl border border-slate-600/20 bg-white/[0.01] px-5 py-4">
              <div className="flex items-start gap-2 mb-3">
                <Users className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {synth.length} synthetic lead{synth.length !== 1 ? "s" : ""} detected by email pattern.
                  These are excluded from the priority queue and revenue forecast.
                  Clean up test leads in Supabase to keep the dashboard accurate.
                </p>
              </div>
              <div className="space-y-1">
                {synth.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-[10.5px] text-slate-600">
                    <span className="font-mono truncate max-w-[200px]">{s.email}</span>
                    <span className="text-slate-700">·</span>
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {synth.length > 10 && (
                  <p className="text-[10px] text-slate-700 pt-1">
                    + {synth.length - 10} more
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Quick links ── */}
        <div className="flex flex-wrap gap-3 pt-2">
          {[
            { href: "/admin/launch",  label: "Launch Control →" },
            { href: "/admin/leads",   label: "Leads Inbox →" },
            { href: "/admin/routing", label: "Agent Routing →" },
            { href: "/admin/revenue", label: "Revenue Dashboard →" },
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
          Lead Ops · Ask Magic Mike Admin · Our Town Properties, Inc. · Wilson, NC
        </p>
      </main>
    </AdminShell>
  );
}
