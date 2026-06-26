export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Inbox, DollarSign, BarChart2, Share2, AlertCircle, CheckCircle2 } from "lucide-react";
import { LeadTable } from "@/components/admin/lead-table";
import { getLeadsForAdmin } from "@/lib/db/lead-repository";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";

function timeSince(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AdminIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 60 60" fill="none">
      <rect x="2" y="2" width="56" height="56" rx="4" fill="#0A0A0A" stroke="#D4A017" strokeWidth="2"/>
      <path d="M30 8 C18 8 10 18 10 28 L10 50 L20 50 L20 36 L40 36 L40 50 L50 50 L50 28 C50 18 42 8 30 8Z"
        fill="none" stroke="#D4A017" strokeWidth="2.5"/>
      <rect x="23" y="36" width="14" height="14" rx="1" fill="none" stroke="#D4A017" strokeWidth="2"/>
    </svg>
  );
}

export default async function AdminPage() {
  const [result, metrics] = await Promise.all([
    getLeadsForAdmin(),
    loadDashboardMetrics(),
  ]);

  // Production without Supabase — show locked state, never show mock data
  if (result.mode === "locked") {
    return (
      <div className="min-h-screen bg-[#080806] flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="mb-6 flex justify-center">
            <AdminIcon />
          </div>
          <h1 className="text-xl font-bold text-ruby-400 mb-3">Admin Unavailable</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Supabase is not configured. Set{" "}
            <code className="text-amber-400 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-amber-400 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            in your production environment.
          </p>
          <p className="text-xs text-slate-600">
            Mock data is never shown in production.
          </p>
        </div>
      </div>
    );
  }

  const leads   = result.leads;
  const devMode = result.mode === "dev";

  const counts = {
    total:    leads.length,
    urgent:   leads.filter((l) => l.temperature === "urgent").length,
    hot:      leads.filter((l) => l.temperature === "hot").length,
    breached: leads.filter((l) => l.slaBreached).length,
  };

  const ATTENTION_LIMIT = 5;
  const urgentLeads = leads.filter((l) => l.temperature === "urgent");
  const breachedNotUrgent = leads.filter((l) => l.slaBreached && l.temperature !== "urgent");
  const attentionLeads = [...urgentLeads, ...breachedNotUrgent].slice(0, ATTENTION_LIMIT);
  const attentionTotal = urgentLeads.length + breachedNotUrgent.length;

  return (
    <div className="min-h-screen bg-[#080806] text-cream">
      <header className="border-b border-gold-400/10 bg-[#0D0B07] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdminIcon />
            <div>
              <div className="text-sm font-bold text-cream">Ask Magic Mike</div>
              <div className="text-[11px] text-slate-500">Lead Dashboard · Our Town Properties</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {devMode && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-amber-400 font-medium">
                Dev Mode — Sample Data
              </span>
            )}
            <span>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Dev storage warning banner */}
        {devMode && (
          <div className="mb-6 rounded-xl border-2 border-amber-400/60 bg-amber-400/10 px-5 py-4">
            <p className="text-sm font-bold text-amber-400 mb-1">
              DEV MOCK DATA — Supabase is not connected.
            </p>
            <p className="text-xs text-amber-300/70">
              This data is fabricated for development only. It is never shown in production.
              Connect Supabase (set <code>NEXT_PUBLIC_SUPABASE_URL</code> +{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code>) to see real leads.
            </p>
          </div>
        )}

        {/* Primary status tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Leads",  value: counts.total,    color: "text-cream" },
            { label: "Urgent",       value: counts.urgent,   color: "text-ruby-400" },
            { label: "Hot",          value: counts.hot,      color: "text-gold-400" },
            { label: "SLA Breached", value: counts.breached, color: "text-ruby-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.1em]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Attention Required — actionable lead routing strip */}
        {attentionTotal > 0 ? (
          <div className="mb-6 rounded-xl border border-ruby-400/30 bg-ruby-400/[0.04] p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-ruby-400 shrink-0" aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ruby-400">
                Attention Required &middot; {attentionTotal} lead{attentionTotal !== 1 ? "s" : ""} need{attentionTotal === 1 ? "s" : ""} action
              </p>
            </div>
            <div className="space-y-1.5">
              {attentionLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.025] px-3 py-2.5 hover:border-ruby-400/25 hover:bg-ruby-400/[0.04] transition-all duration-150 group"
                >
                  <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    lead.temperature === "urgent"
                      ? "bg-ruby-400/[0.14] text-ruby-300 border-ruby-400/30"
                      : lead.slaBreached
                      ? "bg-amber-400/10 text-amber-300 border-amber-400/25"
                      : "bg-gold-400/15 text-gold-300 border-gold-400/25"
                  }`}>
                    {lead.slaBreached && lead.temperature !== "urgent" ? "SLA" : lead.temperature}
                  </span>
                  <span className="text-[13px] font-medium text-[#F4F4F4] flex-1 truncate group-hover:text-white transition-colors">
                    {lead.name}
                  </span>
                  <span className="text-[11px] text-slate-500 shrink-0">{timeSince(lead.createdAt)}</span>
                  <span className="text-gold-400 text-[13px] shrink-0">→</span>
                </Link>
              ))}
            </div>
            {attentionTotal > ATTENTION_LIMIT && (
              <Link
                href="/admin/leads"
                className="mt-2.5 inline-block text-[11px] text-slate-400 hover:text-gold-300 transition-colors"
              >
                + {attentionTotal - ATTENTION_LIMIT} more in Leads Inbox →
              </Link>
            )}
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <p className="text-[12px] text-slate-400">All clear — no urgent leads or SLA breaches right now</p>
          </div>
        )}

        {/* Funnel conversion tiles — from dashboard-metrics */}
        {metrics.configured && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "New Today",     value: metrics.totals.newToday,             color: "text-cream" },
              { label: "Contacted",     value: metrics.totals.contacted,            color: "text-emerald-400" },
              { label: "Appt. Req.",    value: metrics.totals.appointmentsRequested, color: "text-gold-400" },
              { label: "Unassigned",    value: metrics.totals.unassigned,           color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-5 py-4">
                <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-slate-600 mt-1 uppercase tracking-[0.1em]">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Source / UTM breakdown */}
        {metrics.configured && metrics.bySource.length > 0 && (
          <div className="mb-8 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
              Leads by Source
            </h2>
            <div className="flex flex-wrap gap-2">
              {metrics.bySource.map(({ source, count }) => (
                <span
                  key={source}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-slate-300"
                >
                  <span className="font-medium text-gold-400">{count}</span>
                  <span className="text-slate-500">{source}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Command center navigation */}
        <div className="mb-7">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
            Command Centers
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/admin/leads",        Icon: Inbox,     label: "Leads Inbox",          sub: "Inbox · filter · detail" },
              { href: "/admin/revenue",      Icon: DollarSign, label: "Revenue",              sub: "Pipeline · sentinel · alerts" },
              { href: "/admin/traffic",      Icon: BarChart2,  label: "Traffic",              sub: "UTM · sources · sessions" },
              { href: "/admin/distribution", Icon: Share2,     label: "Distribution",         sub: "Queue · platforms · plan" },
            ].map(({ href, Icon, label, sub }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 hover:border-gold-400/30 hover:bg-gold-400/[0.03] transition-all duration-200"
              >
                <Icon className="h-4 w-4 text-slate-500 group-hover:text-gold-400 transition-colors" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-gold-300 transition-colors leading-none mb-0.5">
                    {label}
                  </p>
                  <p className="text-[10.5px] text-slate-600 leading-tight">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Recent Leads
            <span className="ml-2 font-normal normal-case tracking-normal text-slate-700">· click a row to expand</span>
          </h2>
        </div>

        <LeadTable leads={leads} />

        <p className="mt-6 text-[11px] text-slate-700 text-center">
          Ask Magic Mike Admin · Our Town Properties, Inc. · Wilson, NC ·{" "}
          {devMode ? "Sample data — connect Supabase to see live leads" : "Live data"}
        </p>
      </main>
    </div>
  );
}
