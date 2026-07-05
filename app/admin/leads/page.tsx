import type { ReactNode } from "react";
import { loadAdminLeadInbox, type AdminLeadView } from "../../lib/adminLeadView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIELD_LABELS: Array<[keyof AdminLeadView["attribution"], string]> = [
  ["source", "Source"],
  ["medium", "Medium"],
  ["campaign", "Campaign"],
  ["placement", "Placement"],
  ["embed_host", "Embed host"],
  ["parent_url", "Parent URL"],
  ["landing_page", "Landing"],
  ["current_path", "Current path"],
  ["device_category", "Device"],
];

function shortDate(value: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#cda24a33] bg-[#cda24a14] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#e2c06f]">
      {children}
    </span>
  );
}

function EmptyState({ configured, error }: { configured: boolean; error?: string }) {
  return (
    <section className="rounded-lg border border-[#cda24a33] bg-[#0d0d0d] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
        Lead inbox
      </p>
      <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">No leads to review</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
        {configured
          ? error || "No lead rows were returned by the configured lead store."
          : "Supabase is not configured in this environment, so the protected inbox is empty."}
      </p>
    </section>
  );
}

function LeadCard({ lead }: { lead: AdminLeadView }) {
  const visibleAttribution = FIELD_LABELS.map(([key, label]) => ({
    key,
    label,
    value: lead.attribution[key],
  })).filter((item) => item.value);

  return (
    <article className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
            {lead.funnel_type} / {lead.lead_source_surface}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[#f4ead4]">{lead.primary_detail}</h2>
          <p className="mt-2 text-sm text-[#d9ceb8]">{lead.contact_summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{lead.status}</Badge>
          {lead.routing_ready ? <Badge>Routing ready</Badge> : null}
          {lead.assigned_agent_id ? <Badge>Assigned</Badge> : <Badge>Unassigned</Badge>}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Created</dt>
          <dd className="mt-1 text-[#f4ead4]">{shortDate(lead.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Name</dt>
          <dd className="mt-1 text-[#f4ead4]">{lead.name || "Not provided"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Timeline</dt>
          <dd className="mt-1 text-[#f4ead4]">{lead.timeline || "Not provided"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Agent</dt>
          <dd className="mt-1 text-[#f4ead4]">{lead.assigned_agent_id || "Unassigned"}</dd>
        </div>
      </dl>

      {lead.question || lead.notes || lead.condition ? (
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[#d9ceb8]">
            <span className="block text-xs uppercase tracking-[0.14em] text-[#8f8778]">Question</span>
            {lead.question || "Not provided"}
          </p>
          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[#d9ceb8]">
            <span className="block text-xs uppercase tracking-[0.14em] text-[#8f8778]">Condition</span>
            {lead.condition || "Not provided"}
          </p>
          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[#d9ceb8]">
            <span className="block text-xs uppercase tracking-[0.14em] text-[#8f8778]">Notes</span>
            {lead.notes || "Not provided"}
          </p>
        </div>
      ) : null}

      <div className="mt-5 rounded-md border border-[#cda24a24] bg-[#080808] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">
          Attribution
        </p>
        <p className="mt-2 text-sm text-[#d9ceb8]">{lead.attribution_summary}</p>
        {visibleAttribution.length ? (
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {visibleAttribution.map((item) => (
              <div key={item.key}>
                <dt className="uppercase tracking-[0.14em] text-[#8f8778]">{item.label}</dt>
                <dd className="mt-1 break-words text-[#f4ead4]">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </article>
  );
}

export default async function AdminLeadsPage() {
  const inbox = await loadAdminLeadInbox();

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f4ead4]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-[#cda24a33] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">
            AdminOps
          </p>
          <h1 className="mt-3 font-serif text-4xl">Lead inbox and routing readiness</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d9ceb8]">
            Protected, read-only review of normalized Ask Magic Mike leads. Use this surface to
            inspect contact fields, attribution, status, and assignment readiness before routing.
          </p>
        </header>

        {!inbox.leads.length ? (
          <EmptyState configured={inbox.configured} error={inbox.error} />
        ) : (
          <section className="space-y-4">
            {inbox.leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
