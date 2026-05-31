import { LeadTable } from "@/components/admin/lead-table";
import { getLeadsForAdmin } from "@/lib/db/lead-repository";
import { isDev } from "@/lib/db/types";

async function AdminIcon() {
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
  const leads     = await getLeadsForAdmin();
  const devMode   = isDev();

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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
