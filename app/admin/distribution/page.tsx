import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  assessOwnedDemandMeasurement,
  buildOwnedDemandChannelPacket,
  buildOwnedDemandCommand,
  type OwnedDemandMeasurementState,
  type OwnedDemandChannel,
  type OwnedDemandOfferBrief,
  type OwnedDemandOfferPlacement,
} from "../../lib/growth/owned-demand";
import {
  buildOwnedDemandActivationLoop,
  type OwnedDemandActivationLoop,
  type OwnedDemandActivationState,
} from "../../lib/growth/owned-demand-activation";
import {
  publicationPolicyForChannel,
  type OwnedDemandPlatformState,
  type OwnedDemandProofType,
} from "../../lib/growth/publication-proof";
import {
  ownedDemandAssetHref,
  type OwnedDemandAssetFormat,
} from "../../lib/growth/owned-demand-assets";
import { loadGrowthIntelligence } from "../../lib/growthIntelligenceView";
import {
  loadOwnedDemandPublicationProofLedger,
  type OwnedDemandPublicationProofLedger,
  type OwnedDemandPublicationProofRow,
} from "../../lib/persistence/neonOwnedDemandPublicationProofs";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "../../../src/lib/admin/rbac-policy";
import { isPreviewDataDisabled } from "../../../src/lib/preview-security";
import { CopyDemandAsset } from "./CopyDemandAsset";
import { recordOwnedDemandPublicationProofAction } from "./actions";

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

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

const PUBLICATION_ACTION_MESSAGES: Record<string, { tone: string; message: string }> = {
  proof_recorded: {
    tone: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    message: "Publication proof recorded with canonical attribution and an immutable audit event.",
  },
  already_recorded: {
    tone: "border-[#4baab855] bg-[#4baab818] text-[#c6f8fc]",
    message: "That exact proof was already recorded. No duplicate ledger row or audit event was created.",
  },
  confirmation_required: {
    tone: "border-[#cda24a55] bg-[#171108] text-[#f5dfa7]",
    message: "Confirmation is required before a native-platform observation can be recorded.",
  },
};

function latestProofForChannel(
  ledger: OwnedDemandPublicationProofLedger,
  channelKey: string,
) {
  return ledger.proofs.find((proof) => proof.channelKey === channelKey) || null;
}

