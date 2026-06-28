export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { FileText, ArrowRight, TrendingUp, Home, Users, CheckSquare, Map, Clipboard, Star, Heart } from "lucide-react";
import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";
import { getLeadsForAdmin } from "@/lib/db/lead-repository";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";

interface DocTemplate {
  id:        string;
  title:     string;
  category:  "seller" | "buyer" | "transaction" | "marketing";
  icon:      React.ElementType;
  purpose:   string;
  dataNeeds: string[];
  outputs:   string[];
  hrefLabel: string;
  ready:     boolean;
}

const TEMPLATES: DocTemplate[] = [
  {
    id:        "cma-packet",
    title:     "CMA Packet",
    category:  "seller",
    icon:      TrendingUp,
    purpose:   "Comparative Market Analysis for seller consultations — comps, pricing strategy, estimated net proceeds.",
    dataNeeds: ["Property address", "Comparable sales (3–6)", "Current market conditions", "Seller timeline"],
    outputs:   ["CMA cover letter", "Comparable sales grid", "Pricing recommendation", "Net proceeds estimate", "Market trend summary"],
    hrefLabel: "Generate CMA",
    ready:     true,
  },
  {
    id:        "listing-presentation",
    title:     "Listing Presentation",
    category:  "seller",
    icon:      Star,
    purpose:   "Full listing presentation deck for seller appointments — Our Town Properties value proposition, marketing plan, pricing strategy.",
    dataNeeds: ["Seller name", "Property address", "Estimated value range", "Desired timeline"],
    outputs:   ["Brokerage value prop", "Marketing plan overview", "Digital + social strategy", "Pricing timeline", "Agent bio page"],
    hrefLabel: "Build Presentation",
    ready:     true,
  },
  {
    id:        "marketing-packet",
    title:     "Marketing Packet",
    category:  "marketing",
    icon:      FileText,
    purpose:   "Pre-listing marketing plan — photography brief, MLS description, social post templates, open house plan.",
    dataNeeds: ["Property address", "Key features (beds/baths/sqft)", "Price range", "Seller-approved highlights"],
    outputs:   ["Photography brief", "MLS description draft", "Social post copy (3 variants)", "Open house flyer text", "Feature sheet outline"],
    hrefLabel: "Create Marketing Plan",
    ready:     true,
  },
  {
    id:        "open-house-packet",
    title:     "Open House Packet",
    category:  "marketing",
    icon:      Home,
    purpose:   "Open house materials — sign-in sheet format, feature highlights, talking points, follow-up scripts.",
    dataNeeds: ["Property address", "Open house date/time", "Key features", "Price"],
    outputs:   ["Visitor sign-in format", "Property feature card", "Agent talking points", "Post-open-house follow-up script", "Buyer lead capture prompt"],
    hrefLabel: "Prep Open House",
    ready:     true,
  },
  {
    id:        "buyer-consultation",
    title:     "Buyer Consultation",
    category:  "buyer",
    icon:      Users,
    purpose:   "Buyer consultation guide — understanding needs, budget, timeline, financing, and setting realistic expectations.",
    dataNeeds: ["Buyer name", "Budget range", "Target neighborhoods", "Timeline", "Financing status"],
    outputs:   ["Buyer needs assessment form", "Neighborhood overview", "Timeline expectation setter", "Financing pre-approval checklist", "Buyer agency agreement outline"],
    hrefLabel: "Start Consultation",
    ready:     true,
  },
  {
    id:        "appointment-prep",
    title:     "Appointment Prep",
    category:  "buyer",
    icon:      Clipboard,
    purpose:   "Pre-appointment brief for agents — lead summary, conversation history, recommended talking points, key questions.",
    dataNeeds: ["Lead ID / lead record", "Appointment type", "Agent name"],
    outputs:   ["Lead summary card", "Conversation history digest", "Intent + signals summary", "Recommended talking points (3–5)", "Questions to ask lead"],
    hrefLabel: "Prep Appointment",
    ready:     true,
  },
  {
    id:        "closing-checklist",
    title:     "Closing Checklist",
    category:  "transaction",
    icon:      CheckSquare,
    purpose:   "Transaction closing checklist — all tasks from contract to keys, with responsible parties and due dates.",
    dataNeeds: ["Transaction address", "Closing date", "Buyer/seller names", "Agent names", "Attorney/title company"],
    outputs:   ["Pre-closing task list", "Due-diligence timeline", "Attorney coordination tasks", "Final walk-through checklist", "Day-of-closing guide"],
    hrefLabel: "Build Checklist",
    ready:     true,
  },
  {
    id:        "seller-roadmap",
    title:     "Seller Roadmap",
    category:  "seller",
    icon:      Map,
    purpose:   "Step-by-step seller journey guide — from listing decision through closing day, tailored to Wilson, NC market.",
    dataNeeds: ["Seller name", "Property address", "Target list date", "Estimated price range"],
    outputs:   ["Timeline overview (12 milestones)", "Pre-listing preparation tasks", "Showing process guide", "Offer evaluation guide", "Closing process summary"],
    hrefLabel: "Create Roadmap",
    ready:     true,
  },
  {
    id:        "buyer-roadmap",
    title:     "Buyer Roadmap",
    category:  "buyer",
    icon:      Heart,
    purpose:   "Step-by-step buyer journey guide — pre-approval through move-in, tailored to Wilson, NC market.",
    dataNeeds: ["Buyer name", "Budget", "Target timeline", "Pre-approval status"],
    outputs:   ["Buyer journey timeline", "Pre-approval path", "Property search strategy", "Offer process guide", "Inspection + closing summary"],
    hrefLabel: "Create Roadmap",
    ready:     true,
  },
];

