export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import {
  Inbox, DollarSign, BarChart2, Share2, AlertCircle, CheckCircle2,
  Users, ArrowRight, Activity, Brain, Zap, TrendingUp, Home, FileText,
  Megaphone, Clock, PhoneCall,
} from "lucide-react";
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
    <div className="min-h-screen bg-[#060604] flex items-center justify-center">
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

/* ── Glass metric tile ── */
function MetricTile({
  label,
  value,
  sub,
  accent = "neutral",
  pulse = false,
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "ruby" | "gold" | "emerald" | "amber" | "cyan" | "neutral";
  pulse?: boolean;
  href?: string;
}) {
  const styles = {
    ruby:    { wrap: "border-ruby-400/22 bg-[#0D0606]/75", rim: "via-ruby-400/35",   num: "text-ruby-300",   glow: "from-ruby-400/[0.06]"   },
    gold:    { wrap: "border-gold-400/22 bg-[#0D0A06]/75", rim: "via-gold-400/35",   num: "text-gold-300",   glow: "from-gold-400/[0.05]"   },
    emerald: { wrap: "border-emerald-500/18 bg-[#060D08]/75", rim: "via-emerald-400/25", num: "text-emerald-300", glow: "from-emerald-400/[0.05]" },
    amber:   { wrap: "border-amber-500/18 bg-[#0C0A06]/75", rim: "via-amber-400/30",  num: "text-amber-300",  glow: "from-amber-400/[0.05]"  },
    cyan:    { wrap: "border-cyan-500/18 bg-[#05090D]/75",  rim: "via-cyan-400/25",   num: "text-cyan-300",   glow: "from-cyan-400/[0.04]"   },
    neutral: { wrap: "border-white/[0.07] bg-[#0D0D0D]/60", rim: "via-white/[0.10]", num: "text-cream",      glow: "from-white/[0.02]"      },
  };
  const s = styles[accent];
  const inner = (
    <div className={`relative overflow-hidden rounded-xl border backdrop-blur-sm px-5 py-4.5 h-full transition-all duration-200 ${s.wrap} ${href ? "hover:border-opacity-50 hover:-translate-y-0.5 hover:shadow-z2 cursor-pointer" : ""}`}>
      {/* Top rim */}
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${s.rim} to-transparent`} />
      {/* Ambient fill */}
      <div className={`absolute inset-0 bg-gradient-to-br ${s.glow} to-transparent pointer-events-none`} />
      <div className="relative">
        <div className={`font-bebas text-5xl leading-none tracking-wide ${s.num}`}>{value}</div>
        <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400/80 mt-1.5">{label}</div>
        {sub && <div className="text-[9.5px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
      {pulse && (Number(value) > 0) && (
        <span
          className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: accent === "ruby" ? "rgba(193,39,45,0.9)" : "rgba(212,160,23,0.9)", boxShadow: `0 0 8px ${accent === "ruby" ? "rgba(193,39,45,0.6)" : "rgba(212,160,23,0.5)"}` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

/* ── Command Center nav tile ── */
function CenterTile({
  href,
  Icon,
  label,
  sub,
  iconColor,
}: {
  href: string;
  Icon: React.ElementType;
  label: string;
  sub: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0D0D0D]/50 backdrop-blur-[2px] px-4 py-4 transition-all duration-250 hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-z2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
    >
      {/* Top rim — reveals on hover */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-400/0 to-transparent transition-all duration-300 group-hover:via-gold-400/30" aria-hidden="true" />

      <div className="flex items-start justify-between mb-3">
        <div className={`h-8 w-8 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center transition-all duration-250 group-hover:border-opacity-60 group-hover:bg-opacity-50 ${iconColor}`}>
          <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-current transition-colors duration-200" aria-hidden="true" />
        </div>
        <ArrowRight className="h-3 w-3 text-slate-700 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" aria-hidden="true" />
      </div>

      <p className="text-[12.5px] font-semibold text-slate-200/90 leading-none mb-1.5 group-hover:text-white transition-colors">
        {label}
      </p>
      <p className="text-[10px] text-slate-600 leading-tight">{sub}</p>
    </Link>
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
  const slaAccent: "emerald" | "amber" | "ruby" =
    slaScore >= 90 ? "emerald" : slaScore >= 75 ? "amber" : "ruby";

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <AdminShell
      title="Command Center"
      devMode={devMode}
      headerRight={
        <span className="hidden lg:block text-[10px] text-slate-500 tabular-nums tracking-wider">
          {today}
        </span>
      }
    >
      <main className="max-w-7xl mx-auto px-6 py-7 space-y-7">

        {/* Dev data warning */}
        {devMode && (
          <div className="rounded-xl border-2 border-amber-400/40 bg-amber-400/[0.06] px-5 py-3.5">
            <p className="text-sm font-bold text-amber-400 mb-0.5">DEV MODE — Sample Data Only</p>
            <p className="text-xs text-amber-300/60">
              Fabricated data. Connect Supabase (
              <code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code>
              ) to see live leads.
            </p>
          </div>
        )}

        {/* ── Revenue / Pipeline overview ── */}
        {signals.estimatedPipelineValue > 0 && (
          <div>
            <AdminSectionHeading className="mb-3">Pipeline Overview</AdminSectionHeading>
            <div className="relative overflow-hidden rounded-2xl border border-gold-400/18 bg-[#0C0A06]/80 backdrop-blur-sm"
              style={{ boxShadow: "0 0 0 1px rgba(212,160,23,0.06), inset 0 1px 0 rgba(212,160,23,0.08)" }}>
              {/* Ambient gold glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold-400/[0.05] via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-400/45 to-transparent" />

              <div className="relative grid grid-cols-2 sm:grid-cols-4 divide-x divide-gold-400/[0.08]">
                {[
                  { label: "Pipeline Value", value: pipelineFmt, sub: "estimated 90d" },
                  { label: "Appointments", value: signals.appointmentsInWindow, sub: "last 7 days" },
                  { label: "SLA Compliance", value: `${slaScore}%`, sub: slaScore >= 90 ? "excellent" : slaScore >= 75 ? "needs attention" : "critical" },
                  { label: "Active Campaigns", value: signals.activeCampaigns, sub: "running now" },
                ].map((s, i) => (
                  <div key={s.label} className={`px-5 py-4 text-center ${i >= 2 ? "border-t border-gold-400/[0.08] sm:border-t-0" : ""}`}>
                    <div className="text-[8.5px] tracking-[0.18em] uppercase text-gold-400/45 mb-1 font-semibold">{s.label}</div>
                    <div className="font-bebas text-3xl leading-none text-gold-300 sm:text-4xl">{s.value}</div>
                    <div className="text-[9px] text-slate-600 mt-1">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="relative border-t border-gold-400/[0.07] px-5 py-2.5 flex items-center justify-between">
                <p className="text-[9.5px] text-slate-600">Wilson NC · $215K avg home · 3% gross commission · 50% agent split</p>
                <Link href="/admin/revenue" className="text-[9.5px] text-gold-400/60 hover:text-gold-300 transition-colors font-medium">
                  Revenue dashboard →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Lead Intelligence ── */}
        <div>
          <AdminSectionHeading className="mb-3">Lead Intelligence</AdminSectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricTile label="Total Leads"  value={counts.total}    sub="in system"         accent="neutral" />
            <MetricTile label="Urgent"       value={counts.urgent}   sub="need action now"   accent="ruby"    pulse href="/admin/leads?filter=urgent" />
            <MetricTile label="Hot"          value={counts.hot}      sub="high intent"        accent="gold"    pulse href="/admin/leads?filter=urgent" />
            <MetricTile label="SLA Breached" value={counts.breached} sub="response overdue"  accent="ruby"    pulse href="/admin/leads?filter=sla_breach" />
          </div>
        </div>

        {/* ── Funnel Health ── */}
        {metrics.configured && (
          <div>
            <AdminSectionHeading className="mb-3">Funnel Health</AdminSectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricTile label="New Today"   value={metrics.totals.newToday}              sub="since midnight"  accent="neutral" />
              <MetricTile label="Contacted"   value={metrics.totals.contacted}             sub="reached"         accent="emerald" />
              <MetricTile label="Appt. Req."  value={metrics.totals.appointmentsRequested} sub="scheduled"       accent="gold"    />
              <MetricTile label="Unassigned"  value={metrics.totals.unassigned}            sub="need routing"    accent="amber"   pulse />
            </div>
          </div>
        )}

        {/* ── Action Required ── */}
        {attentionTotal > 0 ? (
          <div>
            <AdminSectionHeading className="mb-3">Action Required</AdminSectionHeading>
            <div className="rounded-xl border border-ruby-400/25 bg-[#0C0606]/80 backdrop-blur-sm overflow-hidden"
              style={{ boxShadow: "0 0 0 1px rgba(193,39,45,0.04), inset 0 1px 0 rgba(193,39,45,0.08)" }}>
              {/* Top rim */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ruby-400/40 to-transparent" />

              <div className="flex items-center gap-2.5 px-5 py-3 border-b border-ruby-400/12">
                <AlertCircle className="h-3.5 w-3.5 text-ruby-400 shrink-0" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-ruby-400 flex-1">
                  {attentionTotal} lead{attentionTotal !== 1 ? "s" : ""} need immediate attention
                </p>
                <Link href="/admin/leads" className="text-[10px] text-slate-500 hover:text-gold-300 transition-colors">
                  View all →
                </Link>
              </div>
              <div className="p-3 space-y-1.5">
                {attentionLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/admin/leads/${lead.id}`}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3.5 py-2.5 hover:border-ruby-400/22 hover:bg-ruby-400/[0.04] transition-all duration-150 group"
                  >
                    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase ${
                      lead.temperature === "urgent"
                        ? "bg-ruby-400/[0.14] text-ruby-300 border-ruby-400/30"
                        : lead.slaBreached
                        ? "bg-amber-400/10 text-amber-300 border-amber-400/25"
                        : "bg-gold-400/15 text-gold-300 border-gold-400/25"
                    }`}>
                      {lead.slaBreached && lead.temperature !== "urgent" ? "SLA" : lead.temperature}
                    </span>
                    <span className="text-sm font-medium text-cream/90 flex-1 truncate group-hover:text-white transition-colors">
                      {lead.name}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">{timeSince(lead.createdAt)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-gold-400 transition-colors shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
              {attentionTotal > ATTENTION_LIMIT && (
                <div className="px-5 pb-3">
                  <Link href="/admin/leads" className="text-[10px] text-slate-500 hover:text-gold-300 transition-colors">
                    + {attentionTotal - ATTENTION_LIMIT} more in Leads Inbox →
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/18 bg-emerald-500/[0.03] px-5 py-3.5 flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-emerald-400">All clear</p>
              <p className="text-[10px] text-slate-500 mt-0.5">No urgent leads or SLA breaches right now</p>
            </div>
          </div>
        )}

        {/* ── Today's Operations ── */}
        {metrics.configured && (metrics.totals.followUpDue > 0 || metrics.totals.neverContacted > 0) && (
          <div>
            <AdminSectionHeading className="mb-3">Today&rsquo;s Operations</AdminSectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/admin/leads?filter=follow_up_due"
                className="group relative overflow-hidden rounded-xl border border-amber-500/18 bg-[#0C0A06]/70 backdrop-blur-sm px-5 py-4.5 hover:border-amber-500/30 hover:-translate-y-0.5 hover:shadow-z2 transition-all duration-200"
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                <div className="flex items-start justify-between mb-2">
                  <div className="h-7 w-7 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                </div>
                <div className={`font-bebas text-4xl leading-none mb-1 ${metrics.totals.followUpDue > 0 ? "text-amber-300" : "text-slate-600"}`}>
                  {metrics.totals.followUpDue}
                </div>
                <div className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-400/80">Follow-ups Due</div>
                <div className="text-[9.5px] text-slate-600 mt-0.5">next_follow_up_at ≤ now</div>
              </Link>
              <Link
                href="/admin/leads?filter=never_contacted"
                className="group relative overflow-hidden rounded-xl border border-ruby-400/16 bg-[#0C0606]/70 backdrop-blur-sm px-5 py-4.5 hover:border-ruby-400/28 hover:-translate-y-0.5 hover:shadow-z2 transition-all duration-200"
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ruby-400/25 to-transparent" />
                <div className="flex items-start justify-between mb-2">
                  <div className="h-7 w-7 rounded-lg border border-ruby-400/20 bg-ruby-400/[0.07] flex items-center justify-center">
                    <PhoneCall className="h-3.5 w-3.5 text-ruby-400" aria-hidden="true" />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-ruby-400 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                </div>
                <div className={`font-bebas text-4xl leading-none mb-1 ${metrics.totals.neverContacted > 0 ? "text-ruby-300" : "text-slate-600"}`}>
                  {metrics.totals.neverContacted}
                </div>
                <div className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-400/80">Never Contacted</div>
                <div className="text-[9.5px] text-slate-600 mt-0.5">assigned &gt; 2h, no contact yet</div>
              </Link>
            </div>
          </div>
        )}

        {/* ── Source Attribution ── */}
        {metrics.configured && metrics.bySource.length > 0 && (
          <div>
            <AdminSectionHeading className="mb-3">Lead Source Attribution</AdminSectionHeading>
            <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0D0D0D]/50 backdrop-blur-sm px-5 py-4">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <div className="flex flex-wrap gap-2">
                {metrics.bySource.map(({ source, count }) => (
                  <span
                    key={source}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-xs"
                  >
                    <span className="font-bebas text-[15px] leading-none text-gold-400 tabular-nums">{count}</span>
                    <span className="text-slate-400">{source}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Command Centers ── */}
        <div>
          <AdminSectionHeading className="mb-3">Command Centers</AdminSectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
            <CenterTile href="/admin/leads"        Icon={Inbox}      label="Leads Inbox"   sub="Inbox · filter · detail"        iconColor="group-hover:border-gold-400/25 group-hover:bg-gold-400/[0.08]" />
            <CenterTile href="/admin/routing"      Icon={Users}      label="Routing"       sub="Roster · queue · SLA"           iconColor="group-hover:border-amber-400/20 group-hover:bg-amber-400/[0.07]" />
            <CenterTile href="/admin/revenue"      Icon={DollarSign} label="Revenue"       sub="Pipeline · forecast · alerts"   iconColor="group-hover:border-emerald-400/20 group-hover:bg-emerald-400/[0.07]" />
            <CenterTile href="/admin/traffic"      Icon={BarChart2}  label="Traffic"       sub="UTM · sources · sessions"       iconColor="group-hover:border-blue-400/20 group-hover:bg-blue-400/[0.06]" />
            <CenterTile href="/admin/distribution" Icon={Share2}     label="Distribution"  sub="Queue · platforms · plan"       iconColor="group-hover:border-purple-400/20 group-hover:bg-purple-400/[0.06]" />
            <CenterTile href="/admin/intelligence" Icon={Brain}      label="Intelligence"  sub="Signals · predictions · memory" iconColor="group-hover:border-gold-400/25 group-hover:bg-gold-400/[0.08]" />
            <CenterTile href="/admin/automation"   Icon={Zap}        label="Automation"    sub="Workflows · queue · history"    iconColor="group-hover:border-cyan-400/20 group-hover:bg-cyan-400/[0.06]" />
            <CenterTile href="/admin/analytics"    Icon={TrendingUp} label="Analytics"     sub="Reports · campaigns · sources"  iconColor="group-hover:border-indigo-400/20 group-hover:bg-indigo-400/[0.06]" />
            <CenterTile href="/admin/listings"     Icon={Home}       label="Listings"      sub="Inventory · inquiries · import" iconColor="group-hover:border-amber-400/20 group-hover:bg-amber-400/[0.07]" />
            <CenterTile href="/admin/documents"    Icon={FileText}   label="Documents"     sub="CMA · packets · guides"         iconColor="group-hover:border-slate-400/20 group-hover:bg-slate-400/[0.06]" />
            <CenterTile href="/admin/marketing"    Icon={Megaphone}  label="Marketing"     sub="Content · campaigns · assets"   iconColor="group-hover:border-pink-400/20 group-hover:bg-pink-400/[0.06]" />
          </div>
        </div>

        {/* ── SLA Score ── */}
        {metrics.configured && (
          <div className={`rounded-xl border px-5 py-3.5 flex items-center gap-4 ${
            slaScore >= 90
              ? "border-emerald-500/18 bg-emerald-500/[0.03]"
              : slaScore >= 75
              ? "border-amber-400/20 bg-amber-400/[0.03]"
              : "border-ruby-400/20 bg-ruby-400/[0.03]"
          }`}>
            <div className={`font-bebas text-4xl leading-none ${
              slaScore >= 90 ? "text-emerald-400" : slaScore >= 75 ? "text-amber-400" : "text-ruby-400"
            }`}>{slaScore}%</div>
            <div>
              <p className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-400">SLA Compliance · 7-day</p>
              <p className="text-[9.5px] text-slate-600 mt-0.5">
                {slaScore >= 90 ? "Excellent — all leads contacted within SLA window" : slaScore >= 75 ? "Needs attention — some leads outside SLA window" : "Critical — significant SLA breaches detected"}
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <Link href="/admin/leads?filter=sla_breach" className="text-[10px] text-slate-500 hover:text-gold-300 transition-colors">
                View breaches →
              </Link>
            </div>
          </div>
        )}

        {/* ── Recent Leads ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <AdminSectionHeading>Recent Leads</AdminSectionHeading>
            <Link href="/admin/leads" className="text-[10px] text-slate-500 hover:text-gold-300 transition-colors">
              View all →
            </Link>
          </div>
          <LeadTable leads={leads} />
        </div>

        <p className="text-[9.5px] text-slate-700 text-center pb-4 tracking-wider">
          Ask Magic Mike · Our Town Properties, Inc. · Wilson, NC ·{" "}
          {devMode ? "Sample data — connect Supabase for live leads" : "Live data"}
        </p>
      </main>
    </AdminShell>
  );
}
