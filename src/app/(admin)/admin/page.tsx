import { LeadTable } from "@/components/admin/lead-table";
import type { LeadRow } from "@/components/admin/lead-table";
import type { Temperature } from "@/types/domain.types";

const DEV_LEADS: LeadRow[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+12525550101",
    intent: "sell",
    question: "What is my home worth? I have a 3BR on Forest Hills Dr and want to list in the spring.",
    temperature: "urgent",
    sellerScore: 85,
    buyerScore: 10,
    compositeScore: 85,
    agentName: "Mike Eatmon",
    status: "assigned",
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    slaBreached: false,
  },
  {
    id: "2",
    name: "David & Kim Park",
    email: "dpark@example.com",
    phone: "+12525550102",
    intent: "buy",
    question: "Looking to buy a 4BR in Wilson under $350k. What's available near good schools?",
    temperature: "hot",
    sellerScore: 5,
    buyerScore: 72,
    compositeScore: 72,
    agentName: "Mike Eatmon",
    status: "assigned",
    createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
    slaBreached: false,
  },
  {
    id: "3",
    name: "Marcus Williams",
    email: null,
    phone: "+12525550103",
    intent: "sell",
    question: "Should I sell now or wait until fall? Inherited property on Nash St.",
    temperature: "warm",
    sellerScore: 55,
    buyerScore: 0,
    compositeScore: 55,
    agentName: "Mike Eatmon",
    status: "scored",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    slaBreached: true,
  },
  {
    id: "4",
    name: "Anonymous",
    email: null,
    phone: null,
    intent: "unknown",
    question: "Just exploring. What are homes selling for in Rocky Mount these days?",
    temperature: "nurture",
    sellerScore: 10,
    buyerScore: 15,
    compositeScore: 15,
    agentName: "Mike Eatmon",
    status: "scored",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    slaBreached: false,
  },
];

async function getLeads(): Promise<LeadRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return DEV_LEADS;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();
    const { data } = await client
      .from("leads")
      .select(`
        id, first_name, last_name, email, phone,
        primary_intent, question_raw, status, created_at,
        lead_scores ( seller_certainty_score, buyer_certainty_score, composite_score, temperature ),
        lead_routing ( status, accept_deadline, contact_deadline, agents ( name ) )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!data) return DEV_LEADS;

    return data.map((row) => {
      const score     = Array.isArray(row.lead_scores)    ? row.lead_scores[0]    : row.lead_scores;
      const routing   = Array.isArray(row.lead_routing)   ? row.lead_routing[0]   : row.lead_routing;
      const agent     = routing && !Array.isArray((routing as { agents?: unknown }).agents)
        ? (routing as { agents?: { name?: string } }).agents
        : null;
      const contactDl = routing
        ? new Date((routing as { contact_deadline?: string }).contact_deadline ?? "")
        : null;
      return {
        id:            row.id,
        name:          [row.first_name, row.last_name].filter(Boolean).join(" ") || "Anonymous",
        email:         row.email ?? null,
        phone:         row.phone ?? null,
        intent:        row.primary_intent ?? "unknown",
        question:      row.question_raw ?? null,
        temperature:   ((score as { temperature?: string } | null)?.temperature ?? "low") as Temperature,
        sellerScore:   (score as { seller_certainty_score?: number } | null)?.seller_certainty_score ?? 0,
        buyerScore:    (score as { buyer_certainty_score?: number } | null)?.buyer_certainty_score ?? 0,
        compositeScore:(score as { composite_score?: number } | null)?.composite_score ?? 0,
        agentName:     (agent as { name?: string } | null)?.name ?? "Unassigned",
        status:        row.status ?? "new",
        createdAt:     row.created_at,
        slaBreached:   contactDl ? contactDl < new Date() : false,
      };
    });
  } catch {
    return DEV_LEADS;
  }
}

export default async function AdminPage() {
  // Auth is handled by middleware (src/middleware.ts)
  const leads = await getLeads();
  const isDevMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  const counts = {
    total:   leads.length,
    urgent:  leads.filter((l) => l.temperature === "urgent").length,
    hot:     leads.filter((l) => l.temperature === "hot").length,
    breached:leads.filter((l) => l.slaBreached).length,
  };

  return (
    <div className="min-h-screen bg-[#080806] text-cream">
      {/* Top bar */}
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
            {isDevMode && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-amber-400 font-medium">
                Dev Mode — Sample Data
              </span>
            )}
            <span>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Leads",    value: counts.total,    color: "text-cream" },
            { label: "Urgent",         value: counts.urgent,   color: "text-ruby-400" },
            { label: "Hot",            value: counts.hot,      color: "text-gold-400" },
            { label: "SLA Breached",   value: counts.breached, color: "text-ruby-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.1em]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Lead table */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">
            Recent Leads <span className="text-slate-600 font-normal ml-1">· click a row to expand</span>
          </h2>
        </div>
        <LeadTable leads={leads} />

        <p className="mt-6 text-[11px] text-slate-700 text-center">
          Ask Magic Mike Admin · Our Town Properties, Inc. · Wilson, NC ·{" "}
          {isDevMode ? "Sample data — connect Supabase to see live leads" : "Live data"}
        </p>
      </main>
    </div>
  );
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
