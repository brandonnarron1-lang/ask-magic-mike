import type { ReactNode } from "react";
import Link from "next/link";
import {
  loadAdminAgentAllocationView,
  type AdminAgentAllocationAgent,
  type AdminAssignableLead,
} from "../../lib/adminAgentAllocationView";
import type { AdminAssignmentAuditRecord } from "../../lib/adminAssignmentAudit";
import { assignLeadToAgentAction, unassignLeadAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function shortDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function MetricCard({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-lg border border-[#cda24a24] bg-[#0b0b0b] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8f8778]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 text-[#8f8778]">{note}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#cda24a33] bg-[#cda24a14] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#e2c06f]">
      {children}
    </span>
  );
}

function AgentSelect({ agents }: { agents: AdminAgentAllocationAgent[] }) {
  const activeAgents = agents.filter((agent) => agent.availability === "active");
  return (
    <select
      required
      name="agent_id"
      className="min-w-44 rounded-md border border-[#cda24a33] bg-[#050505] px-3 py-2 text-xs font-semibold text-[#f4ead4]"
      aria-label="Agent"
    >
      <option value="">Select agent</option>
      {activeAgents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name}
        </option>
      ))}
    </select>
  );
}

function AssignControls({
  lead,
  agents,
  compact = false,
}: {
  lead: AdminAssignableLead;
  agents: AdminAgentAllocationAgent[];
  compact?: boolean;
}) {
  return (
    <form action={assignLeadToAgentAction} className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
      <input type="hidden" name="lead_id" value={lead.id} />
      <AgentSelect agents={agents} />
      <button
        type="submit"
        className="rounded-md border border-[#cda24a] bg-[#cda24a] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black"
      >
        Assign
      </button>
    </form>
  );
}

function UnassignControl({ lead }: { lead: AdminAssignableLead }) {
  return (
    <form action={unassignLeadAction}>
      <input type="hidden" name="lead_id" value={lead.id} />
      <button
        type="submit"
        className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
      >
        Unassign
      </button>
    </form>
  );
}

