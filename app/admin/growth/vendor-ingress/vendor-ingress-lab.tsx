"use client";

import { useState } from "react";
import type {
  VendorIngressContractInspection,
  VendorIngressContractSummary,
  VendorIngressTestProfile,
} from "../../../lib/growth/vendor-ingress-contracts";

function words(value: string) {
  return value.replaceAll("_", " ");
}

function statusTone(status: VendorIngressContractSummary["contractStatus"]) {
  if (status === "direct_payload_contract_ready") return "border-[#4a8c6f66] bg-[#071712] text-[#83dab4]";
  if (status === "envelope_contract_ready") return "border-[#4baab866] bg-[#06171b] text-[#7ee7f1]";
  return "border-[#cda24a55] bg-[#171207] text-[#e4c36f]";
}

export function VendorIngressContractLab({
  contracts,
}: {
  contracts: VendorIngressContractSummary[];
}) {
  const [running, setRunning] = useState<VendorIngressTestProfile | null>(null);
  const [inspection, setInspection] = useState<VendorIngressContractInspection | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(profile: VendorIngressTestProfile) {
    setRunning(profile);
    setError(null);
    try {
      const response = await fetch("/api/admin/growth/vendor-ingress/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ profile }),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        inspection?: VendorIngressContractInspection;
      } | null;
      if (!response.ok || !result?.ok || !result.inspection) {
        throw new Error(result?.error || `contract_check_http_${response.status}`);
      }
      setInspection(result.inspection);
    } catch (caught) {
      setInspection(null);
      setError(caught instanceof Error ? caught.message : "contract_check_failed");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-2">
        {contracts.map((contract) => (
          <article
            key={contract.profile}
            className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">
                  {words(contract.category)} · {words(contract.payloadMode)}
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[#f4ead4]">{contract.label}</h2>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${statusTone(contract.contractStatus)}`}>
                {words(contract.contractStatus)}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#b8ad9c]">{contract.readinessNote}</p>
            <dl className="mt-4 grid gap-2 text-xs">
              <div className="rounded-lg border border-white/[.07] bg-black/30 p-3">
                <dt className="font-bold uppercase tracking-[0.12em] text-[#746d62]">Verification contract</dt>
                <dd className="mt-1 break-words text-[#d8c9aa]">{words(contract.signatureMode)}</dd>
              </div>
              <div className="rounded-lg border border-white/[.07] bg-black/30 p-3">
                <dt className="font-bold uppercase tracking-[0.12em] text-[#746d62]">Secure activation requirements</dt>
                <dd className="mt-2">
                  <ul className="space-y-1.5 text-[#b8ad9c]">
                    {contract.secureRequirements.map((requirement) => <li key={requirement}>• {requirement}</li>)}
                  </ul>
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => run(contract.profile)}
                disabled={running !== null}
                className="min-h-11 rounded-full border border-[#cda24a88] bg-[#cda24a] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-black transition hover:bg-[#f0cf79] disabled:cursor-wait disabled:opacity-50"
              >
                {running === contract.profile ? "Checking…" : "Run synthetic contract check"}
              </button>
              <a
                href={contract.officialReference}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#b9ae9d] transition hover:border-[#4baab866] hover:text-[#7ee7f1]"
              >
                First-party reference
              </a>
            </div>
          </article>
        ))}
      </div>

      <section
        aria-live="polite"
        className="rounded-2xl border border-[#cda24a33] bg-[#080808] p-5 shadow-[0_24px_80px_rgba(0,0,0,.35)]"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Inspection result</p>
        {error ? (
          <p className="mt-3 rounded-xl border border-[#a21f3d66] bg-[#2a0710] p-4 text-sm text-[#ffdbe4]">
            Contract check failed safely: {words(error)}. No provider or database action was attempted.
          </p>
        ) : inspection ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <h3 className="font-serif text-3xl text-[#f4ead4]">{inspection.contract.label}</h3>
              <p className="mt-2 text-sm leading-6 text-[#b8ad9c]">
                {inspection.testMarker}. The lab exercised the reviewed contract using fixed synthetic values.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  ["Synthetic verification", inspection.verification.syntheticVerificationPassed == null ? "provider contract pending" : inspection.verification.syntheticVerificationPassed ? "passed" : "failed"],
                  ["Provider fetch", inspection.verification.providerFetchRequired == null ? "provider contract pending" : inspection.verification.providerFetchRequired ? "required before normalization" : "not required"],
                  ["Canonical lead", inspection.verification.canonicalLeadReady ? "structurally ready" : "held for review"],
                  ["Payload fingerprint", inspection.payloadHash ? `${inspection.payloadHash.slice(0, 16)}…` : "not generated"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[.08] bg-black/30 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">{label}</p>
                    <p className="mt-2 text-sm text-[#d8c9aa]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#4a8c6f44] bg-[#07120f] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#83dab4]">Hard safety boundary</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#c6e5d6]">
                <li>✓ Provider call performed: no</li>
                <li>✓ Database write performed: no</li>
                <li>✓ Raw payload retained: no</li>
                <li>✓ Live activation authorized: no</li>
                <li>✓ Test state: explicit</li>
              </ul>
              <p className="mt-4 text-xs leading-5 text-[#86a99a]">
                Review flags: {inspection.reviewReasons.length ? inspection.reviewReasons.map(words).join(" · ") : "none"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#8f8778]">
            Choose a provider contract above. The result will show exactly what can be trusted, what requires a provider fetch or contract, and why no live lead is created.
          </p>
        )}
      </section>
    </div>
  );
}
