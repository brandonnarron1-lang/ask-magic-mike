export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { LeadTable } from "@/components/admin/lead-table";
import { getLeadsForAdmin } from "@/lib/db/lead-repository";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";

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

        {/* Admin navigation links */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-gold-300 hover:border-gold-400/30 transition-colors"
          >
            Leads Inbox
          </Link>
          <Link
            href="/admin/revenue"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-gold-300 hover:border-gold-400/30 transition-colors"
          >
            Revenue Command Center
          </Link>
          <Link
            href="/admin/traffic"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-gold-300 hover:border-gold-400/30 transition-colors"
          >
            Traffic Command Center
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">
            Recent Leads <span className="text-slate-600 font-normal ml-1">· click a row to expand</span>
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