const CATEGORY_LABELS: Record<DocTemplate["category"], string> = {
  seller:      "Seller Documents",
  buyer:       "Buyer Documents",
  transaction: "Transaction Documents",
  marketing:   "Marketing Documents",
};

const CATEGORY_COLORS: Record<DocTemplate["category"], string> = {
  seller:      "text-gold-300",
  buyer:       "text-emerald-300",
  transaction: "text-amber-300",
  marketing:   "text-blue-300",
};

const CATEGORY_BORDER: Record<DocTemplate["category"], string> = {
  seller:      "border-gold-400/20",
  buyer:       "border-emerald-400/20",
  transaction: "border-amber-400/20",
  marketing:   "border-blue-400/20",
};

function DocCard({ template }: { template: DocTemplate }) {
  const { Icon } = { Icon: template.icon };
  return (
    <div className={`rounded-xl border ${CATEGORY_BORDER[template.category]} bg-white/[0.015] flex flex-col`}>
      <div className="p-5 flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center shrink-0">
            <Icon className={`h-4 w-4 ${CATEGORY_COLORS[template.category]}`} aria-hidden="true" />
          </div>
          <div>
            <p className={`text-[9px] tracking-[0.18em] font-semibold uppercase mb-0.5 ${CATEGORY_COLORS[template.category]}`}>
              {CATEGORY_LABELS[template.category]}
            </p>
            <h3 className="text-sm font-semibold text-cream leading-snug">{template.title}</h3>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{template.purpose}</p>

        <div className="space-y-3">
          <div>
            <p className="text-[9px] tracking-[0.12em] uppercase font-semibold text-slate-700 mb-1.5">Data Required</p>
            <div className="flex flex-wrap gap-1">
              {template.dataNeeds.map((need) => (
                <span key={need} className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[9px] text-slate-600">
                  {need}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] tracking-[0.12em] uppercase font-semibold text-slate-700 mb-1.5">Generated Outputs</p>
            <ul className="space-y-0.5">
              {template.outputs.slice(0, 3).map((output) => (
                <li key={output} className="flex items-start gap-1.5 text-[10px] text-slate-600">
                  <span className="text-slate-700 mt-0.5 shrink-0">·</span>
                  {output}
                </li>
              ))}
              {template.outputs.length > 3 && (
                <li className="text-[10px] text-slate-700 pl-3">
                  + {template.outputs.length - 3} more
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className={`border-t ${CATEGORY_BORDER[template.category]} px-5 py-3`}>
        <Link
          href={`/admin/leads`}
          className={`flex items-center justify-between text-xs font-semibold ${CATEGORY_COLORS[template.category]} hover:opacity-80 transition-opacity group`}
        >
          <span>{template.hrefLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default async function DocumentsPage() {
  const [result, signals] = await Promise.all([
    getLeadsForAdmin(),
    loadIntelligenceSignals(),
  ]);

  const leads   = result.leads;
  const devMode = result.mode === "dev";

  const sellerCount = leads.filter((l) => l.intent.includes("sell") || l.intent.includes("list") || l.intent.includes("cash")).length;
  const buyerCount  = leads.filter((l) => l.intent.includes("buy")).length;
  const hotLeads    = leads.filter((l) => l.temperature === "urgent" || l.temperature === "hot").length;

  const categories = ["seller", "buyer", "transaction", "marketing"] as const;

  return (
    <AdminShell
      title="Document Engine"
      eyebrow="Operations"
      backHref="/admin"
      backLabel="← Command Center"
      devMode={devMode}
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {devMode && (
          <div className="rounded-xl border-2 border-amber-400/50 bg-amber-400/[0.07] px-5 py-4">
            <p className="text-sm font-bold text-amber-400 mb-1">DEV MODE — Sample Data Only</p>
            <p className="text-xs text-amber-300/70">
              Documents are generated from live lead data. Connect Supabase for real appointment prep, CMA packets, and consultation guides.
            </p>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Templates",       value: TEMPLATES.length,     color: "text-cream",       sub: "ready to generate" },
            { label: "Seller Leads",    value: sellerCount,          color: "text-gold-400",    sub: "CMA candidates" },
            { label: "Buyer Leads",     value: buyerCount,           color: "text-emerald-400", sub: "consultation ready" },
            { label: "Hot Leads",       value: hotLeads,             color: "text-ruby-400",    sub: "need appointment prep" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
              <div className={`font-bebas text-5xl leading-none ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">{s.label}</div>
              <div className="text-[10.5px] text-slate-600 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* How to use */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="h-9 w-9 rounded-xl border border-gold-400/20 bg-gold-400/[0.06] flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-gold-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cream mb-1">Document Engine</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate professionally structured documents from your live lead data. Open any lead from the Leads Inbox, then select
                a document type. Each document is pre-populated with the lead&rsquo;s information, conversation history, and intelligence signals.
                All documents are generated on-demand — nothing is stored or sent automatically.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold-400/30 bg-gold-400/[0.07] px-3.5 py-2 text-xs font-semibold text-gold-300 hover:bg-gold-400/[0.12] transition-colors"
            >
              Open Leads Inbox
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/admin/intelligence"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.04] transition-colors"
            >
              Intelligence Dashboard
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Templates by category */}
        {categories.map((cat) => {
          const catTemplates = TEMPLATES.filter((t) => t.category === cat);
          if (catTemplates.length === 0) return null;
          return (
            <section key={cat}>
              <AdminSectionHeading className={`mb-4 ${CATEGORY_COLORS[cat]}`}>
                {CATEGORY_LABELS[cat]}
              </AdminSectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catTemplates.map((template) => (
                  <DocCard key={template.id} template={template} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Pipeline context */}
        {signals.estimatedPipelineValue > 0 && (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.02] px-5 py-4">
            <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-emerald-400 mb-1">Pipeline Context</p>
            <p className="text-xs text-slate-500">
              Estimated pipeline value:{" "}
              <span className="text-emerald-300 font-semibold">
                ${(signals.estimatedPipelineValue / 1_000).toFixed(0)}K
              </span>{" "}
              · {signals.predictedClosings30d} predicted closings in the next 30 days ·{" "}
              Avg days to close: {signals.avgDaysToClose || "—"}
            </p>
          </div>
        )}

        <p className="text-xs text-slate-700 text-center pb-4">
          Document Engine · Our Town Properties, Inc. · Wilson, NC ·{" "}
          {devMode ? "Sample data — connect Supabase for live generation" : "Live data"}
        </p>
      </main>
    </AdminShell>
  );
}
