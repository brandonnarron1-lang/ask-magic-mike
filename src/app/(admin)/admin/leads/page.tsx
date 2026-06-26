export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { loadLeadList, type LeadListFilters, type LeadListRow } from "@/lib/admin/lead-list";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";
import { computeReadyWillingAble, type RwaScore } from "@/lib/leads/ready-willing-able";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Parse SP into a filter set. */
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
  paid:     "bg-gold-400/20 text-gold-300 border-gold-400/30",
  organic:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  social:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  email:    "bg-purple-500/15 text-purple-300 border-purple-500/30",
  referral: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  direct:   "bg-white/[0.06] text-slate-400 border-white/10",
};

const RWA_TIER_STYLES: Record<string, string> = {
  urgent: "bg-ruby-400/[0.14] text-ruby-300 border-ruby-400/30",
  hot:    "bg-gold-400/20 text-gold-300 border-gold-400/30",
  warm:   "bg-amber-500/10 text-amber-300 border-amber-500/30",
  cold:   "bg-white/[0.05] text-slate-400 border-white/10",
};

export default async function LeadsInboxPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = readFilters(sp);
  const [list, dash] = await Promise.all([
    loadLeadList(filters),
    loadDashboardMetrics(),
  ]);

  const rwaMap = new Map(list.items.map((l) => [l.id, rwaFromRow(l)]));
  const rwaUrgent = [...rwaMap.values()].filter((r) => r.tier === "urgent").length;

  return (
    <div className="min-h-screen bg-[#05070A] text-[#F4F4F4]">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-gold-300/85">
            Ask Magic Mike · cockpit
          </p>
          <h1 className="font-display text-[22px] font-semibold">Leads inbox</h1>
        </div>
        <Link
          href="/admin"
          className="text-[12px] text-slate-300 hover:text-gold-300"
        >
          ← dashboard
        </Link>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        {/* Compact stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { label: "New today", value: dash.totals.newToday },
            { label: "Hot leads", value: dash.totals.hot, accent: true },
            { label: "Unassigned", value: dash.totals.unassigned },
            { label: "Overdue SLA", value: dash.totals.overdueSla, accent: true },
            { label: "RWA Urgent", value: rwaUrgent, accent: true },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3"
            >
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-slate-300">
                {s.label}
              </p>
              <p
                className={`font-bebas text-4xl leading-none mt-1 ${
                  s.accent ? "text-gold-300" : "text-[#F4F4F4]"
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <form
          method="get"
          className="mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2"
        >
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search name/email/phone/address"
            className="col-span-2 rounded-md border border-white/[0.12] bg-[#0B0E14] px-3 py-2 text-[13px] text-[#F4F4F4] placeholder:text-slate-600"
          />
          <select
            name="lead_type"
            defaultValue={filters.leadType ?? ""}
            className="rounded-md border border-white/[0.12] bg-[#0B0E14] px-3 py-2 text-[13px] text-[#F4F4F4]"
          >
            <option value="">All types</option>
            {[
              "buyer",
              "seller",
              "seller_cash_offer",
              "investor",
              "listing_inquiry",
              "home_value",
              "general_question",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            name="grade"
            defaultValue={filters.grade ?? ""}
            className="rounded-md border border-white/[0.12] bg-[#0B0E14] px-3 py-2 text-[13px] text-[#F4F4F4]"
          >
            <option value="">All grades</option>
            {["A+", "A", "B", "C", "D"].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-gold-400 text-[#050505] font-bold px-4 py-2 text-[13px]"
          >
            Apply
          </button>
        </form>

        {!list.configured && (
          <div className="mb-5 rounded-md border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2 text-[12px] text-amber-200">
            Supabase not connected — showing empty list. The canonical API works
            in mock mode; live leads will appear here when{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> +{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> are set.
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-white/[0.09]">
          <table className="w-full text-[13px]">
            <thead className="bg-white/[0.03] text-[10.5px] tracking-[0.16em] uppercase text-slate-300">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Intent</th>
                <th className="text-left px-3 py-2">Grade</th>
                <th className="text-left px-3 py-2">Score</th>
                <th className="text-left px-3 py-2">Temp</th>
                <th className="text-left px-3 py-2">RWA</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Queue</th>
                <th className="text-left px-3 py-2">Next action</th>
                <th className="text-left px-3 py-2">Source</th>
                <th className="text-left px-3 py-2">Campaign</th>
                <th className="text-left px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {list.items.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-14 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="h-9 w-9 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center mb-1">
                        <span className="font-bebas text-lg text-slate-600 leading-none">0</span>
                      </div>
                      <p className="text-[13px] font-medium text-slate-400">No leads match these filters</p>
                      <p className="text-[11px] text-slate-600">Adjust filters above · leads appear here as the funnel receives traffic</p>
                    </div>
                  </td>
                </tr>
              )}
              {list.items.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-white/[0.06] hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/leads/${l.id}`}
                      className="text-[#F4F4F4] hover:text-gold-300"
                    >
                      {l.firstName || l.lastName
                        ? `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim()
                        : "(unnamed)"}
                    </Link>
                    {l.email ? (
                      <div className="text-[11px] text-slate-400">{l.email}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{l.leadType}</td>
                  <td className="px-3 py-2 text-slate-300">{"—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        l.grade === "A+" || l.grade === "A"
                          ? "bg-gold-400 text-[#050505]"
                          : "bg-white/[0.08] text-slate-200"
                      }`}
                    >
                      {l.grade ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300 tabular-nums">
                    {l.score !== null ? l.score : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {l.temperature ? (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        l.temperature === "urgent" ? "bg-ruby-400/[0.14] text-ruby-300" :
                        l.temperature === "hot"    ? "bg-gold-400/20 text-gold-300" :
                        l.temperature === "warm"   ? "bg-amber-500/15 text-amber-300" :
                        l.temperature === "nurture"? "bg-blue-500/10 text-blue-300" :
                        "bg-white/[0.05] text-slate-400"
                      }`}>
                        {l.temperature.toUpperCase()}
                      </span>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {(() => {
                      const rwa = rwaMap.get(l.id);
                      if (!rwa) return <span className="text-slate-500">—</span>;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${RWA_TIER_STYLES[rwa.tier] ?? ""}`}
                          title={`R:${rwa.ready} W:${rwa.willing} A:${rwa.able}`}
                        >
                          {rwa.tier.toUpperCase()} · {rwa.overall}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{l.status}</td>
                  <td className="px-3 py-2 text-slate-300">{"—"}</td>
                  <td className="px-3 py-2 text-slate-300 max-w-[220px]">{"—"}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {l.referrerType ? (
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${REFERRER_BADGE[l.referrerType] ?? REFERRER_BADGE.direct}`}
                        title={`${l.referrerType}${l.utmSource ? ` · ${l.utmSource}` : ""}`}
                      >
                        {l.referrerType.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-slate-500">{l.source ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {l.utmCampaign ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-[12px]">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          Showing {list.items.length} of {list.total} · limit {list.limit}
        </p>
      </main>
    </div>
  );
}
