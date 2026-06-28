export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Home, Upload, Search, TrendingUp, ArrowRight, AlertCircle, CheckCircle2, BarChart2 } from "lucide-react";
import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";
import { getLeadsForAdmin } from "@/lib/db/lead-repository";
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

function intentLabel(intent: string): string {
  if (intent.includes("cash")) return "Cash Offer";
  if (intent.includes("sell") || intent.includes("list")) return "Sell / List";
  if (intent.includes("valuat")) return "Valuation";
  if (intent.includes("buy")) return "Buyer";
  return intent;
}

export default async function ListingsPage() {
  const [result, signals] = await Promise.all([
    getLeadsForAdmin(),
    loadIntelligenceSignals(),
  ]);

  const leads  = result.leads;
  const devMode = result.mode === "dev";

  const sellerLeads = leads.filter(
    (l) => l.intent.includes("sell") || l.intent.includes("list") || l.intent.includes("cash") || l.intent.includes("valuat")
  );
  const urgentSellers = sellerLeads.filter((l) => l.temperature === "urgent" || l.temperature === "hot");
  const hasListings = signals.totalProperties > 0;

  const topNeighborhoods = Object.entries(signals.neighborhoodLeadCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <AdminShell
      title="Listings"
      eyebrow="Operations"
      backHref="/admin"
      backLabel="← Command Center"
      devMode={devMode}
      headerRight={
        <Link
          href="/api/admin/listings/import"
          className="rounded-lg border border-gold-400/30 bg-gold-400/[0.07] px-3 py-1.5 text-xs font-semibold text-gold-300 hover:bg-gold-400/[0.12] transition-colors"
        >
          Import CSV
        </Link>
      }
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {devMode && (
          <div className="rounded-xl border-2 border-amber-400/50 bg-amber-400/[0.07] px-5 py-4">
            <p className="text-sm font-bold text-amber-400 mb-1">DEV MODE — Sample Data Only</p>
            <p className="text-xs text-amber-300/70">Connect Supabase to see live listing inventory and property signals.</p>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Seller Leads",       value: sellerLeads.length,                    color: "text-cream",       sub: "in pipeline" },
            { label: "Hot / Urgent",       value: urgentSellers.length,                  color: "text-gold-400",    sub: "need action" },
            { label: "Valuation Requests", value: signals.valuationRequestsInWindow,      color: "text-emerald-400", sub: "last 7 days" },
            { label: "Listing Interest",   value: signals.listingInterestLeads,           color: "text-amber-400",   sub: "leads tracking" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
              <div className={`font-bebas text-5xl leading-none ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">{s.label}</div>
              <div className="text-[10.5px] text-slate-600 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Seller pipeline */}
          <div className="lg:col-span-2">
            <AdminSectionHeading className="mb-3">Seller Pipeline</AdminSectionHeading>

            {urgentSellers.length > 0 && (
              <div className="rounded-xl border border-gold-400/20 bg-gold-400/[0.03] mb-4">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gold-400/10">
                  <TrendingUp className="h-4 w-4 text-gold-400 shrink-0" aria-hidden="true" />
                  <p className="text-xs font-bold uppercase tracking-label text-gold-400 flex-1">
                    Hot Sellers · {urgentSellers.length} lead{urgentSellers.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-3 space-y-1.5">
                  {urgentSellers.slice(0, 5).map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/admin/leads/${lead.id}`}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5 hover:border-gold-400/25 hover:bg-gold-400/[0.04] transition-all group"
                    >
                      <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        lead.temperature === "urgent"
                          ? "bg-ruby-400/[0.14] text-ruby-300 border-ruby-400/30"
                          : "bg-gold-400/15 text-gold-300 border-gold-400/25"
                      }`}>
                        {lead.temperature}
                      </span>
                      <span className="text-sm font-medium text-cream flex-1 truncate">{lead.name}</span>
                      <span className="text-[10px] text-slate-600 shrink-0">{intentLabel(lead.intent)}</span>
                      <span className="text-xs text-slate-500 shrink-0 tabular-nums">{timeSince(lead.createdAt)}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-gold-400 transition-colors shrink-0" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {sellerLeads.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01]">
                <div className="px-5 py-3 border-b border-white/[0.04]">
                  <p className="text-[10px] tracking-label uppercase font-semibold text-slate-600">All Seller Leads</p>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {sellerLeads.slice(0, 15).map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/admin/leads/${lead.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.025] transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cream font-medium truncate">{lead.name}</p>
                        {lead.addressRaw && (
                          <p className="text-[10px] text-slate-600 truncate mt-0.5">{lead.addressRaw}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-500">{intentLabel(lead.intent)}</p>
                        <p className="text-[10px] text-slate-700 tabular-nums">{timeSince(lead.createdAt)}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-700 group-hover:text-gold-400 transition-colors shrink-0" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
                {sellerLeads.length > 15 && (
                  <div className="px-5 py-3 border-t border-white/[0.04]">
                    <Link href="/admin/leads" className="text-xs text-slate-500 hover:text-gold-300 transition-colors">
                      + {sellerLeads.length - 15} more in Leads Inbox →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {sellerLeads.length === 0 && (
              <div className="rounded-xl border border-white/[0.05] p-8 text-center">
                <p className="text-[11px] text-slate-700">No seller leads yet. They appear here when leads express seller or listing intent.</p>
              </div>
            )}
          </div>

          {/* Sidebar: Neighborhood heat + setup */}
          <div className="space-y-4">

            {/* Neighborhood heat */}
            {topNeighborhoods.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
                <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-gold-300/70 mb-3">
                  Lead Activity by Neighborhood
                </p>
                <div className="space-y-2">
                  {topNeighborhoods.map(([area, count], i) => {
                    const max = topNeighborhoods[0]?.[1] ?? 1;
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={area}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-slate-400 truncate flex-1">{area}</span>
                          <span className="text-[10px] font-semibold text-cream ml-2 tabular-nums">{count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${i === 0 ? "bg-gold-400" : "bg-slate-600"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <p className="text-[9px] text-slate-700">
                    Top area: <span className="text-slate-500">{signals.topNeighborhood}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Listing inventory status */}
            <div className={`rounded-xl border p-4 ${hasListings ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-amber-400/20 bg-amber-400/[0.03]"}`}>
              <div className="flex items-start gap-2.5">
                {hasListings
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                  : <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                }
                <div>
                  <p className={`text-xs font-semibold mb-1 ${hasListings ? "text-emerald-400" : "text-amber-400"}`}>
                    {hasListings ? `${signals.totalProperties} Properties Loaded` : "No Listing Inventory"}
                  </p>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    {hasListings
                      ? `${signals.propertyViewsInWindow} property views in the last 7 days. Lead matching is active.`
                      : "Import a FlexMLS CSV export to enable property matching, valuation tracking, and buyer-listing recommendations."
                    }
                  </p>
                  {!hasListings && (
                    <Link
                      href="/api/admin/listings/import"
                      className="mt-2 inline-flex items-center gap-1 text-[10px] text-gold-300 hover:text-gold-200 transition-colors"
                    >
                      <Upload className="h-3 w-3" aria-hidden="true" />
                      Import listings →
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
              <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">Quick Actions</p>
              <div className="space-y-1.5">
                {[
                  { href: "/admin/intelligence/sellers",    Icon: TrendingUp, label: "Seller Intelligence",   sub: "Readiness scores" },
                  { href: "/admin/intelligence/properties", Icon: BarChart2,  label: "Property Analytics",    sub: "Interest + heat" },
                  { href: "/admin/intelligence/buyers",     Icon: Search,     label: "Buyer Intelligence",    sub: "Purchase probability" },
                  { href: "/admin/leads",                   Icon: Home,       label: "Lead Inbox",            sub: "Full pipeline" },
                ].map(({ href, Icon, label, sub }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2.5 hover:border-white/[0.1] hover:bg-white/[0.025] transition-all group"
                  >
                    <Icon className="h-3.5 w-3.5 text-slate-600 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-slate-300">{label}</p>
                      <p className="text-[9px] text-slate-700">{sub}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-700 group-hover:text-gold-400 transition-colors shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Setup guide when no listings */}
        {!hasListings && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl border border-gold-400/20 bg-gold-400/[0.06] flex items-center justify-center shrink-0">
                <Home className="h-5 w-5 text-gold-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cream mb-1">Set Up Listing Inventory</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Import your MLS listing data to unlock property matching, buyer recommendations, and listing performance analytics.
                  Export a CSV from FlexMLS and upload it via the import endpoint.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { step: "1", text: "Export CSV from FlexMLS (Standard fields: MLS#, Address, Price, Status, Beds, Baths, SqFt)" },
                    { step: "2", text: "Upload via POST /api/admin/listings/import with multipart form data (field: file)" },
                    { step: "3", text: "Intelligence engine auto-scores properties and begins matching buyer leads" },
                  ].map(({ step, text }) => (
                    <div key={step} className="rounded-lg border border-white/[0.05] bg-white/[0.01] p-3">
                      <div className="font-bebas text-xl text-gold-400 leading-none mb-1">{step}</div>
                      <p className="text-[10px] text-slate-600 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-700 text-center pb-4">
          Listings OS · Our Town Properties, Inc. · Wilson, NC ·{" "}
          {devMode ? "Sample data — connect Supabase for live data" : "Live data"}
        </p>
      </main>
    </AdminShell>
  );
}
