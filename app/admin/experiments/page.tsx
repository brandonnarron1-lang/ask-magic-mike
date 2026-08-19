import type { ReactNode } from "react";
import Link from "next/link";
import { loadExperimentCommand } from "../../lib/experimentCommandView";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOWS = [30, 90, 365] as const;
type WindowDays = (typeof WINDOWS)[number];

function parseWindow(value?: string): WindowDays {
  const parsed = Number(value);
  return WINDOWS.includes(parsed as WindowDays) ? parsed as WindowDays : 90;
}

function dateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function percent(value: number | null) {
  return value == null ? "—" : `${value.toFixed(2)}%`;
}

function Pill({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "ruby" | "cyan" }) {
  const colors = {
    gold: "border-[#cda24a55] bg-[#cda24a12] text-[#e9ca79]",
    green: "border-[#4a8c6f66] bg-[#071712] text-[#83dab4]",
    ruby: "border-[#a21f3d66] bg-[#2a0710] text-[#ff9ab1]",
    cyan: "border-[#4baab866] bg-[#06171b] text-[#7ee7f1]",
  } as const;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${colors[tone]}`}>
      {children}
    </span>
  );
}

function Panel({ eyebrow, title, note, children }: {
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#080808] p-5 shadow-[0_24px_80px_rgba(0,0,0,.35)] sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d1aa53]">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-2xl text-[#f4ead4] sm:text-3xl">{title}</h2>
        {note ? <p className="max-w-xl text-xs leading-5 text-[#8f8778]">{note}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function ExperimentCommandPage({
  searchParams,
}: {
  searchParams?: Promise<{ window?: string }>;
}) {
  await requireLeadCenterPermission("report:view");
  const params = searchParams ? await searchParams : {};
  const windowDays = parseWindow(params.window);
  const data = await loadExperimentCommand(windowDays);
  const candidate = data.candidate.definition;
  const registeredCandidate = data.experiments.some((experiment) => experiment.experimentKey === candidate.key);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(75,170,184,.13),transparent_31%),radial-gradient(circle_at_8%_12%,rgba(205,162,74,.14),transparent_27%),#040404] px-4 py-7 text-[#f4ead4] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-[#cda24a33] bg-[linear-gradient(135deg,rgba(18,18,18,.97),rgba(5,5,5,.99))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-4xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#d1aa53]">
                Ask Magic Mike · Experiment Command
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-[#f4ead4] sm:text-6xl">
                Improve the funnel without gambling with trust.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9bdab] sm:text-base">
                One approval-gated experiment at a time. Assignment is deterministic, outcomes stay in the canonical Neon ledger,
                guardrails stop promotion, and no observed difference is presented as statistical proof.
              </p>
            </div>
            <div className="min-w-56 rounded-xl border border-white/10 bg-black/45 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f8778]">Runtime authority</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone={data.masterEnabled ? "green" : "ruby"}>Master {data.masterEnabled ? "enabled" : "off"}</Pill>
                <Pill tone={data.schemaReady ? "green" : "gold"}>Schema {data.schemaReady ? "ready" : "pending"}</Pill>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#8f8778]">Generated {dateTime(data.generatedAt)}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <nav className="flex flex-wrap gap-2" aria-label="Experiment command navigation">
              <Link href="/admin/growth" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] hover:border-[#cda24a66]">
                Growth command
              </Link>
              <Link href="/admin/reporting" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] hover:border-[#cda24a66]">
                Reporting
              </Link>
            </nav>
            <nav className="flex flex-wrap gap-2" aria-label="Experiment reporting windows">
              {WINDOWS.map((days) => (
                <Link
                  key={days}
                  href={`/admin/experiments?window=${days}`}
                  className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.11em] ${
                    windowDays === days ? "border-[#cda24a] bg-[#cda24a] text-black" : "border-white/10 text-[#a89c8b]"
                  }`}
                >
                  {days}d
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="mt-5">
          {data.error ? (
            <div className="rounded-xl border border-[#a21f3d66] bg-[#2a0710] px-5 py-4 text-sm text-[#ffdbe4]">
              <strong className="text-[#ff9ab1]">Experiment read model unavailable.</strong> {data.error}. Public experiments fail closed.
            </div>
          ) : !data.configured ? (
            <div className="rounded-xl border border-[#cda24a55] bg-[#1a1308] px-5 py-4 text-sm text-[#f4ead4]">
              <strong className="text-[#f0cf79]">Canonical Neon is not configured.</strong> The reviewed candidate remains visible, but no registry or outcome state is invented.
            </div>
          ) : !data.schemaReady ? (
            <div className="rounded-xl border border-[#cda24a55] bg-[#1a1308] px-5 py-4 text-sm text-[#f4ead4]">
              <strong className="text-[#f0cf79]">Canonical Neon is connected; the experiment schema is pending.</strong> Public assignment remains disabled and no registry state is inferred.
            </div>
          ) : (
            <div className="rounded-xl border border-[#4a8c6f66] bg-[#071712] px-5 py-4 text-sm text-[#d9f4e8]">
              <strong className="text-[#83dab4]">Canonical experiment intelligence is connected.</strong> Activation still requires every independent control below.
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <Panel
            eyebrow="Candidate 01"
            title={candidate.name}
            note={registeredCandidate ? "Canonical draft is registered." : "Reviewed code candidate; canonical draft registration is pending."}
          >
            <div className="flex flex-wrap gap-2">
              <Pill>{candidate.surface}</Pill>
              <Pill tone="cyan">Primary · {candidate.primaryMetric.replaceAll("_", " ")}</Pill>
              <Pill tone={data.candidate.validation.valid ? "green" : "ruby"}>
                Definition {data.candidate.validation.valid ? "valid" : "blocked"}
              </Pill>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#c9bdab]">{candidate.hypothesis}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {candidate.variants.map((variant) => (
                <article key={variant.key} className="rounded-xl border border-white/10 bg-black/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d1aa53]">{variant.label}</p>
                    <Pill>{variant.weight}%</Pill>
                  </div>
                  <h3 className="mt-4 font-serif text-2xl leading-tight text-[#f4ead4]">{variant.headline}</h3>
                  <p className="mt-3 text-xs leading-6 text-[#a89c8b]">{variant.description}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-4">
                <p className="text-[10px] uppercase tracking-[.14em] text-[#8f8778]">Minimum sample</p>
                <p className="mt-2 font-serif text-2xl text-[#f0cf79]">{candidate.minimumSampleSize} / variant</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-4">
                <p className="text-[10px] uppercase tracking-[.14em] text-[#8f8778]">Practical uplift</p>
                <p className="mt-2 font-serif text-2xl text-[#f0cf79]">{candidate.minimumRelativeUpliftPercent}%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-4">
                <p className="text-[10px] uppercase tracking-[.14em] text-[#8f8778]">Allocation rehearsal</p>
                <p className="mt-2 font-serif text-2xl text-[#f0cf79]">{data.candidate.simulation.sampleSize}</p>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Fail-closed release" title="Three locks, then measurement" note="Merge and deployment do not activate the experiment.">
            <ol className="space-y-3">
              {candidate.activationControls.map((control, index) => (
                <li key={control} className="flex gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#cda24a55] text-xs font-bold text-[#e9ca79]">{index + 1}</span>
                  <p className="text-sm leading-6 text-[#c9bdab]">{control}</p>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl border border-[#a21f3d55] bg-[#2a071080] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ff9ab1]">Never autonomous</p>
              <p className="mt-2 text-xs leading-6 text-[#ffdbe4]">
                Registration, approval, Production activation, rollout, promotion, public copy adoption, and rollback remain explicit human decisions with audit evidence.
              </p>
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#d1aa53]">Guardrails</p>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-[#a89c8b]">
                {candidate.guardrails.map((guardrail) => <li key={guardrail}>• {guardrail}</li>)}
              </ul>
            </div>
          </Panel>
        </div>

        <div className="mt-5">
          <Panel
            eyebrow="Canonical ledger"
            title="Registered experiment performance"
            note={`${data.experiments.length} registered · ${windowDays}-day event window · test and suppressed leads excluded`}
          >
            {data.experiments.length ? (
              <div className="space-y-4">
                {data.experiments.map((experiment) => (
                  <article key={experiment.id} className="rounded-xl border border-white/10 bg-black/35 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8f8778]">
                          {experiment.experimentKey} · {experiment.surface}
                        </p>
                        <h3 className="mt-2 font-serif text-2xl text-[#f4ead4]">{experiment.name}</h3>
                        <p className="mt-2 max-w-4xl text-xs leading-6 text-[#a89c8b]">{experiment.hypothesis}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone={experiment.status === "running" ? "green" : "gold"}>{experiment.status}</Pill>
                        <Pill tone={experiment.approvalStatus === "approved" ? "green" : "ruby"}>{experiment.approvalStatus}</Pill>
                        <Pill tone={experiment.evaluation.status === "stop" ? "ruby" : "cyan"}>{experiment.evaluation.status}</Pill>
                      </div>
                    </div>
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[860px] text-left text-xs">
                        <thead className="text-[10px] uppercase tracking-[.12em] text-[#8f8778]">
                          <tr>
                            {['Variant', 'Assigned', 'Exposed', 'Durable leads', 'Qualified', 'Appointments', 'Lead rate', 'Appointment / exposure', 'Guardrails'].map((heading) => (
                              <th key={heading} className="border-b border-white/10 px-3 py-3 font-semibold">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {experiment.variants.map((variant) => (
                            <tr key={variant.key} className="text-[#d9ceb8]">
                              <td className="border-b border-white/5 px-3 py-3 font-semibold text-[#f4ead4]">{variant.label}</td>
                              <td className="border-b border-white/5 px-3 py-3">{variant.assignments}</td>
                              <td className="border-b border-white/5 px-3 py-3">{variant.exposures}</td>
                              <td className="border-b border-white/5 px-3 py-3">{variant.durableLeads}</td>
                              <td className="border-b border-white/5 px-3 py-3">{variant.qualifiedLeads}</td>
                              <td className="border-b border-white/5 px-3 py-3">{variant.appointments}</td>
                              <td className="border-b border-white/5 px-3 py-3">{percent(variant.durableLeadRate)}</td>
                              <td className="border-b border-white/5 px-3 py-3">{percent(variant.qualifiedAppointmentRate)}</td>
                              <td className="border-b border-white/5 px-3 py-3">{variant.guardrailBreaches}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-white/[.02] p-4 text-xs leading-6 text-[#a89c8b]">
                        <strong className="text-[#e9ca79]">Evaluator:</strong> {experiment.evaluation.rationale}
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/[.02] p-4 text-xs leading-6 text-[#a89c8b]">
                        <strong className="text-[#e9ca79]">Window:</strong> {dateTime(experiment.startsAt)} to {dateTime(experiment.endsAt)} · owner {experiment.owner || "unassigned"}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#cda24a44] bg-[#120e07] p-5">
                <p className="text-sm font-semibold text-[#f0cf79]">No experiment is registered.</p>
                <p className="mt-2 text-xs leading-6 text-[#a89c8b]">
                  The reviewed candidate above can be registered as approval-required through the separately gated additive migration. No row is fabricated here.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
