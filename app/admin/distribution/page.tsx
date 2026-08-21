import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  buildOwnedDemandCommand,
  type OwnedDemandChannel,
  type OwnedDemandOfferBrief,
  type OwnedDemandOfferPlacement,
} from "../../lib/growth/owned-demand";
import { loadGrowthIntelligence } from "../../lib/growthIntelligenceView";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { CopyDemandAsset } from "./CopyDemandAsset";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function dateTime(value: string) {
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

function Panel({ eyebrow, title, note, children }: {
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-[#080808] p-5 shadow-[0_26px_80px_rgba(0,0,0,.34)] sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d1aa53]">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-2xl text-[#f4ead4] sm:text-3xl">{title}</h2>
        {note ? <p className="max-w-2xl text-xs leading-5 text-[#8f8778]">{note}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OfferFlightCard({ offer }: { offer: OwnedDemandOfferBrief }) {
  const portraitClass = offer.key === "renter_plan"
    ? "object-contain object-bottom transition duration-500 group-hover:scale-[1.02]"
    : offer.key === "buyer_match"
      ? "object-cover object-center transition duration-500 group-hover:scale-[1.02]"
      : "object-cover object-top transition duration-500 group-hover:scale-[1.02]";
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(150deg,#101010,#050505)]">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_35%,#282219_0%,#090909_54%,#000_100%)]">
        <Image
          src={offer.creativePath}
          alt={offer.creativeAlt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className={portraitClass}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,.88))]" />
        <p className="absolute bottom-4 left-4 rounded-full border border-[#cda24a55] bg-black/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#f0cf79]">
          {offer.shortLabel}
        </p>
      </div>
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8bbfc6]">Live consumer offer</p>
        <h3 className="mt-2 font-serif text-2xl leading-tight text-[#f4ead4]">{offer.label}</h3>
        <p className="mt-3 text-sm leading-6 text-[#c9bdab]">{offer.draftBody}</p>
        <p className="mt-4 rounded-xl border border-[#cda24a2f] bg-[#171108] p-3 text-xs leading-5 text-[#b9ab91]">
          <strong className="text-[#f0cf79]">Required review:</strong> {offer.reviewNote}
        </p>
        <Link
          href={offer.destination}
          className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d9ceb8] hover:border-[#4baab866] hover:text-[#9edbe2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9edbe2]"
        >
          Inspect live route
        </Link>
      </div>
    </article>
  );
}

function OfferPlacement({ offer }: { offer: OwnedDemandOfferPlacement }) {
  const observed = offer.status === "signal_detected";
  const completeDraft = `${offer.draftTitle}\n\n${offer.draftBody}\n\n${offer.trackedUrl}`;

  return (
    <article className="rounded-xl border border-white/[.08] bg-black/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8bbfc6]">{offer.shortLabel}</p>
          <h4 className="mt-1 text-sm font-semibold leading-5 text-[#f4ead4]">{offer.draftTitle}</h4>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.11em] ${
          observed
            ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
            : "border-white/10 bg-white/[.03] text-[#8f8778]"
        }`}>
          {observed ? `${offer.attributedLeads} signal${offer.attributedLeads === 1 ? "" : "s"}` : "Unmeasured"}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#bdb2a0]">{offer.draftBody}</p>
      <code className="mt-3 block break-all rounded-lg border border-white/[.08] bg-[#050505] p-3 text-[10px] leading-5 text-[#9edbe2]">
        {offer.trackedUrl}
      </code>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyDemandAsset label="Copy draft + link" value={completeDraft} />
        <CopyDemandAsset label="Copy tracked link" value={offer.trackedUrl} />
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#7f786d]">{offer.reviewNote}</p>
    </article>
  );
}

function ChannelCard({ channel }: { channel: OwnedDemandChannel }) {
  const observed = channel.status === "signal_detected";
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#101010,#060606)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">{channel.format}</p>
          <h3 className="mt-2 font-serif text-2xl text-[#f4ead4]">{channel.label}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
          observed
            ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
            : "border-[#cda24a55] bg-[#cda24a12] text-[#efcc76]"
        }`}>
          {observed ? `${channel.attributedLeads} live signal${channel.attributedLeads === 1 ? "" : "s"}` : "Ready · unmeasured"}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-[#cda24a2f] bg-black/35 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d1aa53]">Operator-reviewed draft</p>
        <p className="mt-2 text-base font-semibold text-[#f4ead4]">{channel.draftTitle}</p>
        <p className="mt-2 text-sm leading-6 text-[#c9bdab]">{channel.draftBody}</p>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f8778]">Tracked destination</p>
        <code className="mt-2 block break-all rounded-lg border border-white/10 bg-black p-3 text-[11px] leading-5 text-[#9edbe2]">
          {channel.trackedUrl}
        </code>
      </div>

      <div className="mt-4 space-y-2 text-xs leading-5">
        <p className="text-[#d7cbb7]"><strong className="text-[#f0cf79]">Next human step:</strong> {channel.operatorStep}</p>
        <p className="text-[#8f8778]"><strong>Review:</strong> {channel.reviewNote}</p>
      </div>

      <details className="group mt-5 rounded-xl border border-[#4baab833] bg-[#061417]">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#9edbe2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9edbe2]">
          <span className="flex items-center justify-between gap-3">
            Three offer-specific placements
            <span aria-hidden="true" className="text-lg transition group-open:rotate-45">+</span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-[#4baab833] p-3">
          {channel.offers.map((offer) => <OfferPlacement key={offer.key} offer={offer} />)}
        </div>
      </details>
    </article>
  );
}

export default async function DistributionPage() {
  await requireLeadCenterPermission("report:view");
  const growth = await loadGrowthIntelligence(30);
  const command = buildOwnedDemandCommand(growth);
  const stateLabel = command.measurementState === "no_live_signal"
    ? "Activation required"
    : command.measurementState === "partial_signal"
      ? "Attribution repair"
      : "Measured";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(74,170,184,.13),transparent_30%),radial-gradient(circle_at_10%_5%,rgba(205,162,74,.12),transparent_28%),#040404] px-4 py-7 text-[#f4ead4] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-[#cda24a33] bg-[linear-gradient(135deg,rgba(18,18,18,.97),rgba(5,5,5,.99))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-4xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#d1aa53]">Ask Magic Mike · Owned Demand Command</p>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-[#f4ead4] sm:text-6xl">
                Turn the existing audience into measurable local demand.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9bdab] sm:text-base">
                One protected workspace for evidence-backed source signals, compliant draft briefs, and canonical UTM links.
                It reuses the live Neon Growth ledger and existing campaign infrastructure without restoring the legacy Supabase dashboard.
              </p>
            </div>
            <div className="rounded-xl border border-[#4baab855] bg-[#06171b] p-4 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8bbfc6]">Current state</p>
              <p className="mt-2 font-serif text-2xl text-[#a9edf4]">{stateLabel}</p>
              <p className="mt-1 text-xs text-[#79a4aa]">Generated {dateTime(command.generatedAt)}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
            <Link href="/admin/growth?window=30" className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] hover:border-[#cda24a66] hover:text-[#f0cf79]">
              Growth economics
            </Link>
            <Link href="/social-preview" className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] hover:border-[#4baab866] hover:text-[#9edbe2]">
              Approved social preview
            </Link>
            <Link href="/ask" className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] hover:border-[#4baab866] hover:text-[#9edbe2]">
              Inspect general intake
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Owned demand measurement status">
          <article className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">Eligible live leads · 30d</p>
            <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{growth.summary.leads}</p>
            <p className="mt-2 text-xs text-[#8f8778]">Test and suppressed records excluded in SQL</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">Useful attribution</p>
            <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{command.attributedLeadRate}%</p>
            <p className="mt-2 text-xs text-[#8f8778]">Canonical first-party source coverage</p>
          </article>
          <article className="rounded-xl border border-[#cda24a55] bg-[linear-gradient(145deg,#171108,#090909)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#cda24a]">Owned-source signals</p>
            <p className="mt-3 font-serif text-3xl text-[#f0cf79]">{command.attributedLiveLeads}</p>
            <p className="mt-2 text-xs text-[#a99a7e]">Exact campaign + placement matches on the latest recorded touch</p>
          </article>
        </section>

        <div className="mt-5 rounded-xl border border-[#cda24a55] bg-[#1a1308] px-5 py-4 text-sm leading-6 text-[#f4ead4]">
          <strong className="text-[#f0cf79]">Measured bottleneck:</strong> {command.bottleneck}
        </div>

        <div className="mt-5">
          <Panel
            eyebrow="Three-offer launch flight"
            title="Use the funnels already in production."
            note={`${command.channels.length * command.offers.length} exact channel + offer placements are prepared. Nothing here auto-publishes or contacts a consumer.`}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {command.offers.map((offer) => <OfferFlightCard key={offer.key} offer={offer} />)}
            </div>
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {command.channels.map((channel) => <ChannelCard key={channel.key} channel={channel} />)}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
          <Panel eyebrow="Five-day cadence" title="Manual owned-demand operating plan" note="A plan is not proof of publication. Record the external URL or placement evidence after a human publishes it.">
            <div className="space-y-3 md:hidden" aria-label="Five-day owned-demand operating plan">
              {command.weeklyPlan.map((item) => {
                const channel = command.channels.find((candidate) => candidate.key === item.channelKey);
                return (
                  <article key={item.day} className="rounded-xl border border-white/[.08] bg-black/35 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-serif text-xl text-[#f0cf79]">{item.day}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#d9ceb8]">
                        {channel?.label ?? item.channelKey}
                      </p>
                    </div>
                    <dl className="mt-4 space-y-4 text-xs leading-5">
                      <div>
                        <dt className="font-bold uppercase tracking-[0.13em] text-[#8f8778]">Objective</dt>
                        <dd className="mt-1 text-[#c9bdab]">{item.objective}</dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-[0.13em] text-[#8f8778]">Proof required</dt>
                        <dd className="mt-1 text-[#a99f90]">{item.proofRequired}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                  <tr><th className="px-2 py-3">Day</th><th className="px-2 py-3">Channel</th><th className="px-2 py-3">Objective</th><th className="px-2 py-3">Proof required</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[.07]">
                  {command.weeklyPlan.map((item) => {
                    const channel = command.channels.find((candidate) => candidate.key === item.channelKey);
                    return (
                      <tr key={item.day}>
                        <td className="px-2 py-4 font-semibold text-[#f0cf79]">{item.day}</td>
                        <td className="px-2 py-4 text-[#f4ead4]">{channel?.label ?? item.channelKey}</td>
                        <td className="px-2 py-4 text-[#c9bdab]">{item.objective}</td>
                        <td className="px-2 py-4 text-[#8f8778]">{item.proofRequired}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel eyebrow="Authority boundary" title="Draft here. Publish elsewhere.">
            <p className="text-sm leading-7 text-[#c9bdab]">{command.operatorBoundary}</p>
            <div className="mt-5 rounded-xl border border-[#a21f3d55] bg-[#21070e] p-4 text-xs leading-6 text-[#ffdbe4]">
              <strong className="text-[#ff9bb2]">Still approval-gated:</strong> public posting, email campaigns, consumer SMS, provider activation, paid promotion, audience targeting, budget changes, and claims requiring broker or legal review.
            </div>
            <p className="mt-4 text-xs leading-6 text-[#8f8778]">
              The source ledger is authoritative. Each signal requires an exact source, medium, campaign, and placement match; no signal is treated as proof that a post was published, viewed, or effective.
            </p>
          </Panel>
        </div>
      </div>
    </main>
  );
}
