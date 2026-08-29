"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  buildOrganicSearchExperimentBrief,
  formatOrganicSearchExperimentBrief,
  type OrganicSearchExperimentBrief,
} from "../../../lib/growth/organic-search-experiment-brief";
import type { OrganicSearchIngressPreview } from "../../../lib/growth/organic-search-ingress";

interface CommitReceipt {
  batchId: string;
  auditId: string;
  idempotentReplay: boolean;
  rowCount: number;
  insertedSignals: number;
  updatedSignals: number;
  unchangedSignals: number;
  opportunityRows: number;
  insertedOpportunities: number;
  updatedOpportunities: number;
  unchangedOpportunities: number;
  batchFingerprint: string;
  rawCsvRetained: false;
  rawQueriesRetained: false;
  providerCallPerformed: false;
}

function words(value: string) {
  return value.replaceAll("_", " ");
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function OrganicSearchIngressWorkbench({
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
  const [preview, setPreview] = useState<OrganicSearchIngressPreview | null>(null);
  const [approvalReference, setApprovalReference] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"validate" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CommitReceipt | null>(null);
  const [copiedBriefKey, setCopiedBriefKey] = useState<string | null>(null);

  function replaceCsv(value: string) {
    setCsv(value);
    setPreview(null);
    setReceipt(null);
    setError(null);
    setCopiedBriefKey(null);
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
      const response = await fetch("/api/admin/growth/search-ingress/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        preview?: OrganicSearchIngressPreview;
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
      const response = await fetch("/api/admin/growth/search-ingress/commit", {
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
        preview?: OrganicSearchIngressPreview;
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

  async function copyBrief(brief: OrganicSearchExperimentBrief) {
    setError(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(formatOrganicSearchExperimentBrief(brief));
      setCopiedBriefKey(brief.key);
    } catch {
      setCopiedBriefKey(null);
      setError("The internal experiment brief could not be copied on this device.");
    }
  }

  const canCommit = Boolean(
    commitReady && preview?.ok && preview.batchFingerprint && !preview.synthetic &&
    approvalReference.trim().length >= 4 && confirmation === confirmationPhrase && !busy,
  );
  const experimentBriefs = (preview?.ok ? preview.rows : [])
    .map(buildOrganicSearchExperimentBrief)
    .filter((brief): brief is OrganicSearchExperimentBrief => brief !== null)
    .sort((left, right) =>
      right.opportunityScore - left.opportunityScore || left.pageUrl.localeCompare(right.pageUrl),
    );
  const displayedBriefs = experimentBriefs.slice(0, 25);

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <section className="min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Step 1 · Page evidence</p>
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

        <label htmlFor="organic-search-csv" className="mt-5 block text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
          Canonical Search Console page CSV
        </label>
        <textarea
          id="organic-search-csv"
          value={csv}
          onChange={(event) => replaceCsv(event.target.value)}
          rows={14}
          spellCheck={false}
          placeholder="start_date,end_date,site_property,…"
          className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-xs leading-6 text-[#e8dcc5] outline-none transition placeholder:text-[#5f594f] focus:border-[#cda24a99] focus:ring-2 focus:ring-[#cda24a33]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void readFile(event.target.files?.[0])}
            className="sr-only"
            id="organic-search-csv-file"
            aria-label="Select canonical Search Console page CSV file"
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
          <span className="text-xs text-[#746d62]">Maximum {Math.round(maxBytes / 1024)} KiB · {maxRows.toLocaleString()} rows</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#746d62]">
          Use one page-level report with one exact property, date window, search type, data state, country, and
          device. Do not include the Queries tab. Validation neither logs nor stores the source CSV.
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
            No validation has run. The contract rejects foreign domains, query strings, raw query columns,
            mixed report identities, duplicate pages, malformed dates, irreconcilable CTR, and oversized input.
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
              <strong>{preview.ok ? "Page-performance contract passed." : "Page-performance contract failed."}</strong>{" "}
              {preview.synthetic
                ? "This is unmistakably synthetic and cannot be committed."
                : preview.ok
                  ? "Review each explainable score and recommendation before authorizing the report."
                  : `${preview.issues.length} validation issue${preview.issues.length === 1 ? "" : "s"} found.`}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["Pages", String(preview.rowCount)],
                ["Impressions", preview.totals.impressions.toLocaleString()],
                ["Clicks", preview.totals.clicks.toLocaleString()],
                ["CTR", percent(preview.totals.ctr)],
                ["Opportunities", preview.totals.opportunities.toLocaleString()],
                ["Raw queries", "0 retained"],
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
                <p><strong className="text-[#e8dcc5]">Property:</strong> {preview.siteProperties.join(" · ")}</p>
                <p><strong className="text-[#e8dcc5]">Hosts:</strong> {preview.pageHosts.join(" · ")}</p>
                <p className="break-all"><strong className="text-[#e8dcc5]">Batch fingerprint:</strong> {preview.batchFingerprint}</p>
                <p><strong className="text-[#e8dcc5]">Raw CSV / queries retained:</strong> no / no</p>
                <p className="mt-2 text-[#8f8778]">
                  Coverage caveat: Search Console exports can be representative or truncated; this batch proves only the rows supplied.
                </p>
              </div>
            ) : null}
          </>
        )}
      </section>

      {preview?.ok && preview.rows.length ? (
        <section className="min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0d0d0d,#070707)] p-5 sm:p-6 xl:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Normalized owned pages</p>
          <div className="mt-4 max-w-full overflow-x-auto">
            <table className="w-full min-w-[1160px] text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                <tr>
                  <th className="px-2 py-3">Page</th>
                  <th className="px-2 py-3">Impressions</th>
                  <th className="px-2 py-3">Clicks / CTR</th>
                  <th className="px-2 py-3">Position</th>
                  <th className="px-2 py-3">Signal / confidence</th>
                  <th className="px-2 py-3">Explainable opportunity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.07]">
                {preview.rows.slice(0, maxRows).map((row) => (
                  <tr key={row.rowFingerprint} className="align-top">
                    <td className="max-w-[320px] px-2 py-4">
                      <span className="block break-all text-[#f4ead4]">{row.pageUrl}</span>
                      <span className="mt-1 block text-[10px] text-[#746d62]">{row.searchType} · {row.device} · {row.country} · {row.dataState}</span>
                    </td>
                    <td className="px-2 py-4">{row.impressions.toLocaleString()}</td>
                    <td className="px-2 py-4">{row.clicks.toLocaleString()} / {percent(row.ctr)}</td>
                    <td className="px-2 py-4">{row.position.toFixed(1)}</td>
                    <td className="px-2 py-4">
                      <span className="text-[#f0cf79]">{row.signalScore}</span>
                      <span className="text-[#746d62]"> / {(row.confidence * 100).toFixed(0)}%</span>
                    </td>
                    <td className="max-w-[410px] px-2 py-4">
                      {row.opportunity ? (
                        <>
                          <span className="block text-[#f4ead4]">{row.opportunity.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-[#9f9585]">
                            Score {row.opportunity.score}: demand {row.opportunity.demandPoints} + accessibility {row.opportunity.accessibilityPoints} + click gap {row.opportunity.clickGapPoints}.
                          </span>
                        </>
                      ) : <span className="text-[#746d62]">Observe only; no policy gap fired.</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {displayedBriefs.length ? (
        <section className="min-w-0 rounded-2xl border border-[#4baab844] bg-[linear-gradient(145deg,#071317,#070707)] p-5 sm:p-6 xl:col-span-2">
          <p aria-live="polite" className="sr-only">
            {copiedBriefKey ? "Internal organic search experiment brief copied to the clipboard." : ""}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-4xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7ee7f1]">Deterministic decision packets</p>
              <h2 className="mt-2 font-serif text-3xl text-[#f4ead4]">Turn evidence into one bounded page experiment</h2>
              <p className="mt-3 text-sm leading-6 text-[#b8ad9c]">
                These internal briefs connect each explainable page signal to a people-first review, owner-supplied facts,
                one primary metric, guardrails, and stop conditions. They generate no public copy, make no provider call,
                write no data, and grant no publication authority.
              </p>
            </div>
            <p className="text-xs text-[#8f8778]">
              Showing {displayedBriefs.length} of {experimentBriefs.length} scored page{experimentBriefs.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {displayedBriefs.map((brief, index) => (
              <details key={brief.key} className="group rounded-xl border border-white/10 bg-black/35 p-4">
                <summary className="cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7ee7f1]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8bbfc6]">
                        {String(index + 1).padStart(2, "0")} · Internal review only · {words(brief.opportunityType)}
                      </p>
                      <p className="mt-2 break-words text-sm font-semibold text-[#f4ead4]">{brief.pageUrl}</p>
                      <p className="mt-2 text-xs leading-5 text-[#a89c8b]">{brief.objective}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-[#cda24a55] bg-[#171108] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#f0cf79]">
                        Score {brief.opportunityScore}
                      </span>
                      <span aria-hidden="true" className="text-xl text-[#7ee7f1] transition group-open:rotate-90">›</span>
                    </div>
                  </div>
                </summary>

                <div className="mt-5 border-t border-white/[.08] pt-5">
                  <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                    {[
                      ["Window", brief.evidence.window],
                      ["Impressions", brief.evidence.impressions.toLocaleString()],
                      ["Clicks", brief.evidence.clicks.toLocaleString()],
                      ["CTR", percent(brief.evidence.ctr)],
                      ["Avg. position", brief.evidence.averagePosition.toFixed(1)],
                      ["Confidence", `${brief.confidencePercent}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-white/[.07] bg-[#050505] p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#8f8778]">{label}</dt>
                        <dd className="mt-2 text-sm text-[#e8dcc5]">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-[#cda24a33] bg-[#171108] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d1aa53]">Reader task to verify</p>
                      <p className="mt-2 text-xs leading-6 text-[#e2d5bd]">{brief.readerTask}</p>
                    </div>
                    <div className="rounded-xl border border-[#4baab833] bg-[#06171b] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7ee7f1]">Single-change scope</p>
                      <p className="mt-2 text-xs leading-6 text-[#c7e7eb]">{brief.singleChangeScope}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/[.08] bg-[#080808] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Testable hypothesis</p>
                    <p className="mt-2 text-sm leading-6 text-[#d8cdb9]">{brief.hypothesis}</p>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-white/[.08] bg-black/30 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Required owner inputs</p>
                      <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-5 text-[#b8ad9c]">
                        {brief.requiredInputs.map((item) => <li key={item}>{item}</li>)}
                      </ol>
                    </div>
                    <div className="rounded-xl border border-white/[.08] bg-black/30 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">Review steps</p>
                      <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-5 text-[#b8ad9c]">
                        {brief.reviewSteps.map((item) => <li key={item}>{item}</li>)}
                      </ol>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#4a8c6f44] bg-[#071712] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#83dab4]">Primary decision metric</p>
                        <p className="mt-2 text-base font-semibold text-[#d9f4e8]">
                          {brief.primaryMetric.label} · baseline {brief.primaryMetric.baseline}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#4a8c6f55] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#83dab4]">
                        {words(brief.primaryMetric.key)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-[#b9d9c9]">{brief.primaryMetric.decisionRule}</p>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-5 text-[#9fbeaf]">
                      {brief.measurementPlan.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-[#cda24a33] bg-[#171108] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d1aa53]">Guardrails</p>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-[#d8c9aa]">
                        {brief.guardrails.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-[#a21f3d44] bg-[#19080d] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff9ab1]">Stop conditions</p>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-[#ffdbe4]">
                        {brief.stopConditions.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#a21f3d44] bg-[#19080d] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff9ab1]">Authority boundary</p>
                    <p className="mt-2 text-xs leading-6 text-[#ffdbe4]">{brief.authority}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => void copyBrief(brief)}
                      className="min-h-11 rounded-full border border-[#4baab866] bg-[#06171b] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#7ee7f1] transition hover:border-[#7ee7f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ee7f1]"
                    >
                      {copiedBriefKey === brief.key ? "Internal brief copied" : "Copy internal brief"}
                    </button>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs leading-5 text-[#8f8778]">
                      {brief.references.map((reference) => (
                        <a
                          key={reference.href}
                          href={reference.href}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-white/20 underline-offset-4 transition hover:text-[#c7e7eb]"
                        >
                          {reference.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className="min-w-0 rounded-2xl border border-[#cda24a33] bg-[#080808] p-5 sm:p-6 xl:col-span-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1aa53]">Step 3 · Explicit Production authority</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="organic-search-approval-reference" className="text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
              Search Console report reference
            </label>
            <input
              id="organic-search-approval-reference"
              value={approvalReference}
              onChange={(event) => setApprovalReference(event.target.value)}
              maxLength={160}
              placeholder="Example: GSC Pages · 2026-08-01 to 2026-08-20"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-[#e8dcc5] outline-none transition placeholder:text-[#5f594f] focus:border-[#cda24a99] focus:ring-2 focus:ring-[#cda24a33]"
            />
          </div>
          <div>
            <label htmlFor="organic-search-confirmation" className="text-xs font-bold uppercase tracking-[0.13em] text-[#b8ad9c]">
              Type {confirmationPhrase}
            </label>
            <input
              id="organic-search-confirmation"
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
            {busy === "commit" ? "Committing atomic report…" : "Commit reviewed page report"}
          </button>
          <p className="max-w-3xl text-xs leading-5 text-[#8f8778]">
            {!commitReady
              ? "The migration, write-safe runtime, exact Production Neon identity, and GROWTH_SEARCH_IMPORT_ENABLED gate must all be active. Validation remains usable while sealed."
              : "This may insert or revise only the signals and advisory opportunities shown above. Existing operator status and action class are preserved."}
          </p>
        </div>

        {receipt ? (
          <div className="mt-5 rounded-xl border border-[#4a8c6f66] bg-[#071712] p-4 text-sm leading-6 text-[#c6e5d6]" role="status">
            <strong className="text-[#83dab4]">
              {receipt.idempotentReplay ? "Exact report replay confirmed." : "Organic-search report committed atomically."}
            </strong>{" "}
            {receipt.rowCount} signals: {receipt.insertedSignals} inserted, {receipt.updatedSignals} revised, {receipt.unchangedSignals} unchanged. {receipt.opportunityRows} advisory opportunities: {receipt.insertedOpportunities} inserted, {receipt.updatedOpportunities} revised, {receipt.unchangedOpportunities} unchanged. Raw CSV and queries retained: no. Provider calls: zero. Receipt {receipt.batchId}; audit {receipt.auditId}.
          </div>
        ) : null}
      </section>
    </div>
  );
}
