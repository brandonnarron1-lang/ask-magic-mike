import type { ReactNode } from "react";
import Link from "next/link";
import { loadDatabaseRevivalView } from "../../lib/databaseRevivalView";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import type {
  RevivalCandidate,
  RevivalCohortKey,
} from "../../lib/revival/intelligence";
import { REVIVAL_COHORT_KEYS } from "../../lib/revival/intelligence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StateFilter = "all" | "draft_eligible" | "operator_review";

function parseState(value?: string): StateFilter {
  return value === "draft_eligible" || value === "operator_review" ? value : "all";
}

function parseCohort(value?: string): RevivalCohortKey | "all" {
  return REVIVAL_COHORT_KEYS.includes(value as RevivalCohortKey) ? value as RevivalCohortKey : "all";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function MetricCard({ label, value, note, tone = "gold" }: {
  label: string;
  value: ReactNode;
  note: string;
  tone?: "gold" | "green" | "ruby" | "cyan";
}) {
  const tones = {
    gold: "border-[#cda24a44] bg-[linear-gradient(145deg,#171108,#090909)] text-[#f0cf79]",
    green: "border-[#4a8c6f55] bg-[linear-gradient(145deg,#071712,#090909)] text-[#83dab4]",
    ruby: "border-[#a21f3d55] bg-[linear-gradient(145deg,#21070e,#090909)] text-[#ff8ca7]",
    cyan: "border-[#4baab855] bg-[linear-gradient(145deg,#06171b,#090909)] text-[#7ee7f1]",
  };
  return (
    <article className={`rounded-2xl border p-4 shadow-[0_20px_60px_rgba(0,0,0,.3)] ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9b9182]">{label}</p>
      <p className="mt-3 font-serif text-4xl">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#9b9182]">{note}</p>
    </article>
  );
}

function StatusPill({ candidate }: { candidate: RevivalCandidate }) {
  const eligible = candidate.eligibility === "draft_eligible";
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
      eligible
        ? "border-[#4a8c6f66] bg-[#071712] text-[#83dab4]"
        : "border-[#cda24a55] bg-[#171207] text-[#e4c36f]"
    }`}>
      {eligible ? "Draft eligible" : "Operator review"}
    </span>
  );
}

function CandidateCard({ candidate }: { candidate: RevivalCandidate }) {
  const location = candidate.city
    ? `${candidate.city}${candidate.zip ? ` · ${candidate.zip}` : ""}`
    : candidate.zip || "Location not recorded";
  return (
    <article className="[content-visibility:auto] rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,15,15,.98),rgba(5,5,5,.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,.34)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill candidate={candidate} />
            <span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-[#a99f90]">
              {candidate.cohortLabel}
            </span>
          </div>
          <h2 className="mt-4 font-serif text-2xl text-[#f4ead4] sm:text-3xl">
            {location} · {titleCase(candidate.leadType)}
          </h2>
          <p className="mt-2 text-xs leading-5 text-[#8f8778]">
            Lead {candidate.leadId.slice(0, 8)}… · {candidate.daysDormant} days dormant · Source {candidate.source}
          </p>
        </div>
        <div className="grid min-w-[9rem] grid-cols-2 gap-2 text-center">
          <div className="rounded-xl border border-[#cda24a44] bg-[#171207] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Priority</p>
            <p className="mt-1 font-serif text-2xl text-[#f0cf79]">{candidate.priorityScore}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Confidence</p>
            <p className="mt-1 font-serif text-2xl text-[#f4ead4]">{percent(candidate.confidence)}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Current owner", candidate.assignedAgentId && !candidate.assignedAgentActive
            ? `${candidate.assignedAgentName || "Assigned agent"} · Inactive — reassign`
            : candidate.assignedAgentName || "Unassigned"],
          ["Status / intent", `${titleCase(candidate.status)} · ${titleCase(candidate.intent)}`],
          ["Approved paths", candidate.approvedChannels.length ? candidate.approvedChannels.map(titleCase).join(", ") : "None recorded"],
          ["Open work", `${candidate.openTaskCount} task(s) · ${candidate.sequenceStatuses.length} sequence conflict(s)`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/[.08] bg-black/35 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#746d62]">{label}</p>
            <p className="mt-2 text-xs leading-5 text-[#d9ceb8]">{value}</p>
          </div>
        ))}
      </div>

      {candidate.blockingReasons.length ? (
        <div className="mt-4 rounded-xl border border-[#a21f3d44] bg-[#21070e88] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff8ca7]">Resolve before drafting</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidate.blockingReasons.map((reason) => (
              <span key={reason} className="rounded-full border border-[#a21f3d55] px-2.5 py-1 text-[10px] text-[#ffdbe4]">
                {titleCase(reason)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[#4a8c6f44] bg-[#07171288] p-4 text-xs leading-6 text-[#d9f4e8]">
          Purpose-specific permission, destination, owner, task, appointment, and sequence checks are clear for an internal draft review. This does not authorize enrollment or sending.
        </div>
      )}

      <details className="mt-4 rounded-xl border border-[#4baab833] bg-[#06171b88] p-4">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.14em] text-[#7ee7f1]">
          Review evidence, score, and internal draft
        </summary>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d1aa53]">Explainable score</h3>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[#bdb2a1]">
              {candidate.scoreFactors.map((factor) => (
                <li key={factor.code} className="flex gap-3">
                  <span className={factor.points >= 0 ? "text-[#83dab4]" : "text-[#ff8ca7]"}>
                    {factor.points >= 0 ? "+" : ""}{factor.points}
                  </span>
                  <span>{factor.explanation}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#d1aa53]">Permission evidence</h3>
            <ul className="mt-3 space-y-1 text-xs text-[#bdb2a1]">
              {candidate.permissionEvidence.length
                ? candidate.permissionEvidence.map((evidence) => <li key={evidence}>• {evidence}</li>)
                : <li>• No explicit ongoing permission recorded.</li>}
            </ul>
          </section>
          <section className="rounded-xl border border-[#cda24a44] bg-black/45 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffcc67]">{candidate.draft.label}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8f8778]">
              {candidate.draft.channel} · {titleCase(candidate.draft.purpose)}
            </p>
            {candidate.draft.subject ? (
              <>
                <p className="mt-4 text-xs font-bold text-[#f4ead4]">Subject idea</p>
                <p className="mt-1 text-sm leading-6 text-[#d9ceb8]">{candidate.draft.subject}</p>
              </>
            ) : null}
            <p className="mt-4 text-xs font-bold text-[#f4ead4]">Draft body</p>
            <p className="mt-1 text-sm leading-6 text-[#d9ceb8]">{candidate.draft.body}</p>
            <p className="mt-4 text-xs font-bold text-[#f4ead4]">Required factual checks</p>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-[#a99f90]">
              {candidate.draft.factualChecks.map((check) => <li key={check}>• {check}</li>)}
            </ul>
          </section>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="max-w-3xl text-xs leading-5 text-[#8f8778]">{candidate.recommendedNextStep}</p>
          <Link href={`/admin/leads/${candidate.leadId}`} className="rounded-full border border-[#cda24a66] bg-[#cda24a14] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#f0cf79]">
            Review canonical lead
          </Link>
        </div>
      </details>
    </article>
  );
}

export default async function DatabaseRevivalPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string; cohort?: string }>;
}) {
  const principal = await requireLeadCenterPermission("report:view");
  const data = await loadDatabaseRevivalView(principal);
  const params = searchParams ? await searchParams : {};
  const state = parseState(params.state);
  const cohort = parseCohort(params.cohort);
  const filtered = data.candidates.filter((candidate) =>
    (state === "all" || candidate.eligibility === state)
    && (cohort === "all" || candidate.cohort === cohort));
  const visible = filtered.slice(0, 50);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_85%_0%,rgba(75,170,184,.13),transparent_30%),radial-gradient(circle_at_15%_5%,rgba(205,162,74,.13),transparent_32%),#040404] px-4 py-7 text-[#f4ead4] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-3xl border border-[#cda24a33] bg-[linear-gradient(135deg,rgba(20,17,11,.97),rgba(4,4,4,.99))] p-5 shadow-[0_35px_110px_rgba(0,0,0,.58)] sm:p-8">
          <div className="grid gap-7 xl:grid-cols-[1.35fr_.65fr] xl:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#d1aa53]">Ask Magic Mike · First-party moat</p>
              <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[1.02] text-[#f4ead4] sm:text-6xl">
                Revive relationships with evidence—not a blast button.
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#c9bdab] sm:text-base">
                A protected, deterministic review of stale non-terminal leads using current ownership, purpose-specific permission, sequence conflicts, open work, source, geography, timing, and explainable priority. It creates no cohort enrollment and sends nothing.
              </p>
            </div>
            <aside className="rounded-2xl border border-[#4baab844] bg-[#06171b99] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7ee7f1]">Authority boundary</p>
              <p className="mt-3 text-sm leading-6 text-[#d9f5f8]">
                Read, classify, rank, and draft only. Consumer email, SMS, calls, push, sequence creation, enrollment, scheduling, and delivery remain disabled and require separate approval.
              </p>
              <p className="mt-3 text-xs leading-5 text-[#8fbac0]">Generated {new Date(data.generatedAt).toLocaleString("en-US")}</p>
            </aside>
          </div>
        </header>

        <div className="mt-5">
          {data.error ? (
            <div className="rounded-2xl border border-[#a21f3d66] bg-[#21070e] p-5 text-sm text-[#ffdbe4]">
              <strong className="text-[#ff8ca7]">Database revival query unavailable.</strong> {data.error}. No mutation or provider action was attempted.
            </div>
          ) : !data.configured ? (
            <div className="rounded-2xl border border-[#cda24a55] bg-[#171207] p-5 text-sm text-[#f4ead4]">
              Canonical Neon is not configured in this environment. The command remains empty instead of inventing candidates.
            </div>
          ) : !data.detailsVisible ? (
            <div className="rounded-2xl border border-[#4baab855] bg-[#06171b] p-5 text-sm text-[#d9f5f8]">
              Aggregate cohort totals are available. Lead-level details require an approved lead-view role.
            </div>
          ) : data.scopedToAssignedLeads ? (
            <div className="rounded-2xl border border-[#4a8c6f55] bg-[#071712] p-5 text-sm text-[#d9f4e8]">
              This view is server-scoped to leads assigned to your approved agent identity.
            </div>
          ) : null}
        </div>

        {data.configured && !data.retentionPolicyConfigured ? (
          <div className="mt-5 rounded-2xl border border-[#a21f3d66] bg-[#21070e] p-5 text-sm leading-6 text-[#ffdbe4]">
            <strong className="text-[#ff8ca7]">Retention approval required.</strong> No revival candidate can be draft eligible until an owner/BIC-approved maximum record age is configured. Current records remain read-only operator-review items.
          </div>
        ) : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Database revival summary">
          <MetricCard label="Rows evaluated" value={data.rowsEvaluated} note="Bounded canonical read" />
          <MetricCard label="Stale candidates" value={data.staleCandidates} note="Non-terminal, live, deduplicated" tone="cyan" />
          <MetricCard label="Draft eligible" value={data.draftEligible} note="Still requires human review and release approval" tone="green" />
          <MetricCard label="Operator review" value={data.operatorReview} note="Has one or more blocking conflicts" tone="ruby" />
          <MetricCard label="Sequence conflicts" value={data.sequenceConflicts} note="Existing journey owns communication" />
          <MetricCard label="Task conflicts" value={data.taskConflicts} note="Open work already owns next action" />
          <MetricCard label="Unassigned" value={data.unassigned} note="Cannot proceed without an owner" tone="ruby" />
          <MetricCard label="Inactive owners" value={data.inactiveOwners} note="Requires approved reassignment" tone="ruby" />
          <MetricCard label="Retention review" value={data.retentionReviewBlocked} note={data.retentionPolicyConfigured ? `Outside approved ${data.retentionMaxAgeDays}-day window` : "Policy window is not configured"} tone="ruby" />
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-[#080808] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Cohort map</p>
              <h2 className="mt-2 font-serif text-3xl text-[#f4ead4]">Where useful local value can reopen a conversation</h2>
            </div>
            <p className="max-w-xl text-xs leading-5 text-[#8f8778]">Counts exclude tests, suppressed records, duplicates, terminal stages, and leads below cohort-specific dormancy thresholds. Active appointments remain visible only as blocking conflicts.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.cohorts.map((row) => (
              <Link key={row.key} href={`/admin/revival?state=${state}&cohort=${row.key}`} className="rounded-xl border border-white/[.08] bg-white/[.025] p-4 transition hover:border-[#cda24a55] hover:bg-[#cda24a0b]">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#e2c06f]">{row.label}</p>
                <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{row.total}</p>
                <p className="mt-2 text-xs leading-5 text-[#8f8778]">{row.draftEligible} draft eligible · {row.operatorReview} review · average priority {row.averagePriority}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-[#080808] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap gap-2" aria-label="Revival eligibility filters">
              {(["all", "draft_eligible", "operator_review"] as const).map((value) => (
                <Link key={value} href={`/admin/revival?state=${value}&cohort=${cohort}`} className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  state === value ? "border-[#cda24a] bg-[#cda24a] text-black" : "border-white/10 bg-black/30 text-[#a89c8b]"
                }`}>
                  {titleCase(value)}
                </Link>
              ))}
            </nav>
            <Link href="/admin/revival" className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7ee7f1]">Reset filters</Link>
          </div>
        </section>

        <section className="mt-5 space-y-4" aria-label="Database revival candidates">
          {visible.length ? visible.map((candidate) => <CandidateCard key={candidate.leadId} candidate={candidate} />) : (
            <div className="rounded-2xl border border-white/10 bg-[#080808] p-8 text-center">
              <p className="font-serif text-3xl text-[#f4ead4]">No candidates match this review.</p>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#8f8778]">That can mean the database is healthy, no explicit ongoing permission exists, the current role has aggregate-only access, or canonical records have not yet populated this environment.</p>
            </div>
          )}
        </section>

        {filtered.length > visible.length ? (
          <p className="mt-4 text-center text-xs text-[#8f8778]">Showing the first 50 of {filtered.length} ranked candidates. Narrow the cohort or eligibility filter for a smaller review.</p>
        ) : null}
        {data.rowsCapped ? (
          <p className="mt-3 text-center text-xs text-[#ffcc67]">The canonical read reached its 1,000-row safety cap. Review data coverage before treating cohort totals as complete.</p>
        ) : null}
      </div>
    </main>
  );
}
