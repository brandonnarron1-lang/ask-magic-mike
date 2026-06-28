export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { loadLeadList, type LeadListFilters, type LeadListRow } from "@/lib/admin/lead-list";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";
import { computeReadyWillingAble, type RwaScore } from "@/lib/leads/ready-willing-able";
import { LEAD_STATUSES } from "@/lib/leads/lead-types";
import { formatContactAge } from "@/lib/admin/lead-contact-format";
import { isSyntheticEmail } from "@/lib/leads/synthetic-detection";
import { buildConversionPrediction } from "@/lib/leads/conversion-prediction";
import { buildLeadIntelligence } from "@/lib/leads/lead-intelligence";
import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readFilters(sp: Record<string, string | string[] | undefined>): LeadListFilters {
  const v = (k: string) => {
    const x = sp[k];
    return Array.isArray(x) ? x[0] : x;
  };
  const filterShortcut = v("filter");
  return {
    q: v("q") ?? null,
    leadType: v("lead_type") ?? null,
    status: v("status") ?? null,
    grade: v("grade") ?? null,
    source: v("source") ?? null,
    assignedAgentId: v("assigned_agent_id") ?? null,
    unassignedOnly: v("unassigned_only") === "true",
    spamSuspect: v("spam_suspect") === "true",
    city: v("city") ?? null,
    sort: (v("sort") as never) ?? "newest",
    limit: 25,
    offset: v("offset") ? Number(v("offset")) : 0,
    followUpDue: filterShortcut === "follow_up_due",
    neverContacted: filterShortcut === "never_contacted",
    urgentOnly: filterShortcut === "urgent",
    slaBreach: filterShortcut === "sla_breach",
  };
}

function rwaFromRow(l: LeadListRow): RwaScore {
  return computeReadyWillingAble({
    leadType: l.leadType,
    primaryIntent:
      ["seller", "seller_cash_offer", "home_value", "investor"].includes(l.leadType)
        ? "sell"
        : ["buyer", "listing_inquiry", "relocation", "renter"].includes(l.leadType)
          ? "buy"
          : null,
    hasEmail: !!l.email,
    hasPhone: !!l.phone,
    spamScore: l.spamScore,
    temperature: l.temperature ?? null,
  });
}

const REFERRER_BADGE: Record<string, string> = {
  paid:     "bg-gold-400/18 text-gold-300 border-gold-400/28",
  organic:  "bg-emerald-500/13 text-emerald-300 border-emerald-500/25",
  social:   "bg-blue-500/13 text-blue-300 border-blue-500/25",
  email:    "bg-purple-500/13 text-purple-300 border-purple-500/25",
  referral: "bg-slate-500/13 text-slate-300 border-slate-500/25",
  direct:   "bg-white/[0.05] text-slate-400 border-white/[0.09]",
};

const RWA_TIER_STYLES: Record<string, string> = {
  urgent: "bg-ruby-400/[0.13] text-ruby-300 border-ruby-400/28",
  hot:    "bg-gold-400/18 text-gold-300 border-gold-400/28",
  warm:   "bg-amber-500/10 text-amber-300 border-amber-500/25",
  cold:   "bg-white/[0.04] text-slate-400 border-white/[0.09]",
};

const CONVERSION_TIER: Record<string, string> = {
  green:  "bg-emerald-500/13 text-emerald-300 border-emerald-500/25",
  yellow: "bg-gold-400/18 text-gold-300 border-gold-400/28",
  amber:  "bg-amber-500/10 text-amber-300 border-amber-500/25",
  red:    "bg-ruby-400/[0.11] text-ruby-300 border-ruby-400/28",
};

const TEMP_STYLES: Record<string, string> = {
  urgent: "bg-ruby-400/[0.13] text-ruby-300 border border-ruby-400/28",
  hot:    "bg-gold-400/18 text-gold-300 border border-gold-400/28",
  warm:   "bg-amber-500/10 text-amber-300 border border-amber-500/25",
  nurture: "bg-blue-500/8 text-blue-300 border border-blue-500/20",
  low:    "bg-white/[0.04] text-slate-400 border border-white/[0.09]",
};

