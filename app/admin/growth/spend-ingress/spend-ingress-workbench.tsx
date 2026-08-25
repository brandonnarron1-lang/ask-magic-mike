"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { SpendIngressPreview } from "../../../lib/growth/spend-ingress";

interface CommitReceipt {
  batchId: string;
  auditId: string;
  idempotentReplay: boolean;
  rowCount: number;
  insertedRows: number;
  updatedRows: number;
  unchangedRows: number;
  batchFingerprint: string;
  rawCsvRetained: false;
}

function words(value: string) {
  return value.replaceAll("_", " ");
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function SpendIngressWorkbench({
  commitReady,
  confirmationPhrase,
  maxBytes,
  syntheticCsv,
}: {
  commitReady: boolean;
  confirmationPhrase: string;
  maxBytes: number;
  syntheticCsv: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<SpendIngressPreview | null>(null);
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
      const response = await fetch("/api/admin/growth/spend-ingress/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        preview?: SpendIngressPreview;
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
      const response = await fetch("/api/admin/growth/spend-ingress/commit", {
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
        preview?: SpendIngressPreview;
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Step 1 · Local source</p>
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

        <label htmlFor="spend-csv" className="mt-5 block text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
          Canonical daily-spend CSV
        </label>
        <textarea
          id="spend-csv"
          value={csv}
          onChange={(event) => replaceCsv(event.target.value)}
          rows={14}
          spellCheck={false}
          placeholder="spend_date,channel_key,…"
          className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-xs leading-6 text-[#e8dcc5] outline-none transition placeholder:text-[#5f594f] focus:border-[#cda24a99] focus:ring-2 focus:ring-[#cda24a33]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void readFile(event.target.files?.[0])}
            className="sr-only"
            id="spend-csv-file"
            aria-label="Select canonical daily-spend CSV file"
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
          <span className="text-xs text-[#746d62]">Maximum {Math.round(maxBytes / 1024)} KiB · 250 rows</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#746d62]">
          Validation runs through the authenticated server contract. The raw CSV is neither logged nor written to Neon.
        </p>
      </section>

      <section className="min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5 sm:p-6" aria-live="polite">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Step 2 · Contract preview</p>
        <h2 className="mt-2 font-serif text-3xl text-[#f4ead4]">Review normalized truth</h2>

        {error ? (
          <p className="mt-4 rounded-xl border border-[#a21f3d66] bg-[#2a0710] p-4 text-sm text-[#ffdbe4]">
            Stopped safely: {error}. No database write was performed.
          </p>
        ) : null}

        {!preview ? (
          <p className="mt-4 rounded-xl border border-white/[.08] bg-black/30 p-4 text-sm leading-6 text-[#8f8778]">
            No validation has run. The tool will reject unknown columns, ambiguous dates, duplicate campaign-days,
            conflicting identities, unsafe strings, malformed metrics, and oversized batches.
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
              <strong>{preview.ok ? "CSV contract passed." : "CSV contract failed."}</strong>{" "}
              {preview.synthetic
                ? "This is unmistakably synthetic and cannot be committed."
                : preview.ok
                  ? "Review the totals and exact campaign identities before authorizing the batch."
                  : `${preview.issues.length} validation issue${preview.issues.length === 1 ? "" : "s"} found.`}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["Rows", String(preview.rowCount)],
                ["Spend", money(preview.totals.spendUsd)],
                ["Impressions", preview.totals.impressions.toLocaleString()],
                ["Clicks", preview.totals.clicks.toLocaleString()],
                ["Platform leads", preview.totals.platformLeads.toLocaleString()],
                ["Booked appts.", preview.totals.bookedAppointments.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[.08] bg-black/30 p-3">
                  <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">{label}</dt>
                  <dd className="mt-2 font-serif text-xl text-[#f0cf79]">{value}</dd>
                </div>
              ))}
            </dl>

            {preview.issues.length ? (
              <ul className="mt-4 max-h-64 space-y-2 overflow-auto rounded-xl border border-[#a21f3d55] bg-[#17060b] p-3 text-xs leading-5 text-[#ffdbe4]">
                {preview.issues.map((issue, index) => (
                  <li key={`${issue.row}-${issue.field}-${issue.code}-${index}`}>
                    <strong>Row {issue.row || "—"}{issue.field ? ` · ${issue.field}` : ""}:</strong>{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {preview.ok ? (
              <div className="mt-4 rounded-xl border border-white/[.08] bg-black/30 p-3 text-xs leading-5 text-[#b8ad9c]">
                <p><strong className="text-[#e8dcc5]">Dates:</strong> {preview.dateStart} → {preview.dateEnd}</p>
                <p><strong className="text-[#e8dcc5]">Sources:</strong> {preview.sourceSystems.join(" · ")}</p>
                <p className="break-all"><strong className="text-[#e8dcc5]">Batch fingerprint:</strong> {preview.batchFingerprint}</p>
                <p><strong className="text-[#e8dcc5]">Raw retained:</strong> no</p>
              </div>
            ) : null}
          </>
        )}
      </section>

      {preview?.ok && preview.rows.length ? (
        <section className="min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5 sm:p-6 xl:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Normalized rows</p>
          <div className="mt-4 max-w-full overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                <tr>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Channel</th>
                  <th className="px-2 py-3">Campaign</th>
                  <th className="px-2 py-3">Exact UTM</th>
                  <th className="px-2 py-3">Spend</th>
                  <th className="px-2 py-3">Impr.</th>
                  <th className="px-2 py-3">Clicks</th>
                  <th className="px-2 py-3">Leads</th>
                  <th className="px-2 py-3">Source system</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.07]">
                {preview.rows.slice(0, 250).map((row) => (
                  <tr key={row.rowFingerprint} className="align-top">
                    <td className="px-2 py-4">{row.spendDate}</td>
                    <td className="px-2 py-4">
                      <span className="block text-[#f4ead4]">{row.channelName}</span>
                      <span className="mt-1 block text-[10px] text-[#746d62]">{row.channelKey} · {row.buyingModel}</span>
                    </td>
                    <td className="px-2 py-4">
                      <span className="block text-[#f4ead4]">{row.campaignName}</span>
                      <span className="mt-1 block text-[10px] text-[#746d62]">{row.campaignKey} · {row.campaignStatus}</span>
                    </td>
                    <td className="px-2 py-4 font-mono text-[11px] text-[#b8ad9c]">
                      {row.utmSource} / {row.utmMedium} / {row.utmCampaign}
                    </td>
                    <td className="px-2 py-4 text-[#f0cf79]">{money(row.spendUsd)}</td>
                    <td className="px-2 py-4">{row.impressions.toLocaleString()}</td>
                    <td className="px-2 py-4">{row.clicks.toLocaleString()}</td>
                    <td className="px-2 py-4">{row.platformLeads.toLocaleString()}</td>
                    <td className="px-2 py-4 text-[#8f8778]">{row.sourceSystem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="min-w-0 rounded-2xl border border-[#cda24a33] bg-[#080808] p-5 sm:p-6 xl:col-span-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Step 3 · Explicit Production authority</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="spend-approval-reference" className="text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
              Approval or source-report reference
            </label>
            <input
              id="spend-approval-reference"
              value={approvalReference}
              onChange={(event) => setApprovalReference(event.target.value)}
              maxLength={160}
              placeholder="Example: Google Ads invoice 2026-08"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-[#e8dcc5] outline-none transition placeholder:text-[#5f594f] focus:border-[#cda24a99] focus:ring-2 focus:ring-[#cda24a33]"
            />
          </div>
          <div>
            <label htmlFor="spend-confirmation" className="text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
              Type {confirmationPhrase}
            </label>
            <input
              id="spend-confirmation"
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
            className="min-h-11 rounded-full border border-[#a21f3d88] bg-[#a21f3d] px-5 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#c02b4f] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7896]"
          >
            {busy === "commit" ? "Committing atomic batch…" : "Commit reviewed spend batch"}
          </button>
          <p className="max-w-3xl text-xs leading-5 text-[#8f8778]">
            {!commitReady
              ? "The migration, write-safe runtime, and GROWTH_SPEND_IMPORT_ENABLED gate must all be active. Validation remains usable while sealed."
              : "This may insert or revise the exact campaign-day rows shown above. Every changed row and the batch receive immutable audit evidence."}
          </p>
        </div>

        {receipt ? (
          <div className="mt-5 rounded-xl border border-[#4a8c6f66] bg-[#071712] p-4 text-sm leading-6 text-[#c6e5d6]" role="status">
            <strong className="text-[#83dab4]">
              {receipt.idempotentReplay ? "Exact batch replay confirmed." : "Spend batch committed atomically."}
            </strong>{" "}
            {receipt.rowCount} rows: {receipt.insertedRows} inserted, {receipt.updatedRows} revised, {receipt.unchangedRows} unchanged.
            Raw CSV retained: no. Receipt {receipt.batchId}; audit {receipt.auditId}.
          </div>
        ) : null}
      </section>
    </div>
  );
}