function ProofEvidence({ proof }: { proof: OwnedDemandPublicationProofRow }) {
  return proof.evidenceUrl ? (
    <a
      href={proof.evidenceUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="break-all text-[#9edbe2] underline decoration-[#4baab866] underline-offset-4"
    >
      Open public evidence
    </a>
  ) : (
    <span className="break-words text-[#c9bdab]">{proof.evidenceReference || "Evidence reference unavailable"}</span>
  );
}

function PublicationProofForm({
  channel,
  disabled,
}: {
  channel: OwnedDemandChannel;
  disabled: boolean;
}) {
  const policy = publicationPolicyForChannel(channel.key);
  if (!policy) return null;
  const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2 text-sm text-[#f4ead4] outline-none focus:border-[#4baab8] focus:ring-1 focus:ring-[#4baab8] disabled:cursor-not-allowed disabled:opacity-45";
  const labelClass = "text-[10px] font-bold uppercase tracking-[0.13em] text-[#a99f90]";

  return (
    <form action={recordOwnedDemandPublicationProofAction} className="mt-4 space-y-4 border-t border-white/[.08] pt-4">
      <input type="hidden" name="channel_key" value={channel.key} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Placement
          <select name="placement_key" className={fieldClass} disabled={disabled} required>
            <option value="general_question">General question</option>
            {channel.offers.map((offer) => <option key={offer.key} value={offer.key}>{offer.shortLabel}</option>)}
            {channel.namedPlacements.map((placement) => <option key={placement.placementKey} value={placement.placementKey}>{placement.placementLabel}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          Observed state
          <select name="platform_state" className={fieldClass} disabled={disabled} required>
            {policy.states.map((state: OwnedDemandPlatformState) => <option key={state} value={state}>{humanize(state)}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          Proof type
          <select name="proof_type" className={fieldClass} disabled={disabled} required>
            {policy.proofTypes.map((proofType: OwnedDemandProofType) => <option key={proofType} value={proofType}>{humanize(proofType)}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          Creative asset key · optional
          <input name="creative_asset_key" className={fieldClass} disabled={disabled} maxLength={240} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Public evidence URL
          <input name="evidence_url" type="url" inputMode="url" className={fieldClass} disabled={disabled} maxLength={2048} placeholder="https://native-platform.example/post" autoComplete="off" />
        </label>
        <label className={labelClass}>
          Private evidence reference
          <input name="evidence_reference" className={fieldClass} disabled={disabled} maxLength={180} placeholder="Platform post ID or screenshot asset key" autoComplete="off" />
        </label>
      </div>
      <p className="text-[11px] leading-5 text-[#7f786d]">
        Use a public URL only for public-URL proof. Otherwise use a non-sensitive platform, screenshot, configuration, scan-test, or removal reference—never an access token, email, phone number, or secret.
      </p>
      <label className={labelClass}>
        Exact final copy used
        <textarea name="final_copy" className={`${fieldClass} min-h-36 resize-y`} disabled={disabled} minLength={20} maxLength={5000} required />
        <span className="mt-1 block normal-case tracking-normal text-[#7f786d]">Validated and SHA-256 hashed in memory; raw copy is not retained in the database.</span>
      </label>
      <label className={labelClass}>
        Approval reference
        <input name="approval_reference" className={fieldClass} disabled={disabled} minLength={4} maxLength={160} placeholder="Owner approval 2026-08-21" autoComplete="off" required />
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-[#cda24a33] bg-[#171108] p-3 text-xs leading-5 text-[#d8c8a9]">
        <input name="confirm" value="yes" type="checkbox" disabled={disabled} className="mt-1 size-4 accent-[#cda24a]" required />
        <span>I confirm that an authorized person already observed this exact state in the native platform and that this record does not itself publish, schedule, send, target, or spend.</span>
      </label>
      <button type="submit" disabled={disabled} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#4baab866] bg-[#4baab820] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#bff8ff] transition hover:bg-[#4baab836] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9edbe2] disabled:cursor-not-allowed disabled:opacity-45">
        Record observed proof
      </button>
    </form>
  );
}

function PublicationLedger({
  channels,
  ledger,
  canManage,
  previewReadOnly,
  actionStatus,
}: {
  channels: OwnedDemandChannel[];
  ledger: OwnedDemandPublicationProofLedger;
  canManage: boolean;
  previewReadOnly: boolean;
  actionStatus?: string;
}) {
  const proofChannels = new Set(ledger.proofs.map((proof) => proof.channelKey)).size;
  const liveProofs = ledger.proofs.filter((proof) => proof.platformState === "live").length;
  const notice = actionStatus ? PUBLICATION_ACTION_MESSAGES[actionStatus] : null;
  const disabled = previewReadOnly || !ledger.schemaReady;

  return (
    <Panel
      eyebrow="Native-platform publication proof"
      title="Separate what was prepared from what was actually observed."
      note="Append-only evidence only. This ledger cannot publish content or contact a consumer."
    >
      <div id="publication-ledger" className="scroll-mt-24">
        {notice ? <p className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-6 ${notice.tone}`}>{notice.message}</p> : null}
        {actionStatus && !notice ? (
          <p className="mb-4 rounded-xl border border-[#a21f3d55] bg-[#21070e] px-4 py-3 text-sm leading-6 text-[#ffdbe4]">
            The proof was not recorded. Review the evidence type, observed state, final copy, and approval reference, then try again.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-white/[.08] bg-black/35 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Recorded proofs</p><p className="mt-2 font-serif text-3xl text-[#f4ead4]">{ledger.proofs.length}</p></article>
          <article className="rounded-xl border border-white/[.08] bg-black/35 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Channels evidenced</p><p className="mt-2 font-serif text-3xl text-[#f4ead4]">{proofChannels} / {channels.length}</p></article>
          <article className="rounded-xl border border-white/[.08] bg-black/35 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Live observations</p><p className="mt-2 font-serif text-3xl text-[#f4ead4]">{liveProofs}</p></article>
        </div>

        {!ledger.configured ? (
          <p className="mt-4 rounded-xl border border-[#a21f3d55] bg-[#21070e] p-4 text-sm leading-6 text-[#ffdbe4]">The canonical database is not configured for this runtime. No proof can be read or recorded.</p>
        ) : !ledger.schemaReady ? (
          <p className="mt-4 rounded-xl border border-[#cda24a55] bg-[#171108] p-4 text-sm leading-6 text-[#f5dfa7]">The additive publication-proof migration is pending in this environment. Existing campaign drafts and attribution remain unchanged.</p>
        ) : null}
        {previewReadOnly ? (
          <p className="mt-4 rounded-xl border border-[#4baab855] bg-[#06171b] p-4 text-sm leading-6 text-[#c6f8fc]">Preview is read-only. Proof controls are rendered for QA, but every database mutation fails closed.</p>
        ) : null}
        {!canManage ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-4 text-sm leading-6 text-[#c9bdab]">Your role can inspect publication evidence but cannot record it. An administrator or primary lead owner must confirm native-platform proof.</p>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {channels.map((channel) => {
            const channelProofs = ledger.proofs.filter((proof) => proof.channelKey === channel.key);
            const latest = latestProofForChannel(ledger, channel.key);
            return (
              <article key={channel.key} className="min-w-0 rounded-xl border border-white/[.08] bg-black/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8bbfc6]">{channel.format}</p><h3 className="mt-1 font-serif text-2xl text-[#f4ead4]">{channel.label}</h3></div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.11em] ${latest ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-[#8f8778]"}`}>
                    {latest ? humanize(latest.platformState) : "No proof"}
                  </span>
                </div>
                {latest ? (
                  <div className="mt-4 rounded-lg border border-white/[.07] bg-[#050505] p-3 text-xs leading-5">
                    <p className="text-[#a99f90]">Latest · {dateTime(latest.observedAt)} · {humanize(latest.placementKey)}</p>
                    <p className="mt-2"><ProofEvidence proof={latest} /></p>
                    <p className="mt-2 break-all text-[10px] text-[#6f6a61]">Copy hash {latest.finalCopySha256.slice(0, 16)}…</p>
                  </div>
                ) : <p className="mt-4 text-xs leading-5 text-[#8f8778]">A prepared draft or attributed visit is not publication proof.</p>}

                {channelProofs.length > 1 ? (
                  <details className="mt-3 rounded-lg border border-white/[.07] px-3 py-2">
                    <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-[#a99f90]">History · {channelProofs.length} records</summary>
                    <ul className="mt-3 space-y-3">
                      {channelProofs.slice(1).map((proof) => (
                        <li key={proof.id} className="border-t border-white/[.06] pt-3 text-xs leading-5 text-[#8f8778]">
                          {dateTime(proof.observedAt)} · {humanize(proof.platformState)} · {humanize(proof.placementKey)}<br /><ProofEvidence proof={proof} />
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {canManage ? (
                  <details className="mt-4 rounded-xl border border-[#4baab833] bg-[#061417] p-3">
                    <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-[#9edbe2]">Record native observation</summary>
                    <PublicationProofForm channel={channel} disabled={disabled} />
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>
        <p className="mt-5 text-xs leading-6 text-[#8f8778]">
          A ledger row proves only that an authorized operator recorded an observed native-platform state and evidence reference. It is not provider-side verification, reach, engagement, a lead, or a conversion.
        </p>
      </div>
    </Panel>
  );
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

function MeasurementStateBanner({ measurement }: { measurement: OwnedDemandMeasurementState }) {
  const tone = measurement.ready
    ? "border-[#4a8c6f66] bg-[#071712] text-[#d9f4e8]"
    : measurement.status === "query_failed"
      ? "border-[#a21f3d66] bg-[#2a0710] text-[#ffdbe4]"
      : "border-[#cda24a55] bg-[#1a1308] text-[#f4ead4]";
  const emphasis = measurement.ready
    ? "text-[#83dab4]"
    : measurement.status === "query_failed"
      ? "text-[#ff8ca7]"
      : "text-[#f0cf79]";

  return (
    <div role={measurement.ready ? "status" : "alert"} className={`mt-5 rounded-xl border px-5 py-4 text-sm leading-6 ${tone}`}>
      <strong className={emphasis}>{measurement.title}</strong>{" "}
      {measurement.detail}
    </div>
  );
}

function activationTone(state: OwnedDemandActivationState) {
  switch (state) {
    case "measured_signal":
      return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
    case "proof_attribution_mismatch":
      return "border-[#ff4d6d66] bg-[#310611] text-[#ffd0da]";
    case "signal_without_active_proof":
      return "border-[#ef835455] bg-[#2b1008] text-[#ffc5ad]";
    case "observed_unmeasured":
      return "border-[#4baab855] bg-[#06171b] text-[#bff8ff]";
    case "native_pending":
      return "border-[#cda24a55] bg-[#171108] text-[#f5dfa7]";
    case "native_inactive":
      return "border-[#a21f3d55] bg-[#21070e] text-[#ffdbe4]";
    case "prepared_not_observed":
      return "border-white/10 bg-white/[.03] text-[#bdb2a0]";
    case "evidence_unavailable":
      return "border-[#a21f3d55] bg-[#21070e] text-[#ffdbe4]";
  }
}

function ActivationControlLoop({ loop }: { loop: OwnedDemandActivationLoop }) {
  const next = loop.nextPlacement;
  const evidenceCount = (value: number) => loop.evidenceAvailable ? value : "—";
  return (
    <Panel
      eyebrow="Exact placement activation loop"
      title="Join native proof to first-party lead signals—without confusing either one."
      note={`${loop.totalPlacements} canonical placements · test and suppressed leads remain excluded upstream`}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Owned-demand activation lifecycle totals">
        <article className="rounded-xl border border-white/[.08] bg-black/35 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Exact placements</p>
          <p className="mt-2 font-serif text-3xl text-[#f4ead4]">{loop.totalPlacements}</p>
        </article>
        <article className="rounded-xl border border-[#4baab833] bg-[#061417] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8bbfc6]">Current active proof</p>
          <p className="mt-2 font-serif text-3xl text-[#a9edf4]">{evidenceCount(loop.activeProofPlacements)}</p>
        </article>
        <article className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/70">Measured placements</p>
          <p className="mt-2 font-serif text-3xl text-emerald-100">{evidenceCount(loop.measuredPlacements)}</p>
        </article>
        <article className="rounded-xl border border-[#ef835444] bg-[#2b1008] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#e6a085]">Signal proof review</p>
          <p className="mt-2 font-serif text-3xl text-[#ffc5ad]">{evidenceCount(loop.signalReviewPlacements)}</p>
        </article>
        <article className="rounded-xl border border-[#ff4d6d55] bg-[#310611] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff9bb2]">Identity review</p>
          <p className="mt-2 font-serif text-3xl text-[#ffd0da]">{evidenceCount(loop.identityReviewPlacements)}</p>
        </article>
        <article className="rounded-xl border border-[#cda24a33] bg-[#171108] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#cda24a]">Prepared · unobserved</p>
          <p className="mt-2 font-serif text-3xl text-[#f0cf79]">{evidenceCount(loop.unobservedPlacements)}</p>
        </article>
      </div>

      {!loop.evidenceAvailable ? (
        <div className="mt-4 rounded-xl border border-[#a21f3d55] bg-[#21070e] p-4 text-sm leading-6 text-[#ffdbe4]">
          The canonical publication-proof ledger is unavailable in this runtime. The command will not infer placement state from drafts or attribution alone. Restore the approved ledger read path before using this lifecycle view.
        </div>
      ) : next ? (
        <article className="mt-4 rounded-2xl border border-[#4baab855] bg-[linear-gradient(135deg,#06171b,#080d0e)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-4xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8bbfc6]">Next evidence-backed operator decision</p>
              <h3 className="mt-2 font-serif text-2xl text-[#d8f7fa] sm:text-3xl">
                {next.channelLabel} · {next.placementLabel}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#b9ced0]">{next.nextAction}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${activationTone(next.state)}`}>
              {next.stateLabel}
            </span>
          </div>
          <code className="mt-4 block break-all rounded-lg border border-white/10 bg-black/45 p-3 text-[10px] leading-5 text-[#9edbe2]">
            {next.trackedUrl}
          </code>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`#channel-${next.channelKey}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#4baab866] bg-[#4baab818] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#bff8ff] transition hover:bg-[#4baab82b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9edbe2]"
            >
              Open exact channel packet
            </Link>
            <p className="text-xs text-[#79a4aa]">
              {next.attributedLeads} exact live lead signal{next.attributedLeads === 1 ? "" : "s"}
              {next.latestProof ? ` · latest proof ${humanize(next.latestProof.platformState)} ${dateTime(next.latestProof.observedAt)}` : " · no native proof recorded"}
            </p>
          </div>
        </article>
      ) : null}

      <details className="group mt-4 rounded-xl border border-white/[.08] bg-black/30">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9edbe2]">
          <span className="flex items-center justify-between gap-3">
            Inspect all {loop.totalPlacements} exact lifecycle states
            <span aria-hidden="true" className="text-lg transition group-open:rotate-45">+</span>
          </span>
        </summary>
        <div className="grid gap-3 border-t border-white/[.08] p-3 md:grid-cols-2 xl:grid-cols-3">
          {loop.placements.map((placement) => (
            <article
              key={`${placement.channelKey}:${placement.placementKey}`}
              data-activation-state={placement.state}
              className="min-w-0 rounded-xl border border-white/[.08] bg-[#050505] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#8f8778]">{placement.channelLabel}</p>
                  <h4 className="mt-1 text-sm font-semibold text-[#f4ead4]">{placement.placementLabel}</h4>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${activationTone(placement.state)}`}>
                  {placement.stateLabel}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#a99f90]">{placement.nextAction}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px] leading-4">
                <div><dt className="uppercase tracking-[0.1em] text-[#6f6a61]">Lead signals</dt><dd className="mt-1 text-[#d9ceb8]">{placement.attributedLeads}</dd></div>
                <div><dt className="uppercase tracking-[0.1em] text-[#6f6a61]">Latest proof</dt><dd className="mt-1 text-[#d9ceb8]">{placement.latestProof ? humanize(placement.latestProof.platformState) : "None"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </details>

      <p className="mt-4 text-xs leading-6 text-[#8f8778]">{loop.authorityBoundary}</p>
    </Panel>
  );
}

const ASSET_DOWNLOADS: ReadonlyArray<{ format: OwnedDemandAssetFormat; label: string }> = [
  { format: "feed", label: "Download 4:5 PNG" },
  { format: "story", label: "Download 9:16 PNG" },
  { format: "qr_svg", label: "Download QR SVG" },
];

function DemandAssetLinks({
  channelKey,
  placementKey,
}: {
  channelKey: string;
  placementKey: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Protected launch asset downloads">
      {ASSET_DOWNLOADS.map((asset) => (
        <a
          key={asset.format}
          href={ownedDemandAssetHref(channelKey, placementKey, asset.format)}
          download
          className="inline-flex min-h-9 items-center rounded-full border border-[#4baab844] bg-[#06171b] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[#a9eaf0] transition hover:border-[#4baab888] hover:bg-[#0a2226] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9edbe2]"
        >
          {asset.label}
        </a>
      ))}
    </div>
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

function OfferPlacement({
  channelKey,
  offer,
  measurementReady,
}: {
  channelKey: string;
  offer: OwnedDemandOfferPlacement;
  measurementReady: boolean;
}) {
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
          {!measurementReady
            ? "Measurement unavailable"
            : observed
              ? `${offer.attributedLeads} signal${offer.attributedLeads === 1 ? "" : "s"}`
              : "Unmeasured"}
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
      <DemandAssetLinks channelKey={channelKey} placementKey={offer.key} />
      <p className="mt-3 text-[11px] leading-5 text-[#7f786d]">{offer.reviewNote}</p>
    </article>
  );
}

function ChannelCard({ channel, measurementReady }: { channel: OwnedDemandChannel; measurementReady: boolean }) {
  const observed = channel.status === "signal_detected";
  const channelPacket = buildOwnedDemandChannelPacket(channel);
  return (
    <article
      id={`channel-${channel.key}`}
      className="min-w-0 scroll-mt-24 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#101010,#060606)] p-5"
    >
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
          {!measurementReady
            ? "Measurement unavailable"
            : observed
              ? `${channel.attributedLeads} live signal${channel.attributedLeads === 1 ? "" : "s"}`
              : "Ready · unmeasured"}
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.08] bg-white/[.025] p-3">
        <p className="max-w-md text-[11px] leading-5 text-[#8f8778]">
          One local packet containing the general placement, all three offer variants, tracked links, and review boundaries.
        </p>
        <CopyDemandAsset label="Copy full channel flight" value={channelPacket} />
      </div>
      <DemandAssetLinks channelKey={channel.key} placementKey="general_question" />

      {channel.namedPlacements.length ? (
        <div className="mt-5 rounded-xl border border-[#4baab833] bg-[#061417] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9edbe2]">Named brokerage placements</p>
          <p className="mt-2 text-xs leading-5 text-[#8f8778]">Use the exact page-specific link. Each live WordPress edit still requires its own backup, review, publication approval, and rollback proof.</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {channel.namedPlacements.map((placement) => (
              <article key={placement.placementKey} className="min-w-0 rounded-lg border border-white/[.08] bg-black/35 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-[#f4ead4]">{placement.placementLabel}</p>
                  <span className="text-[9px] font-bold uppercase tracking-[0.11em] text-[#8f8778]">{placement.attributedLeads ? `${placement.attributedLeads} signal${placement.attributedLeads === 1 ? "" : "s"}` : "Unmeasured"}</span>
                </div>
                <code className="mt-2 block break-all text-[10px] leading-5 text-[#9edbe2]">{placement.trackedUrl}</code>
                <div className="mt-2"><CopyDemandAsset label="Copy tracked link" value={placement.trackedUrl} /></div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <details className="group mt-5 rounded-xl border border-[#4baab833] bg-[#061417]">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#9edbe2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9edbe2]">
          <span className="flex items-center justify-between gap-3">
            Three offer-specific placements
            <span aria-hidden="true" className="text-lg transition group-open:rotate-45">+</span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-[#4baab833] p-3">
          {channel.offers.map((offer) => (
            <OfferPlacement
              key={offer.key}
              channelKey={channel.key}
              offer={offer}
              measurementReady={measurementReady}
            />
          ))}
        </div>
      </details>
    </article>
  );
}

export default async function DistributionPage({
  searchParams,
}: {
  searchParams?: Promise<{ publication_action?: string }>;
}) {
  const principal = await requireLeadCenterPermission("report:view");
  const [growth, ledger, query] = await Promise.all([
    loadGrowthIntelligence(30),
    loadOwnedDemandPublicationProofLedger(),
    searchParams,
  ]);
  const command = buildOwnedDemandCommand(growth);
  const measurement = assessOwnedDemandMeasurement(growth);
  const activation = buildOwnedDemandActivationLoop(command, ledger);
  const canManage = Boolean(principal && hasLeadCenterPermission(principal.role, "growth:manage"));
  const previewReadOnly = isPreviewDataDisabled();
  const stateLabel = !measurement.ready
    ? measurement.label
    : command.measurementState === "no_live_signal"
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

        <MeasurementStateBanner measurement={measurement} />

        <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Owned demand measurement status">
          <article className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">Eligible live leads · 30d</p>
            <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{measurement.ready ? growth.summary.leads : "—"}</p>
            <p className="mt-2 text-xs text-[#8f8778]">
              {measurement.ready ? "Test and suppressed records excluded in SQL" : "Unavailable is not zero live demand"}
            </p>
          </article>
          <article className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">Useful attribution</p>
            <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{measurement.ready ? `${command.attributedLeadRate}%` : "—"}</p>
            <p className="mt-2 text-xs text-[#8f8778]">
              {measurement.ready ? "Canonical first-party source coverage" : "Awaiting canonical Growth measurement"}
            </p>
          </article>
          <article className="rounded-xl border border-[#cda24a55] bg-[linear-gradient(145deg,#171108,#090909)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#cda24a]">Owned-source signals</p>
            <p className="mt-3 font-serif text-3xl text-[#f0cf79]">{measurement.ready ? command.attributedLiveLeads : "—"}</p>
            <p className="mt-2 text-xs text-[#a99a7e]">
              {measurement.ready ? "Exact campaign + placement matches on the latest recorded touch" : "No signal inference while measurement is unavailable"}
            </p>
          </article>
        </section>

        <div className="mt-5 rounded-xl border border-[#cda24a55] bg-[#1a1308] px-5 py-4 text-sm leading-6 text-[#f4ead4]">
          <strong className="text-[#f0cf79]">{measurement.ready ? "Measured bottleneck:" : "Measurement boundary:"}</strong>{" "}
          {measurement.ready
            ? command.bottleneck
            : "Prepared assets remain available for review, but measurement must recover before interpreting demand or choosing a launch channel."}
        </div>

        <div className="mt-5">
          <ActivationControlLoop loop={activation} />
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
          {command.channels.map((channel) => (
            <ChannelCard key={channel.key} channel={channel} measurementReady={measurement.ready} />
          ))}
        </div>

        <div className="mt-5">
          <PublicationLedger
            channels={command.channels}
            ledger={ledger}
            canManage={canManage}
            previewReadOnly={previewReadOnly}
            actionStatus={query?.publication_action}
          />
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