const QUICK_FILTERS = [
  { label: "All",            key: null,              style: "border-white/[0.10] text-slate-400 hover:text-cream hover:border-white/20",      activeStyle: "border-white/20 bg-white/[0.06] text-cream" },
  { label: "Urgent",        key: "urgent",          style: "border-ruby-400/25 text-ruby-300 bg-ruby-400/[0.06] hover:bg-ruby-400/[0.12]",   activeStyle: "ring-1 ring-ruby-400/30 bg-ruby-400/[0.12]" },
  { label: "SLA Breach",    key: "sla_breach",      style: "border-ruby-400/25 text-ruby-300 bg-ruby-400/[0.06] hover:bg-ruby-400/[0.12]",   activeStyle: "ring-1 ring-ruby-400/30 bg-ruby-400/[0.12]" },
  { label: "Follow-up Due", key: "follow_up_due",   style: "border-amber-400/25 text-amber-300 bg-amber-400/[0.05] hover:bg-amber-400/[0.10]", activeStyle: "ring-1 ring-amber-400/30 bg-amber-400/[0.10]" },
  { label: "Never Contacted", key: "never_contacted", style: "border-blue-400/25 text-blue-300 bg-blue-400/[0.05] hover:bg-blue-400/[0.10]",  activeStyle: "ring-1 ring-blue-400/30 bg-blue-400/[0.10]" },
] as const;

const SELECT_CLS = "rounded-xl border border-white/[0.10] bg-[#0E0E0E] px-3 py-2 text-sm text-cream placeholder:text-slate-600 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/25 transition-colors appearance-none";

