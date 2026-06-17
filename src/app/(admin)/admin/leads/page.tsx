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
  });
}

const RWA_TIER_STYLES: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-300 border-red-500/30",
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
                className={`font-display text-[28px] font-semibold leading-none mt-1 ${
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
            className="col-span-2 rounded-md border border-white/12 bg-[#0B0E14] px-3 py-2 text-[13px]"
          />
          <select
            name="lead_type"
            defaultValue={filters.leadType ?? ""}
            className="rounded-md border border-white/12 bg-[#0B0E14] px-3 py-2 text-[13px]"
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
            className="rounded-md border border-white/12 bg-[#0B0E14] px-3 py-2 text-[13px]"
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
                  <td colSpan={13} className="px-3 py-6 text-center text-slate-400">
                    No leads match these filters.
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
                  <td className="px-3 py-2 text-slate-300">{"—"}</td>
                  <td className="px-3 py-2 text-slate-300">{"—"}</td>
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
                  <td className="px-3 py-2 text-slate-300">{l.source ?? "—"}</td>
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
