"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { LocalProfilePerformanceIngressPreview } from "../../../lib/growth/local-profile-performance-ingress";

interface CommitReceipt {
  batchId: string;
  auditId: string;
  idempotentReplay: boolean;
  rowCount: number;
  insertedSignals: number;
  updatedSignals: number;
  unchangedSignals: number;
  insertedOpportunities: number;
  updatedOpportunities: number;
  unchangedOpportunities: number;
  batchFingerprint: string;
  rawCsvRetained: false;
  rawSearchTermsRetained: false;
  providerLocationIdRetained: false;
  providerCallPerformed: false;
  profileMutationPerformed: false;
  contentPublished: false;
}

function words(value: string) {
  return value.replaceAll("_", " ");
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function LocalProfilePerformanceIngressWorkbench({
  commitReady,
  confirmationPhrase,
  maxBytes,
  maxRows,
  syntheticCsv,
}: {
  commitReady: boolean;
  confirmationPhrase: string;
  maxBytes: number;
  maxRows: number;
  syntheticCsv: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<LocalProfilePerformanceIngressPreview | null>(null);
  const [approvalReference, setApprovalReference] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"validate" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CommitReceipt | null>(null);

  function replaceCsv(value: string) {
    setCsv(value);
    setPreview(null);
    setReceipt(null);
    setError(null);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`File exceeds the ${Math.round(maxBytes / 1024)} KiB limit.`);
      return;
    }
    try {
      replaceCsv(await file.text());
    } catch {
      setError("The CSV could not be read on this device.");
    }
  }

  async function validate() {
    setBusy("validate");
    setError(null);
    setReceipt(null);
    try {
      const response = await fetch("/api/admin/growth/local-profile-ingress/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        preview?: LocalProfilePerformanceIngressPreview;
      } | null;
      if (!response.ok || !result?.ok || !result.preview) {
        throw new Error(result?.error || `validation_http_${response.status}`);
      }
      setPreview(result.preview);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? words(caught.message) : "validation failed safely");
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    if (!preview?.ok || !preview.batchFingerprint || preview.synthetic) return;
    setBusy("commit");
    setError(null);
    setReceipt(null);
    try {
      const response = await fetch("/api/admin/growth/local-profile-ingress/commit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalReference,
          batchFingerprint: preview.batchFingerprint,
          confirmation,
          csv,
        }),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        preview?: LocalProfilePerformanceIngressPreview;
        receipt?: CommitReceipt;
      } | null;
      if (result?.preview) setPreview(result.preview);
      if (!response.ok || !result?.ok || !result.receipt) {
        throw new Error(result?.error || `commit_http_${response.status}`);
      }
      setReceipt(result.receipt);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? words(caught.message) : "import failed safely");
    } finally {
      setBusy(null);
    }
  }

  const canCommit = Boolean(
    commitReady && preview?.ok && preview.batchFingerprint && !preview.synthetic &&
    approvalReference.trim().length >= 4 && confirmation === confirmationPhrase && !busy,
  );

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <section className="min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Step 1 · Aggregate evidence</p>
            <h2 className="mt-2 font-serif text-3xl text-[#f4ead4]">Paste or select CSV</h2>
          </div>
          <button
            type="button"
            onClick={() => replaceCsv(syntheticCsv)}
            className="min-h-11 rounded-full border border-[#4baab866] bg-[#06171b] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#7ee7f1] transition hover:border-[#7ee7f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ee7f1]"
          >
            Load synthetic example
          </button>
        </div>

        <label htmlFor="local-profile-performance-csv" className="mt-5 block text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
          Reviewed Business Profile performance CSV
        </label>
        <textarea
          id="local-profile-performance-csv"
          value={csv}
          onChange={(event) => replaceCsv(event.target.value)}
          rows={14}
          spellCheck={false}
          placeholder="start_date,end_date,profile_key,data_state,metric,value,source_system"
          className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-xs leading-6 text-[#e8dcc5] outline-none transition placeholder:text-[#5f594f] focus:border-[#cda24a99] focus:ring-2 focus:ring-[#cda24a33]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void readFile(event.target.files?.[0])}
            className="sr-only"
            id="local-profile-performance-csv-file"
            aria-label="Select reviewed Business Profile performance CSV file"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#d9ceb8] transition hover:border-[#cda24a66] hover:text-[#f0cf79] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0cf79]"
          >
            Select CSV file
          </button>
          <button
            type="button"
            onClick={() => void validate()}
            disabled={busy !== null || csv.length === 0}
            className="min-h-11 rounded-full border border-[#cda24a88] bg-[#cda24a] px-5 py-2 text-xs font-bold uppercase tracking-[0.1em] text-black transition hover:bg-[#f0cf79] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0cf79]"
          >
            {busy === "validate" ? "Validating…" : "Validate without writing"}
          </button>
          <span className="text-xs text-[#746d62]">Maximum {Math.round(maxBytes / 1024)} KiB · {maxRows} rows</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#746d62]">
          Use one aggregate report for the approved Our Town Properties profile and date window. Do not add search
          keyword, provider location ID, customer, review, message, or contact columns. Validation stores nothing.
        </p>
      </section>

      <section className="min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5 sm:p-6" aria-live="polite">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Step 2 · Evidence preview</p>
        <h2 className="mt-2 font-serif text-3xl text-[#f4ead4]">Review normalized truth</h2>

        {error ? (
          <p className="mt-4 rounded-xl border border-[#a21f3d66] bg-[#2a0710] p-4 text-sm text-[#ffdbe4]">
            Stopped safely: {error}. No database write was performed.
          </p>
        ) : null}

        {!preview ? (
          <p className="mt-4 rounded-xl border border-white/[.08] bg-black/30 p-4 text-sm leading-6 text-[#8f8778]">
            No validation has run. The contract rejects foreign profiles, raw search-term or provider-identity
            columns, mixed report identities, duplicate metrics, malformed dates, formulas, and oversized input.
          </p>
        ) : (
          <>
            <div className={`mt-4 rounded-xl border p-4 text-sm ${
              preview.ok
                ? preview.synthetic
                  ? "border-[#4baab866] bg-[#06171b] text-[#d9f5f8]"
                  : "border-[#4a8c6f66] bg-[#071712] text-[#c6e5d6]"
                : "border-[#a21f3d66] bg-[#2a0710] text-[#ffdbe4]"
            }`}>
              <strong>{preview.ok ? "Local-profile performance contract passed." : "Local-profile performance contract failed."}</strong>{" "}
              {preview.synthetic
                ? "This is unmistakably synthetic and cannot be committed."
                : preview.ok
                  ? "Review the aggregate totals and explainable recommendation before authorizing the report."
                  : `${preview.issues.length} validation issue${preview.issues.length === 1 ? "" : "s"} found.`}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["Metrics", String(preview.rowCount)],
                ["Impressions", preview.totals.impressions.toLocaleString()],
                ["Interactions", preview.totals.interactions.toLocaleString()],
                ["Interaction rate", percent(preview.totals.interactionRate)],
                ["Website / calls", `${preview.totals.websiteClicks} / ${preview.totals.callClicks}`],
                ["Search terms", "0 retained"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[.08] bg-black/30 p-3">
                  <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">{label}</dt>
                  <dd className="mt-2 font-serif text-xl text-[#f0cf79]">{value}</dd>
                </div>
              ))}
            </dl>

            {preview.issues.length ? (
              <ul className="mt-4 max-h-64 space-y-2 overflow-auto rounded-xl border border-[#a21f3d55] bg-[#17060b] p-3 text-xs leading-5 text-[#ffdbe4]">
                {preview.issues.map((entry, index) => (
                  <li key={`${entry.row}-${entry.field}-${entry.code}-${index}`}>
                    <strong>Row {entry.row || "—"}{entry.field ? ` · ${entry.field}` : ""}:</strong>{" "}
                    {entry.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {preview.ok ? (
              <div className="mt-4 rounded-xl border border-white/[.08] bg-black/30 p-3 text-xs leading-5 text-[#b8ad9c]">
                <p><strong className="text-[#e8dcc5]">Window:</strong> {preview.dateStart} → {preview.dateEnd}</p>
                <p><strong className="text-[#e8dcc5]">Profile:</strong> {preview.profileKeys.join(" · ")}</p>
                <p><strong className="text-[#e8dcc5]">State:</strong> {preview.rows[0]?.dataState}</p>
                <p className="break-all"><strong className="text-[#e8dcc5]">Batch fingerprint:</strong> {preview.batchFingerprint}</p>
                <p><strong className="text-[#e8dcc5]">Raw CSV / search terms / location IDs retained:</strong> no / no / no</p>
                <p className="mt-2 text-[#8f8778]">
                  Coverage caveat: this batch proves only the reviewed aggregate rows supplied; it is not a live Google connection.
                </p>
              </div>
            ) : null}
          </>
        )}
      </section>

      {preview?.ok && preview.rows.length ? (
        <section className="min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5 sm:p-6 xl:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Normalized aggregate metrics</p>
          <dl className="mt-4 grid gap-3 sm:hidden" data-testid="local-profile-mobile-metrics">
            {preview.rows.slice(0, maxRows).map((row) => (
              <div
                key={row.rowFingerprint}
                data-testid={`local-profile-mobile-metric-${row.metric}`}
                className="min-w-0 rounded-xl border border-white/[.08] bg-black/30 p-4"
              >
                <dt className="break-words text-sm font-semibold leading-5 text-[#f4ead4]">{words(row.metric)}</dt>
                <dd className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">Value</span>
                    <span className="mt-1 block font-serif text-xl text-[#f0cf79]">{row.value.toLocaleString()}</span>
                  </span>
                  <span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">Class</span>
                    <span className="mt-1 block break-words leading-5 text-[#b8ad9c]">{words(row.signalType)}</span>
                  </span>
                  <span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">Signal / confidence</span>
                    <span className="mt-1 block leading-5">
                      <span className="text-[#f0cf79]">{row.signalScore}</span>
                      <span className="text-[#746d62]"> / {(row.confidence * 100).toFixed(0)}%</span>
                    </span>
                  </span>
                  <span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">Window</span>
                    <span className="mt-1 block leading-5 text-[#b8ad9c]">{row.startDate}<br />{row.endDate}</span>
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 hidden max-w-full overflow-x-auto sm:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                <tr>
                  <th className="px-2 py-3">Metric</th>
                  <th className="px-2 py-3">Value</th>
                  <th className="px-2 py-3">Class</th>
                  <th className="px-2 py-3">Signal / confidence</th>
                  <th className="px-2 py-3">Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.07]">
                {preview.rows.slice(0, maxRows).map((row) => (
                  <tr key={row.rowFingerprint} className="align-top">
                    <td className="px-2 py-4 text-[#f4ead4]">{words(row.metric)}</td>
                    <td className="px-2 py-4">{row.value.toLocaleString()}</td>
                    <td className="px-2 py-4 text-[#b8ad9c]">{words(row.signalType)}</td>
                    <td className="px-2 py-4">
                      <span className="text-[#f0cf79]">{row.signalScore}</span>
                      <span className="text-[#746d62]"> / {(row.confidence * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-2 py-4 text-[#b8ad9c]">{row.startDate} → {row.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 rounded-xl border border-[#cda24a33] bg-[#171207] p-4">
            {preview.opportunity ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d1aa53]">Explainable recommendation · Score {preview.opportunity.score}</p>
                <h3 className="mt-2 font-serif text-2xl text-[#f4ead4]">{preview.opportunity.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#c9bdab]">{preview.opportunity.rationale}</p>
                <p className="mt-3 text-xs text-[#8f8778]">
                  Demand {preview.opportunity.demandPoints} + interaction gap {preview.opportunity.interactionGapPoints} + completeness {preview.opportunity.completenessPoints}. Recommendation only; no profile action is performed.
                </p>
              </>
            ) : (
              <p className="text-sm leading-6 text-[#b8ad9c]">Observe only; the final-data, completeness, volume, and interaction-gap policy did not all fire.</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="min-w-0 rounded-2xl border border-[#cda24a33] bg-[#080808] p-5 sm:p-6 xl:col-span-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Step 3 · Explicit Production authority</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="local-profile-approval-reference" className="text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
              Business Profile report reference
            </label>
            <input
              id="local-profile-approval-reference"
              value={approvalReference}
              onChange={(event) => setApprovalReference(event.target.value)}
              maxLength={160}
              placeholder="Example: GBP Performance · 2026-08-01 to 2026-08-20"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-[#e8dcc5] outline-none transition placeholder:text-[#5f594f] focus:border-[#cda24a99] focus:ring-2 focus:ring-[#cda24a33]"
            />
          </div>
          <div>
            <label htmlFor="local-profile-confirmation" className="text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
              Type {confirmationPhrase}
            </label>
            <input
              id="local-profile-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-[#e8dcc5] outline-none transition focus:border-[#cda24a99] focus:ring-2 focus:ring-[#cda24a33]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void commit()}
            disabled={!canCommit}
            className="min-h-11 rounded-full border border-[#4a8c6f88] bg-[#1f7458] px-5 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#2d8f6f] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[.04] disabled:text-[#686158] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83dab4]"
          >
            {busy === "commit" ? "Committing…" : "Commit reviewed aggregate report"}
          </button>
          <span className="text-xs leading-5 text-[#746d62]">
            Requires schema, Production endpoint attestation, mutation authority, feature gate, real report, exact fingerprint, and typed confirmation.
          </span>
        </div>

        {receipt ? (
          <div className="mt-5 rounded-xl border border-[#4a8c6f66] bg-[#071712] p-4 text-sm leading-6 text-[#c6e5d6]" aria-live="polite">
            <strong className="text-[#83dab4]">Durable receipt recorded.</strong>{" "}
            {receipt.idempotentReplay ? "The exact reviewed batch was already present; no duplicate records were written." : "Signals and any advisory opportunity were reconciled atomically."}
            <p className="mt-2 font-mono text-[11px] text-[#79a993]">Batch {receipt.batchId} · Audit {receipt.auditId}</p>
            <p className="mt-1 text-xs text-[#79a993]">Raw CSV, search terms, provider IDs, provider calls, profile edits, and publication: none.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