export default async function LeadsInboxPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = readFilters(sp);
  const activeFilter = (Array.isArray(sp.filter) ? sp.filter[0] : sp.filter) ?? null;

  const [list, dash] = await Promise.all([
    loadLeadList(filters),
    loadDashboardMetrics(),
  ]);

  const rwaMap = new Map(list.items.map((l) => [l.id, rwaFromRow(l)]));
  const rwaUrgent = [...rwaMap.values()].filter((r) => r.tier === "urgent").length;

  const conversionMap = new Map(list.items.map((l) => [l.id, buildConversionPrediction({
    grade: l.grade,
    score: l.score,
    temperature: l.temperature,
    leadType: l.leadType,
    hasEmail: !!l.email,
    hasPhone: !!l.phone,
    utmSource: l.utmSource,
    utmMedium: l.utmMedium,
    referrerType: l.referrerType,
    status: l.status,
    assignedAgentId: l.assignedAgentId,
    spamScore: l.spamScore,
    createdAt: l.createdAt,
  })]));

  const intelMap = new Map(list.items.map((l) => [l.id, buildLeadIntelligence({
    leadType: l.leadType,
    score: l.score,
    temperature: l.temperature,
    grade: l.grade,
    status: l.status,
    hasEmail: !!l.email,
    hasPhone: !!l.phone,
    utmSource: l.utmSource,
    utmMedium: l.utmMedium,
    referrerType: l.referrerType,
    assignedAgentId: l.assignedAgentId,
    lastContactedAt: l.lastContactedAt,
    createdAt: l.createdAt,
  })]));

  return (
    <AdminShell
      title="Leads Inbox"
      backHref="/admin"
      headerRight={
        <span className="hidden sm:block text-[10px] text-slate-500 tabular-nums">
          {list.total} total
        </span>
      }
    >
      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-5">

        {!list.configured && (
          <div className="rounded-xl border border-amber-400/28 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-200">
            Supabase not connected — showing empty list. Live leads appear here when{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code> are set.
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {[
            { label: "New today",   value: dash.totals.newToday,   accent: "neutral" as const },
            { label: "Hot leads",   value: dash.totals.hot,        accent: "gold"    as const },
            { label: "Unassigned",  value: dash.totals.unassigned, accent: "amber"   as const },
            { label: "Overdue SLA", value: dash.totals.overdueSla, accent: "ruby"    as const },
            { label: "RWA Urgent",  value: rwaUrgent,              accent: "ruby"    as const },
          ].map((s) => {
            const aStyle = {
              neutral: { wrap: "border-white/[0.07] bg-[#0D0D0D]/60", num: "text-cream",      rim: "via-white/[0.08]" },
              gold:    { wrap: "border-gold-400/20 bg-[#0D0A06]/70",   num: "text-gold-300",   rim: "via-gold-400/30"  },
              amber:   { wrap: "border-amber-500/16 bg-[#0C0A06]/70",  num: "text-amber-300",  rim: "via-amber-400/25" },
              ruby:    { wrap: "border-ruby-400/20 bg-[#0D0606]/70",   num: "text-ruby-300",   rim: "via-ruby-400/28"  },
            }[s.accent];
            return (
              <div key={s.label} className={`relative overflow-hidden rounded-xl border backdrop-blur-sm px-4 py-3 ${aStyle.wrap}`}>
                <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${aStyle.rim} to-transparent`} />
                <p className="text-[9px] tracking-[0.15em] uppercase text-slate-500 font-semibold mb-1">{s.label}</p>
                <p className={`font-bebas text-4xl leading-none ${aStyle.num}`}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(({ label, key, style, activeStyle }) => {
            const isActive = key === null ? !activeFilter : activeFilter === key;
            const href = key ? `?filter=${key}` : "?";
            return (
              <Link
                key={label}
                href={href}
                className={`inline-flex items-center rounded-full border px-3.5 py-1 text-[11px] font-semibold transition-all duration-150 ${style} ${isActive ? activeStyle : "opacity-75"}`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Filter form */}
        <form method="get">
          <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0D0D0D]/50 backdrop-blur-sm p-4">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
            <div className="flex items-center gap-2 mb-1.5">
              <SlidersHorizontal className="h-3 w-3 text-slate-600" aria-hidden="true" />
              <span className="text-[9px] tracking-[0.15em] uppercase font-semibold text-slate-600">Filters</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <div className="col-span-2 sm:col-span-3 md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600 pointer-events-none" aria-hidden="true" />
                <input
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder="Search name / email / phone"
                  className="w-full rounded-xl border border-white/[0.10] bg-[#0E0E0E] pl-8 pr-3 py-2 text-sm text-cream placeholder:text-slate-600 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/25 transition-colors"
                />
              </div>
              <div className="relative">
                <select name="lead_type" defaultValue={filters.leadType ?? ""} className={SELECT_CLS + " w-full"}>
                  <option value="">All types</option>
                  {["buyer","seller","seller_cash_offer","investor","listing_inquiry","home_value","general_question"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 pointer-events-none" aria-hidden="true" />
              </div>
              <div className="relative">
                <select name="grade" defaultValue={filters.grade ?? ""} className={SELECT_CLS + " w-full"}>
                  <option value="">All grades</option>
                  {["A+","A","B","C","D"].map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 pointer-events-none" aria-hidden="true" />
              </div>
              <div className="relative">
                <select name="status" defaultValue={filters.status ?? ""} className={SELECT_CLS + " w-full"}>
                  <option value="">All statuses</option>
                  {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 pointer-events-none" aria-hidden="true" />
              </div>
              <div className="relative">
                <select name="sort" defaultValue={filters.sort ?? "newest"} className={SELECT_CLS + " w-full"}>
                  <option value="newest">Newest first</option>
                  <option value="highest_score">Highest score</option>
                  <option value="sla_deadline">SLA deadline</option>
                  <option value="last_activity">Last activity</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 pointer-events-none" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className="rounded-xl border border-gold-400/35 bg-gold-400/[0.10] px-5 py-1.5 text-sm font-semibold text-gold-300 hover:bg-gold-400/[0.18] hover:border-gold-400/55 transition-all duration-150"
              >
                Apply
              </button>
            </div>
          </div>
        </form>

        {/* Lead table */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <AdminSectionHeading>
              {list.total} lead{list.total !== 1 ? "s" : ""}
              {activeFilter ? ` · ${activeFilter.replace(/_/g, " ")}` : ""}
            </AdminSectionHeading>
            <span className="text-[10px] text-slate-600">Showing {list.items.length}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0D0D0D]/40 backdrop-blur-sm">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Name / Contact", "Type", "Conv.", "Grade", "Score", "Temp", "RWA", "Status", "Last Contact", "Next Action", "Source", "Campaign", "Created"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[9.5px] tracking-[0.13em] uppercase font-bold text-slate-500/80 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.items.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-3 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full border border-white/[0.07] bg-white/[0.02] flex items-center justify-center mb-1">
                          <span className="font-bebas text-xl text-slate-600 leading-none">0</span>
                        </div>
                        <p className="text-sm font-medium text-slate-400">No leads match these filters</p>
                        <p className="text-xs text-slate-600">Adjust filters above · leads appear as the funnel receives traffic</p>
                      </div>
                    </td>
                  </tr>
                )}
                {list.items.map((l, idx) => {
                  const isUrgent = l.temperature === "urgent";
                  const isHot    = l.temperature === "hot";
                  return (
                    <tr
                      key={l.id}
                      className={`border-t border-white/[0.04] transition-colors duration-100 ${
                        isUrgent ? "hover:bg-ruby-400/[0.03]" : isHot ? "hover:bg-gold-400/[0.02]" : "hover:bg-white/[0.015]"
                      } ${idx % 2 === 1 ? "bg-white/[0.008]" : ""}`}
                    >
                      {/* Name / Contact */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/admin/leads/${l.id}`}
                            className="font-medium text-cream hover:text-gold-300 transition-colors"
                          >
                            {l.firstName || l.lastName ? `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() : "(unnamed)"}
                          </Link>
                          {isSyntheticEmail(l.email) && (
                            <span className="inline-flex items-center rounded-full border border-purple-400/35 bg-purple-500/[0.10] px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wider text-purple-300">
                              QA
                            </span>
                          )}
                        </div>
                        {l.email && <div className="text-[11px] text-slate-500 mt-px">{l.email}</div>}
                        {(() => {
                          const intel = intelMap.get(l.id);
                          return intel ? (
                            <div className="mt-0.5 text-[9.5px] text-emerald-400/65 font-mono">{intel.commissionRange.label}</div>
                          ) : null;
                        })()}
                      </td>

                      {/* Type */}
                      <td className="px-3 py-2.5 text-slate-400 text-[11.5px] whitespace-nowrap">{l.leadType}</td>

                      {/* Conversion score */}
                      <td className="px-3 py-2.5">
                        {(() => {
                          const cv = conversionMap.get(l.id);
                          if (!cv) return <span className="text-slate-600">—</span>;
                          return (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${CONVERSION_TIER[cv.colorTier] ?? ""}`}
                              title={cv.primaryReason}
                            >
                              {cv.score}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Grade */}
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          l.grade === "A+" ? "bg-gold-400 text-midnight shadow-gold-xs" :
                          l.grade === "A"  ? "bg-gold-400/25 text-gold-200 border border-gold-400/30" :
                          l.grade === "B"  ? "bg-amber-500/15 text-amber-300 border border-amber-500/25" :
                          "bg-white/[0.06] text-slate-400 border border-white/[0.09]"
                        }`}>
                          {l.grade ?? "—"}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-3 py-2.5 text-slate-300 tabular-nums text-[12px]">
                        {l.score !== null ? l.score : <span className="text-slate-600">—</span>}
                      </td>

                      {/* Temperature */}
                      <td className="px-3 py-2.5">
                        {l.temperature ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-wide ${TEMP_STYLES[l.temperature] ?? "text-slate-400"}`}>
                            {l.temperature.toUpperCase()}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>

                      {/* RWA */}
                      <td className="px-3 py-2.5">
                        {(() => {
                          const rwa = rwaMap.get(l.id);
                          if (!rwa) return <span className="text-slate-600">—</span>;
                          return (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${RWA_TIER_STYLES[rwa.tier] ?? ""}`}
                              title={`R:${rwa.ready} W:${rwa.willing} A:${rwa.able}`}
                            >
                              {rwa.tier.toUpperCase()} · {rwa.overall}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-slate-300 text-[11.5px] whitespace-nowrap">{l.status}</td>

                      {/* Last contact */}
                      <td className="px-3 py-2.5 text-[11px] tabular-nums">
                        <span className={l.lastContactedAt ? "text-emerald-400" : "text-slate-600 italic"}>
                          {formatContactAge(l.lastContactedAt)}
                        </span>
                      </td>

                      {/* Next action */}
                      <td className="px-3 py-2.5 max-w-[200px]">
                        {(() => {
                          const intel = intelMap.get(l.id);
                          if (!intel) return <span className="text-slate-600">—</span>;
                          return (
                            <div>
                              <div className="text-[11px] text-slate-300 leading-snug">{intel.nextAction}</div>
                              <div className="text-[9.5px] text-slate-600 mt-px">{intel.recommendedFollowUpLabel}</div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Source */}
                      <td className="px-3 py-2.5">
                        {l.referrerType ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${REFERRER_BADGE[l.referrerType] ?? REFERRER_BADGE.direct}`}
                            title={`${l.referrerType}${l.utmSource ? ` · ${l.utmSource}` : ""}`}
                          >
                            {l.referrerType.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11.5px]">{l.source ?? "—"}</span>
                        )}
                      </td>

                      {/* Campaign */}
                      <td className="px-3 py-2.5 text-slate-400 text-[11.5px] max-w-[120px] truncate">
                        {l.utmCampaign ?? <span className="text-slate-600">—</span>}
                      </td>

                      {/* Created */}
                      <td className="px-3 py-2.5 text-slate-500 text-[11px] tabular-nums whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleDateString()}
                        <span className="text-slate-700 ml-1">{new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <p className="text-[10px] text-slate-600">
              Showing {list.items.length} of {list.total} · limit {list.limit}
            </p>
            {list.total > list.limit && (
              <div className="flex gap-2">
                {(filters.offset ?? 0) > 0 && (
                  <Link href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([,v]) => v !== undefined).map(([k,v]) => [k, String(v)])), offset: String(Math.max(0, (filters.offset ?? 0) - list.limit)) }).toString()}`}
                    className="text-[10px] text-slate-400 hover:text-gold-300 transition-colors border border-white/[0.07] rounded-lg px-3 py-1">
                    ← Prev
                  </Link>
                )}
                {list.items.length === list.limit && (
                  <Link href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([,v]) => v !== undefined).map(([k,v]) => [k, String(v)])), offset: String((filters.offset ?? 0) + list.limit) }).toString()}`}
                    className="text-[10px] text-slate-400 hover:text-gold-300 transition-colors border border-white/[0.07] rounded-lg px-3 py-1">
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
