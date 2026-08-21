import Link from "next/link";

import {
  KPI_METRIC_DEFINITIONS,
  buildKpiBaselineRegister,
  formatKpiValue,
  type KpiBaselineSnapshot,
  type KpiMetricCategory,
  type KpiMetricDefinition,
} from "../../../lib/growth/kpi-targets";
import { loadGrowthIntelligence } from "../../../lib/growthIntelligenceView";
import {
  loadGrowthKpiTargetRegister,
  type GrowthKpiTargetVersionRow,
} from "../../../lib/persistence/neonGrowthKpiTargets";
import { isPreviewDataDisabled } from "../../../../src/lib/preview-security";
import { hasLeadCenterPermission } from "../../../../src/lib/admin/rbac-policy";
import { requireLeadCenterPermission } from "../../../../src/lib/admin/rbac-session";
import { recordGrowthKpiTargetAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOWS = [30, 90, 365] as const;
const CATEGORY_LABELS: Record<KpiMetricCategory, string> = {
  acquisition: "Acquisition truth",
  response: "Response SLA",
  conversion: "Conversion outcomes",
  database: "Database value",
  economics: "Unit economics",
  portfolio: "Owned versus rented demand",
  operations: "Agent operations",
  experimentation: "Learning velocity",
  experience_and_conversion_quality: "Experience and conversion quality",
  trust_and_delivery: "Trust and delivery",
};

const ACTION_MESSAGES: Record<string, { tone: string; message: string }> = {
  target_recorded: {
    tone: "border-emerald-400/40 bg-emerald-950/40 text-emerald-100",
    message: "The KPI target version and immutable audit event were recorded.",
  },
  already_recorded: {
    tone: "border-cyan-300/40 bg-cyan-950/40 text-cyan-100",
    message: "That exact evidence-backed target version was already recorded; no duplicate was created.",
  },
  confirmation_required: {
    tone: "border-amber-300/40 bg-amber-950/40 text-amber-100",
    message: "Explicit confirmation is required before recording a target version.",
  },
  rate_limited: {
    tone: "border-amber-300/40 bg-amber-950/40 text-amber-100",
    message: "The protected target-write limit was reached. Wait for the current operating window before trying again.",
  },
};

function parseWindow(value: string | undefined) {
  const parsed = Number(value);
  return WINDOWS.includes(parsed as (typeof WINDOWS)[number])
    ? parsed as (typeof WINDOWS)[number]
    : 30;
}

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "Unknown";
}

