export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Inbox, DollarSign, BarChart2, Share2, AlertCircle, CheckCircle2, Users, ArrowRight, Activity, Brain, Zap, TrendingUp, Home, FileText, Megaphone } from "lucide-react";
import { LeadTable } from "@/components/admin/lead-table";
import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";
import { getLeadsForAdmin } from "@/lib/db/lead-repository";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";

function timeSince(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LockedState() {
  return (
    <div className="min-h-screen bg-[#080806] flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-ruby-400/30 bg-ruby-400/[0.08]">
          <Activity className="h-6 w-6 text-ruby-400" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ruby-400 mb-3">Admin Unavailable</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          Supabase is not configured. Set{" "}
          <code className="text-amber-400 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-amber-400 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          in your production environment.
        </p>
        <p className="text-xs text-slate-600">Mock data is never shown in production.</p>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const [result, metrics, signals] = await Promise.all([
    getLeadsForAdmin(),
    loadDashboardMetrics(),
    loadIntelligenceSignals(),
  ]);

  if (result.mode === "locked") return <LockedState />;

  const leads   = result.leads;
  const devMode = result.mode === "dev";

  const counts = {
    total:    leads.length,
    urgent:   leads.filter((l) => l.temperature === "urgent").length,
    hot:      leads.filter((l) => l.temperature === "hot").length,
    breached: leads.filter((l) => l.slaBreached).length,
  };

  const ATTENTION_LIMIT = 5;
  const urgentLeads       = leads.filter((l) => l.temperature === "urgent");
  const breachedNotUrgent = leads.filter((l) => l.slaBreached && l.temperature !== "urgent");
  const attentionLeads    = [...urgentLeads, ...breachedNotUrgent].slice(0, ATTENTION_LIMIT);
  const attentionTotal    = urgentLeads.length + breachedNotUrgent.length;

  const pipelineFmt = signals.estimatedPipelineValue > 0
    ? `$${(signals.estimatedPipelineValue / 1_000).toFixed(0)}K`
    : "—";
  const slaScore = Math.round(signals.avgSlaComplianceRate * 100);

  return (
    <AdminShell
      title="Command Center"
      devMode={devMode}
      headerRight={
        <span className="hidden sm:block text-xs text-slate-500 tabular-nums">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      }
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Dev data warning */}
        {devMode && (
          <div className="rounded-xl border-2 border-amber-400/50 bg-amber-400/[0.07] px-5 py-4">
            <p className="text-sm font-bold text-amber-400 mb-1">DEV MODE — Sample Data Only</p>
            <p className="text-xs text-amber-300/70">
              This data is fabricated for development. Never shown in production.
              Connect Supabase (<code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code>) to see live leads.
            </p>
          </div>
        )}

        {/* ── Primary status grid ── */}
        <div>
          <AdminSectionHeading className="mb-3">Lead Intelligence</AdminSectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Leads",  value: counts.total,    color: "text-cream",     sub: "in system" },
              { label: "Urgent",       value: counts.urgent,   color: "text-ruby-400",  sub: "need action now" },
              { label: "Hot",          value: counts.hot,      color: "text-gold-400",  sub: "high intent" },
              { label: "SLA Breached", value: counts.breached, color: "text-ruby-400",  sub: "response overdue" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 hover:border-white/[0.12] transition-colors"
              >
                <div className={`font-bebas text-5xl leading-none ${s.color}`}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">{s.label}</div>
                <div className="text-[10.5px] text-slate-600 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Funnel conversion tiles ── */}
        {metrics.configured && (
          <div>
            <AdminSectionHeading className="mb-3">Funnel Health</AdminSectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "New Today",     value: metrics.totals.newToday,              color: "text-cream",       sub: "since midnight" },
                { label: "Contacted",     value: metrics.totals.contacted,             color: "text-emerald-400", sub: "reached" },
                { label: "Appt. Req.",    value: metrics.totals.appointmentsRequested, color: "text-gold-400",    sub: "scheduled" },
                { label: "Unassigned",    value: metrics.totals.unassigned,            color: "text-amber-400",   sub: "need routing" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-5 py-4">
                  <div className={`font-bebas text-5xl leading-none ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">{s.label}</div>
                  <div className="text-[10.5px] text-slate-600 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Attention strip ── */}
        {attentionTotal > 0 ? (
          <div className="rounded-xl border border-ruby-400/30 bg-ruby-400/[0.04]">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-ruby-400/15">
              <AlertCircle className="h-4 w-4 text-ruby-400 shrink-0" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-label text-ruby-400 flex-1">
                Action Required &middot; {attentionTotal} lead{attentionTotal !== 1 ? "s" : ""}
              </p>
              <Link href="/admin/leads" className="text-[10.5px] text-slate-400 hover:text-gold-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="p-3 space-y-1.5">
              {attentionLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5 hover:border-ruby-400/25 hover:bg-ruby-400/[0.05] transition-all duration-150 group"
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
                  <span className="text-sm font-medium text-cream flex-1 truncate group-hover:text-white transition-colors">
                    {lead.name}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0 tabular-nums">{timeSince(lead.createdAt)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-gold-400 transition-colors shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
            {attentionTotal > ATTENTION_LIMIT && (
              <div className="px-5 pb-3.5">
                <Link href="/admin/leads" className="text-xs text-slate-400 hover:text-gold-300 transition-colors">
                  + {attentionTotal - ATTENTION_LIMIT} more in Leads Inbox →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] px-5 py-3.5 flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-emerald-400">All clear</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">No urgent leads or SLA breaches right now</p>
            </div>
          </div>
        )}

        {/* ── Today's Operations ── */}
        {metrics.configured && (metrics.totals.followUpDue > 0 || metrics.totals.neverContacted > 0) && (
          <div>
            <AdminSectionHeading className="mb-3">Today&rsquo;s Operations</AdminSectionHeading>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.03] p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/admin/leads?filter=follow_up_due"
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.025] px-5 py-4 hover:border-amber-400/30 hover:bg-amber-400/[0.04] transition-all"
                >
                  <div className={`font-bebas text-4xl leading-none ${metrics.totals.followUpDue > 0 ? "text-amber-400" : "text-slate-600"}`}>
                    {metrics.totals.followUpDue}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">Follow-ups Due</div>
                  <div className="text-[10.5px] text-slate-600 mt-0.5">next_follow_up_at ≤ now</div>
                </Link>
                <Link
                  href="/admin/leads?filter=never_contacted"
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.025] px-5 py-4 hover:border-ruby-400/30 hover:bg-ruby-400/[0.04] transition-all"
                >
                  <div className={`font-bebas text-4xl leading-none ${metrics.totals.neverContacted > 0 ? "text-ruby-400" : "text-slate-600"}`}>
                    {metrics.totals.neverContacted}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">Never Contacted</div>
                  <div className="text-[10.5px] text-slate-600 mt-0.5">assigned &gt; 2h, no contact yet</div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Source attribution ── */}
        {metrics.configured && metrics.bySource.length > 0 && (
          <div>
            <AdminSectionHeading className="mb-3">Lead Source Attribution</AdminSectionHeading>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {metrics.bySource.map(({ source, count }) => (
                  <span
                    key={source}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1 text-xs"
                  >
                    <span className="font-bebas text-base leading-none text-gold-400 tabular-nums">{count}</span>
                    <span className="text-slate-400">{source}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Intelligence Pulse ── */}
        <div>
          <AdminSectionHeading className="mb-3">Intelligence Pulse · 7-Day Window</AdminSectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04]">
            {[
              { label: "Pipeline Value",     value: pipelineFmt,                                          color: "text-emerald-400" },
              { label: "Appts (7d)",         value: signals.appointmentsInWindow,                         color: "text-gold-400"    },
              { label: "SLA Compliance",     value: `${slaScore}%`,                                       color: slaScore >= 90 ? "text-emerald-400" : slaScore >= 75 ? "text-amber-400" : "text-ruby-400" },
              { label: "Active Campaigns",   value: signals.activeCampaigns,                              color: "text-cream"       },
            ].map((s) => (
              <div key={s.label} className="bg-[#0a0a0a] px-4 py-3 text-center">
                <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{s.label}</p>
                <p className={`font-bebas text-3xl leading-none ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <Link href="/admin/intelligence" className="text-[10px] text-slate-600 hover:text-gold-300 transition-colors">
              Full intelligence dashboard →
            </Link>
          </div>
        </div>

        {/* ── Command center navigation ── */}
        <div>
          <AdminSectionHeading className="mb-3">Command Centers</AdminSectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { href: "/admin/leads",        Icon: Inbox,      label: "Leads Inbox",       sub: "Inbox · filter · detail",        accent: "group-hover:border-gold-400/40 group-hover:text-gold-300" },
              { href: "/admin/routing",      Icon: Users,      label: "Agent Routing",     sub: "Roster · queue · SLA",           accent: "group-hover:border-amber-400/30 group-hover:text-amber-300" },
              { href: "/admin/revenue",      Icon: DollarSign, label: "Revenue",           sub: "Pipeline · sentinel · alerts",   accent: "group-hover:border-emerald-400/30 group-hover:text-emerald-300" },
              { href: "/admin/traffic",      Icon: BarChart2,  label: "Traffic",           sub: "UTM · sources · sessions",       accent: "group-hover:border-blue-400/30 group-hover:text-blue-300" },
              { href: "/admin/distribution", Icon: Share2,     label: "Distribution",      sub: "Queue · platforms · plan",       accent: "group-hover:border-purple-400/30 group-hover:text-purple-300" },
              { href: "/admin/intelligence", Icon: Brain,      label: "Intelligence",      sub: "Signals · predictions · memory", accent: "group-hover:border-gold-400/40 group-hover:text-gold-300" },
              { href: "/admin/automation",   Icon: Zap,        label: "Automation",        sub: "Workflows · queue · history",    accent: "group-hover:border-cyan-400/30 group-hover:text-cyan-300" },
              { href: "/admin/analytics",    Icon: TrendingUp, label: "Analytics",         sub: "Reports · campaigns · sources",  accent: "group-hover:border-indigo-400/30 group-hover:text-indigo-300" },
              { href: "/admin/listings",     Icon: Home,       label: "Listings",          sub: "Inventory · inquiries · import", accent: "group-hover:border-amber-400/30 group-hover:text-amber-300" },
              { href: "/admin/documents",    Icon: FileText,   label: "Documents",         sub: "CMA · packets · guides",         accent: "group-hover:border-slate-400/30 group-hover:text-slate-300" },
              { href: "/admin/marketing",    Icon: Megaphone,  label: "Marketing",         sub: "Content · campaigns · assets",   accent: "group-hover:border-pink-400/30 group-hover:text-pink-300" },
            ].map(({ href, Icon, label, sub, accent }) => (
              <Link
                key={href}
                href={href}
                className={`group flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-4 hover:bg-white/[0.035] transition-all duration-200 ${accent}`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-slate-500 group-hover:text-current transition-colors" aria-hidden="true" />
                  <ArrowRight className="h-3 w-3 text-slate-700 group-hover:text-current transition-colors" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-current transition-colors leading-none mb-1">
                    {label}
                  </p>
                  <p className="text-[10.5px] text-slate-600 leading-tight">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Recent leads ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <AdminSectionHeading>
              Recent Leads
              <span className="ml-2 font-normal normal-case tracking-normal text-slate-700">· click a row to expand</span>
            </AdminSectionHeading>
            <Link href="/admin/leads" className="text-xs text-slate-500 hover:text-gold-300 transition-colors">
              View all →
            </Link>
          </div>
          <LeadTable leads={leads} />
        </div>

        <p className="text-xs text-slate-700 text-center pb-4">
          Ask Magic Mike Admin · Our Town Properties, Inc. · Wilson, NC ·{" "}
          {devMode ? "Sample data — connect Supabase for live leads" : "Live data"}
        </p>
      </main>
    </AdminShell>
  );
}
