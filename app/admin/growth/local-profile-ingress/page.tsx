import Link from "next/link";
import { requireLeadCenterPermission } from "../../../../src/lib/admin/rbac-session";
import {
  LOCAL_PROFILE_PERFORMANCE_INGRESS_CONFIRMATION,
  LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES,
  LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_ROWS,
  SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV,
} from "../../../lib/growth/local-profile-performance-ingress";
import { loadLocalProfilePerformanceIngressState } from "../../../lib/persistence/neonLocalProfilePerformanceIngress";
import { LocalProfilePerformanceIngressWorkbench } from "./local-profile-performance-ingress-workbench";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusTone(ready: boolean) {
  return ready
    ? "border-[#4a8c6f55] bg-[#071712] text-[#83dab4]"
    : "border-[#cda24a55] bg-[#171207] text-[#e4c36f]";
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export default async function LocalProfilePerformanceIngressPage() {
  await requireLeadCenterPermission("growth:manage");
  const state = await loadLocalProfilePerformanceIngressState();
  const commitReady = state.configured && state.schemaReady && state.importEnabled &&
    state.mutationAllowed && state.productionIdentityConfirmed;
  const receiptReadSealed = state.error === "local_profile_database_identity_unconfirmed";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_82%_0%,rgba(31,128,110,.2),transparent_34%),radial-gradient(circle_at_12%_10%,rgba(205,162,74,.11),transparent_30%),#040404] px-4 py-7 text-[#f4ead4] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-[#cda24a33] bg-[linear-gradient(135deg,rgba(18,18,18,.96),rgba(5,5,5,.98))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#d1aa53]">
            Ask Magic Mike · Local Demand Intelligence
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-4xl">
              <h1 className="font-serif text-4xl leading-tight text-[#f4ead4] sm:text-6xl">
                Local profile opportunity radar
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9bdab] sm:text-base">
                Turn one reviewed Google Business Profile performance report into minimized demand signals and one
                explainable conversion-path recommendation. This surface does not retain raw CSV, search terms,
                provider location IDs, credentials, or provider payloads.
              </p>
            </div>
            <Link
              href="/admin/growth"
              className="min-h-11 rounded-full border border-white/10 bg-white/[.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] transition hover:border-[#cda24a66] hover:text-[#f0cf79] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0cf79]"
            >
              Back to Growth
            </Link>
          </div>

          <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Canonical Neon", state.configured ? "connected" : "not configured", state.configured],
              ["Read identity", state.readIdentityConfirmed ? "endpoint confirmed" : "not confirmed", state.readIdentityConfirmed],
              ["Import contract", state.schemaReady ? "schema ready" : "migration pending", state.schemaReady],
              ["Operator gate", state.importEnabled ? "enabled" : "disabled by default", state.importEnabled],
              ["Runtime writes", state.mutationAllowed ? "allowed" : "read-only Preview", state.mutationAllowed],
              ["Database identity", state.productionIdentityConfirmed ? "Production confirmed" : "not confirmed", state.productionIdentityConfirmed],
            ].map(([label, value, ready]) => (
              <div key={String(label)} className={`rounded-xl border p-4 ${statusTone(Boolean(ready))}`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</p>
                <p className="mt-2 text-sm font-semibold capitalize">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className={`mt-5 rounded-xl border px-5 py-4 text-sm leading-6 ${
          commitReady
            ? "border-[#4a8c6f66] bg-[#071712] text-[#c6e5d6]"
            : "border-[#4baab866] bg-[#06171b] text-[#d9f5f8]"
        }`}>
          <strong className={commitReady ? "text-[#83dab4]" : "text-[#7ee7f1]"}>
            {commitReady ? "Production import authority is active." : "Validation is available; mutation remains sealed."}
          </strong>{" "}
          This tool observes and recommends only. It cannot call Google, edit the profile, publish content, send a
          message, create a lead, change WordPress, or cross into another brand system. Synthetic templates never commit.
        </div>

        {state.error ? (
          <p className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${
            receiptReadSealed
              ? "border-[#cda24a55] bg-[#171207] text-[#f3db9c]"
              : "border-[#a21f3d66] bg-[#2a0710] text-[#ffdbe4]"
          }`}>
            {receiptReadSealed
              ? "Receipt reads are sealed in this Preview. Its configured database endpoint is not attested for this branch, so no receipt query or write was attempted. Synthetic validation remains available."
              : "Local-profile ingress state could not be read safely. No report query or write was attempted."}
          </p>
        ) : null}

        <section className="mt-5">
          <LocalProfilePerformanceIngressWorkbench
            commitReady={commitReady}
            confirmationPhrase={LOCAL_PROFILE_PERFORMANCE_INGRESS_CONFIRMATION}
            maxBytes={LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES}
            maxRows={LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_ROWS}
            syntheticCsv={SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Durable receipts</p>
              <h2 className="mt-2 font-serif text-3xl text-[#f4ead4]">Recent aggregate reports</h2>
            </div>
            <p className="text-xs text-[#8f8778]">{state.receipts.length} minimized receipt{state.receipts.length === 1 ? "" : "s"}</p>
          </div>

          {state.schemaReady && state.receipts.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                  <tr>
                    <th className="px-2 py-3">Imported</th>
                    <th className="px-2 py-3">Window</th>
                    <th className="px-2 py-3">State</th>
                    <th className="px-2 py-3">Signals I / R / same</th>
                    <th className="px-2 py-3">Opportunity I / R / same</th>
                    <th className="px-2 py-3">Impressions</th>
                    <th className="px-2 py-3">Interactions / rate</th>
                    <th className="px-2 py-3">Website / calls / directions</th>
                    <th className="px-2 py-3">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.07]">
                  {state.receipts.map((receipt) => (
                    <tr key={receipt.id} className="align-top">
                      <td className="px-2 py-4 text-[#d8c9aa]">
                        {new Date(receipt.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })}
                      </td>
                      <td className="px-2 py-4 text-[#b8ad9c]">{receipt.dateStart} → {receipt.dateEnd}</td>
                      <td className="px-2 py-4 text-[#b8ad9c]">{receipt.dataState}</td>
                      <td className="px-2 py-4">{receipt.insertedSignals} / {receipt.updatedSignals} / {receipt.unchangedSignals}</td>
                      <td className="px-2 py-4">{receipt.insertedOpportunities} / {receipt.updatedOpportunities} / {receipt.unchangedOpportunities}</td>
                      <td className="px-2 py-4">{receipt.impressionsTotal.toLocaleString()}</td>
                      <td className="px-2 py-4">{receipt.interactionsTotal.toLocaleString()} / <span className="text-[#f0cf79]">{percent(receipt.interactionRate)}</span></td>
                      <td className="px-2 py-4">{receipt.websiteClicks} / {receipt.callClicks} / {receipt.directionRequests}</td>
                      <td className="px-2 py-4 font-mono text-[11px] text-[#8f8778]">
                        {receipt.batchFingerprint.slice(0, 12)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-white/[.08] bg-black/30 p-4 text-sm leading-6 text-[#8f8778]">
              {state.schemaReady
                ? "No real Google Business Profile performance report has been imported. Empty is truthful."
                : "The additive local-profile receipt migration has not been applied in this environment."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