function LeadSummary({ lead }: { lead: AdminAssignableLead }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#f4ead4]">
            {lead.address_raw || lead.displayName || lead.id}
          </p>
          <p className="mt-1 text-xs text-[#d9ceb8]">{lead.contactSummary}</p>
        </div>
        <Badge>{lead.status}</Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Intent</dt>
          <dd className="mt-1 text-[#d9ceb8]">{lead.primary_intent || "Unknown"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Timeline</dt>
          <dd className="mt-1 text-[#d9ceb8]">{lead.timeline_months ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Source</dt>
          <dd className="mt-1 text-[#d9ceb8]">{lead.source || "Unknown"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Created</dt>
          <dd className="mt-1 text-[#d9ceb8]">{shortDate(lead.created_at)}</dd>
        </div>
      </dl>
    </div>
  );
}

function AgentCard({ agent }: { agent: AdminAgentAllocationAgent }) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl text-[#f4ead4]">{agent.name}</h3>
          <p className="mt-2 text-sm text-[#d9ceb8]">{agent.email || "No email"}</p>
          <p className="mt-1 text-xs text-[#8f8778]">{agent.phone || "No phone"}</p>
        </div>
        <Badge>{agent.availability}</Badge>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Current leads</dt>
          <dd className="mt-1 text-[#f4ead4]">{agent.currentAssignedLeadCount}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Hot leads</dt>
          <dd className="mt-1 text-[#f4ead4]">{agent.hotLeadCount}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Capacity</dt>
          <dd className="mt-1 text-[#f4ead4]">{agent.max_daily_leads ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Priority</dt>
          <dd className="mt-1 text-[#f4ead4]">{agent.priority_score ?? "Unknown"}</dd>
        </div>
      </dl>
    </article>
  );
}

function ActivityRow({ event }: { event: AdminAssignmentAuditRecord }) {
  return (
    <article className="rounded-md border border-white/10 bg-[#080808] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#f4ead4]">
            {event.action.replace("_", " ")} lead {event.lead_id}
          </p>
          <p className="mt-1 text-xs text-[#8f8778]">
            {event.source} / {event.actor}
          </p>
        </div>
        <Badge>{shortDate(event.created_at)}</Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Previous agent</dt>
          <dd className="mt-1 break-all text-[#d9ceb8]">{event.previous_agent_id || "Unassigned"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#8f8778]">New agent</dt>
          <dd className="mt-1 break-all text-[#d9ceb8]">{event.new_agent_id || "Unassigned"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Status</dt>
          <dd className="mt-1 text-[#d9ceb8]">{event.assignment_status}</dd>
        </div>
      </dl>
    </article>
  );
}

export default async function AdminAllocationPage({
  searchParams,
}: {
  searchParams?: Promise<{ assignment_action?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const summary = await loadAdminAgentAllocationView();

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f4ead4]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-[#cda24a33] pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">
                AdminOps
              </p>
              <h1 className="mt-3 font-serif text-4xl">Agent allocation</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d9ceb8]">
                Protected AdminOps controls for reviewing agent load, assigning captured leads, and tracking assignment state.
                Assignment controls are live admin actions and write an audit record after successful updates.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
              <Link
                href="/admin/leads"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Lead inbox
              </Link>
              <Link
                href="/admin/reporting"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Reporting
              </Link>
            </nav>
          </div>
          {params.assignment_action ? (
            <p className="mt-4 rounded-md border border-[#cda24a33] bg-[#cda24a14] p-3 text-sm text-[#f4ead4]">
              Assignment action result: {params.assignment_action.replaceAll("_", " ")}
            </p>
          ) : null}
        </header>

        {!summary.configured || summary.error ? (
          <section className="mb-6 rounded-lg border border-[#cda24a33] bg-[#0d0d0d] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
              Allocation status
            </p>
            <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">
              {summary.configured ? "Allocation data unavailable" : "Supabase not configured"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
              {summary.error || "Agent allocation renders safely empty until Supabase admin variables are configured."}
            </p>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Unassigned leads" value={summary.kpis.unassignedLeads} />
          <MetricCard label="Hot unassigned" value={summary.kpis.hotUnassigned} />
          <MetricCard label="Assigned active leads" value={summary.kpis.assignedActiveLeads} />
          <MetricCard label="Available agents" value={summary.kpis.availableAgents} />
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {summary.agents.length ? summary.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          )) : (
            <p className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5 text-sm text-[#8f8778]">
              No agents returned by the configured agent table.
            </p>
          )}
        </section>

        <div className="mt-8 grid gap-5">
          <Panel title="Unassigned hot leads">
            <div className="space-y-4">
              {summary.unassignedHotLeads.length ? summary.unassignedHotLeads.map((lead) => (
                <article key={lead.id} className="rounded-md border border-[#cda24a33] bg-[#080808] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <LeadSummary lead={lead} />
                    <div className="min-w-40 text-right">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8778]">
                        Assignment score
                      </p>
                      <p className="mt-1 font-serif text-3xl text-[#f4ead4]">{lead.assignmentScore}</p>
                    </div>
                  </div>
                  <AssignControls lead={lead} agents={summary.agents} />
                </article>
              )) : (
                <p className="text-sm text-[#8f8778]">No unassigned hot leads in the bounded queue.</p>
              )}
            </div>
          </Panel>

          <Panel title="Unassigned lead queue">
            <div className="space-y-4">
              {summary.unassignedRecentLeads.length ? summary.unassignedRecentLeads.map((lead) => (
                <article key={lead.id} className="rounded-md border border-[#cda24a24] bg-[#080808] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <LeadSummary lead={lead} />
                    <div className="min-w-40 text-right">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8778]">
                        Assignment score
                      </p>
                      <p className="mt-1 font-serif text-3xl text-[#f4ead4]">{lead.assignmentScore}</p>
                    </div>
                  </div>
                  <AssignControls lead={lead} agents={summary.agents} />
                </article>
              )) : (
                <p className="text-sm text-[#8f8778]">No active unassigned leads.</p>
              )}
            </div>
          </Panel>

          <Panel title="Assigned leads by agent">
            <div className="space-y-5">
              {summary.assignedLeadsByAgent.length ? summary.assignedLeadsByAgent.map(({ agent, leads }) => (
                <section key={agent.id} className="rounded-md border border-white/10 bg-[#080808] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-2xl text-[#f4ead4]">{agent.name}</h3>
                      <p className="mt-1 text-xs text-[#8f8778]">
                        {agent.currentAssignedLeadCount} active assigned leads
                      </p>
                    </div>
                    <Badge>{agent.availability}</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {leads.length ? leads.map((lead) => (
                      <article key={lead.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                        <LeadSummary lead={lead} />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <AssignControls lead={lead} agents={summary.agents} compact />
                          <UnassignControl lead={lead} />
                        </div>
                      </article>
                    )) : (
                      <p className="text-sm text-[#8f8778]">No active leads assigned.</p>
                    )}
                  </div>
                </section>
              )) : (
                <p className="text-sm text-[#8f8778]">No agents available for assignment sections.</p>
              )}
            </div>
          </Panel>

          <Panel title="Recent assignment activity">
            {summary.auditActivityError ? (
              <p className="text-sm text-[#8f8778]">{summary.auditActivityError}</p>
            ) : summary.recentAssignmentActivity.length ? (
              <div className="space-y-3">
                {summary.recentAssignmentActivity.map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8f8778]">
                {summary.auditActivityConfigured
                  ? "No recent assignment audit events returned."
                  : "Assignment audit activity is unavailable until Supabase admin variables are configured."}
              </p>
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="Source attribution">
              <ul className="space-y-2 text-sm text-[#d9ceb8]">
                {summary.sourceMix.map((item) => (
                  <li key={item.value} className="flex justify-between gap-3">
                    <span>{item.value}</span>
                    <span className="text-[#f4ead4]">{item.count}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Intent mix">
              <ul className="space-y-2 text-sm text-[#d9ceb8]">
                {summary.intentMix.map((item) => (
                  <li key={item.value} className="flex justify-between gap-3">
                    <span>{item.value}</span>
                    <span className="text-[#f4ead4]">{item.count}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Timeline mix">
              <ul className="space-y-2 text-sm text-[#d9ceb8]">
                {summary.timelineMix.map((item) => (
                  <li key={item.value} className="flex justify-between gap-3">
                    <span>{item.value}</span>
                    <span className="text-[#f4ead4]">{item.count}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <Panel title="Stale unassigned leads">
            <div className="space-y-3">
              {summary.staleUnassignedLeads.length ? summary.staleUnassignedLeads.map((lead) => (
                <article key={lead.id} className="rounded-md border border-[#cda24a24] bg-[#080808] p-4">
                  <LeadSummary lead={lead} />
                  <AssignControls lead={lead} agents={summary.agents} />
                </article>
              )) : (
                <p className="text-sm text-[#8f8778]">No stale unassigned leads in the bounded queue.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