function BaselineFlag({ state }: { state: KpiBaselineSnapshot["state"] }) {
  const tone = state === "measured"
    ? "border-emerald-400/40 bg-emerald-950/40 text-emerald-200"
    : state === "directional"
      ? "border-cyan-300/40 bg-cyan-950/35 text-cyan-100"
      : state === "not_instrumented"
        ? "border-rose-300/35 bg-rose-950/35 text-rose-100"
        : "border-amber-300/35 bg-amber-950/35 text-amber-100";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${tone}`}>
      {state.replaceAll("_", " ")}
    </span>
  );
}

function CurrentTarget({
  metric,
  version,
}: {
  metric: KpiMetricDefinition;
  version?: GrowthKpiTargetVersionRow;
}) {
  if (!version) return <p className="text-sm text-[#8f8778]">No target version recorded.</p>;
  return (
    <div className="rounded-xl border border-[#cda24a33] bg-[#120e07] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#cda24a]">Latest target version</p>
        <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">
          {version.status}
        </span>
      </div>
      <p className="mt-3 font-serif text-2xl text-[#f0cf79]">
        {version.status === "retired" ? "Retired" : formatKpiValue(version.targetValue, metric.unit)}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#a99f90]">{version.rationale}</p>
      <p className="mt-2 text-[10px] text-[#7f776b]">
        Baseline {formatKpiValue(version.baselineValue, metric.unit)} · {version.baselineSampleSize} observations · {version.baselineWindowDays}d
      </p>
    </div>
  );
}

function TargetForm({
  metric,
  baseline,
  windowDays,
}: {
  metric: KpiMetricDefinition;
  baseline: KpiBaselineSnapshot;
  windowDays: 30 | 90 | 365;
}) {
  return (
    <details className="group rounded-xl border border-[#4baab833] bg-[#061417]">
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#9edbe2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9edbe2]">
        <span className="flex items-center justify-between gap-3">
          Record a new version
          <span aria-hidden="true" className="text-lg transition group-open:rotate-45">+</span>
        </span>
      </summary>
      <form action={recordGrowthKpiTargetAction} className="space-y-4 border-t border-[#4baab833] p-4">
        <input type="hidden" name="metric_key" value={metric.key} />
        <input type="hidden" name="window_days" value={windowDays} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#d9ceb8]">
            Version status
            <select name="status" defaultValue="draft" className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-[#f4ead4]">
              <option value="draft">Draft — no approval claim</option>
              <option value="approved" disabled={baseline.state !== "measured"}>Approved — measured baseline required</option>
              <option value="retired">Retired — clear prior target</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#d9ceb8]">
            Target value ({metric.unit})
            <input
              name="target_value"
              inputMode="decimal"
              type="number"
              min="0"
              max={metric.unit === "percentage" ? 100 : undefined}
              step={metric.unit === "count" ? 1 : "any"}
              disabled={baseline.state !== "measured"}
              className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-[#f4ead4]"
              placeholder={baseline.state === "measured" ? "Enter an evidence-reviewed target" : "Unavailable until the baseline is measured"}
            />
          </label>
        </div>
        <label className="block text-xs font-semibold text-[#d9ceb8]">
          Rationale
          <textarea
            name="rationale"
            required
            minLength={20}
            maxLength={500}
            rows={3}
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-[#f4ead4]"
            placeholder="State the evidence, operating intent, review horizon, and assumptions. Do not include consumer PII."
          />
        </label>
        <label className="block text-xs font-semibold text-[#d9ceb8]">
          Approval or retirement reference
          <input
            name="approval_reference"
            maxLength={160}
            className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-[#f4ead4]"
            placeholder="Required only for approved or retired versions"
          />
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-5 text-[#c9bdab]">
          <input name="confirm" value="yes" type="checkbox" required className="mt-1 h-4 w-4" />
          <span>I confirm this records an append-only internal target version. It does not publish, send, spend, change routing, or improve a KPI by itself.</span>
        </label>
        <button className="min-h-11 rounded-full border border-[#4baab866] bg-[#4baab820] px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#bff8ff] hover:bg-[#4baab835]">
          Record target version
        </button>
      </form>
    </details>
  );
}

export default async function GrowthTargetsPage({
  searchParams,
}: {
  searchParams?: Promise<{ window?: string; target_action?: string }>;
}) {
  const principal = await requireLeadCenterPermission("report:view");
  const params = searchParams ? await searchParams : {};
  const windowDays = parseWindow(params.window);
  const [growth, register] = await Promise.all([
    loadGrowthIntelligence(windowDays),
    loadGrowthKpiTargetRegister(),
  ]);
  const baselines = buildKpiBaselineRegister(growth);
  const baselineByMetric = new Map(baselines.map((baseline) => [baseline.metricKey, baseline]));
  const canManage = Boolean(principal && hasLeadCenterPermission(principal.role, "growth:manage"));
  const previewReadOnly = isPreviewDataDisabled();
  const measured = baselines.filter((baseline) => baseline.state === "measured").length;
  const directional = baselines.filter((baseline) => baseline.state === "directional").length;
  const notInstrumented = baselines.filter((baseline) => baseline.state === "not_instrumented").length;
  const actionMessage = params.target_action
    ? ACTION_MESSAGES[params.target_action] ?? {
        tone: "border-rose-300/40 bg-rose-950/40 text-rose-100",
        message: `Target version was not recorded: ${params.target_action.replaceAll("_", " ")}.`,
      }
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(74,170,184,.13),transparent_30%),radial-gradient(circle_at_10%_5%,rgba(205,162,74,.12),transparent_28%),#040404] px-4 py-7 text-[#f4ead4] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-[#cda24a33] bg-[linear-gradient(135deg,rgba(18,18,18,.97),rgba(5,5,5,.99))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#d1aa53]">Ask Magic Mike · KPI Target Register</p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight text-[#f4ead4] sm:text-6xl">
            Baseline first. Target second. Evidence always.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9bdab] sm:text-base">
            Canonical non-test data determines whether a metric is measured, directional, sample-limited, or not yet instrumented.
            Approved targets require a measured baseline and an explicit operator reference; drafts may document intent without pretending the data is ready.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <nav className="flex flex-wrap gap-2" aria-label="Growth target navigation">
              <Link href={`/admin/growth?window=${windowDays}`} className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] hover:text-[#f0cf79]">Growth command</Link>
              <Link href="/admin/distribution" className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] hover:text-[#f0cf79]">Owned demand</Link>
            </nav>
            <nav className="flex flex-wrap gap-2" aria-label="KPI baseline windows">
              {WINDOWS.map((days) => (
                <Link key={days} href={`/admin/growth/targets?window=${days}`} className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.11em] ${days === windowDays ? "border-[#cda24a] bg-[#cda24a] text-black" : "border-white/10 bg-black/30 text-[#a89c8b]"}`}>
                  {days}d
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {actionMessage ? <div role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${actionMessage.tone}`}>{actionMessage.message}</div> : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="KPI register quality summary">
          {[
            ["Measured baselines", measured, "Eligible for operator approval"],
            ["Directional", directional, "Visible but not approvable"],
            ["Not instrumented", notInstrumented, "Explicit measurement backlog"],
            ["Recorded versions", register.versions.length, "Append-only target history"],
          ].map(([label, value, note]) => (
            <article key={label} className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">{label}</p>
              <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{value}</p>
              <p className="mt-2 text-xs text-[#8f8778]">{note}</p>
            </article>
          ))}
        </section>

        {!growth.configured || growth.error ? (
          <div className="mt-5 rounded-xl border border-rose-300/35 bg-rose-950/35 px-5 py-4 text-sm text-rose-100">
            Canonical baseline query unavailable. No baseline is approvable and no fallback number is substituted.
          </div>
        ) : null}
        {!register.schemaReady ? (
          <div className="mt-5 rounded-xl border border-amber-300/35 bg-amber-950/35 px-5 py-4 text-sm leading-6 text-amber-100">
            The target-register migration is not present in this environment. Baselines remain readable; recording stays disabled.
          </div>
        ) : null}
        {previewReadOnly ? (
          <div className="mt-5 rounded-xl border border-cyan-300/35 bg-cyan-950/35 px-5 py-4 text-sm leading-6 text-cyan-100">
            Preview is read-only. Forms are intentionally disabled and no target version can be persisted.
          </div>
        ) : null}

        {(Object.keys(CATEGORY_LABELS) as KpiMetricCategory[]).map((category) => (
          <section key={category} className="mt-5 rounded-2xl border border-white/10 bg-[#090909] p-4 sm:p-6" aria-labelledby={`category-${category}`}>
            <h2 id={`category-${category}`} className="font-serif text-2xl text-[#f0cf79]">{CATEGORY_LABELS[category]}</h2>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {KPI_METRIC_DEFINITIONS.filter((metric) => metric.category === category).map((metric) => {
                const baseline = baselineByMetric.get(metric.key);
                if (!baseline) return null;
                const latest = register.latestByMetric[metric.key];
                return (
                  <article key={metric.key} className="min-w-0 rounded-xl border border-white/[.08] bg-black/35 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">{metric.key.replaceAll("_", " ")}</p>
                        <h3 className="mt-2 font-serif text-xl text-[#f4ead4]">{metric.label}</h3>
                      </div>
                      <BaselineFlag state={baseline.state} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#bdb2a1]">{metric.definition}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-[#050505] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Current baseline</p>
                        <p className="mt-2 font-serif text-2xl text-[#d8f7fa]">{formatKpiValue(baseline.value, metric.unit)}</p>
                        <p className="mt-2 text-[10px] text-[#7f776b]">{baseline.sampleSize} observations · {windowDays}d</p>
                      </div>
                      <CurrentTarget metric={metric} version={latest} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#8f8778]">{baseline.reason}</p>
                    {canManage && register.schemaReady && !previewReadOnly ? (
                      <div className="mt-4"><TargetForm metric={metric} baseline={baseline} windowDays={windowDays} /></div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <section className="mt-5 rounded-2xl border border-white/10 bg-[#090909] p-4 sm:p-6" aria-labelledby="target-history">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">Immutable history</p>
              <h2 id="target-history" className="mt-2 font-serif text-2xl text-[#f0cf79]">Target versions</h2>
            </div>
            <p className="text-xs text-[#8f8778]">Generated {dateTime(register.generatedAt)}</p>
          </div>
          {register.versions.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[960px] w-full text-left text-sm">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                  <tr><th className="px-2 py-3">Recorded</th><th className="px-2 py-3">Metric</th><th className="px-2 py-3">Status</th><th className="px-2 py-3">Target</th><th className="px-2 py-3">Baseline</th><th className="px-2 py-3">Evidence</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[.07]">
                  {register.versions.slice(0, 100).map((version) => {
                    const metric = KPI_METRIC_DEFINITIONS.find((candidate) => candidate.key === version.metricKey);
                    if (!metric) return null;
                    return (
                      <tr key={version.id}>
                        <td className="px-2 py-4 text-[#a99f90]">{dateTime(version.createdAt)}</td>
                        <td className="px-2 py-4 text-[#f4ead4]">{metric.label}</td>
                        <td className="px-2 py-4 text-[#d9ceb8]">{version.status}</td>
                        <td className="px-2 py-4 text-[#f0cf79]">{formatKpiValue(version.targetValue, metric.unit)}</td>
                        <td className="px-2 py-4 text-[#d8f7fa]">{formatKpiValue(version.baselineValue, metric.unit)}</td>
                        <td className="px-2 py-4 font-mono text-[10px] text-[#7f776b]">{version.baselineEvidenceSha256.slice(0, 12)}…</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="mt-4 text-sm text-[#8f8778]">No target version has been recorded. Migration does not seed or imply any target.</p>}
        </section>
      </div>
    </main>
  );
}
