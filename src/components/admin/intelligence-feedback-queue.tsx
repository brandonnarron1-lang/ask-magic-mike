"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FeedbackQueueItem } from "@/lib/intelligence/feedback";

const categories = ["incorrect_claim", "stale_information", "unsupported_citation", "unsafe_private_content", "handoff_issue", "other"];
const control = "min-h-11 max-w-full rounded-md border border-[#c9a96e66] bg-black/30 px-3 py-2 text-sm text-[#f5efdf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a96e] disabled:opacity-50";

export function IntelligenceFeedbackQueue() {
  const [items, setItems] = useState<FeedbackQueueItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    void fetch("/api/admin/intelligence/feedback", { credentials: "same-origin", cache: "no-store", signal: abort.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.ok || !Array.isArray(data.feedback)) throw Error("unavailable");
        if (!abort.signal.aborted) { setItems(data.feedback); setError(""); }
      }).catch(() => { if (!abort.signal.aborted) { setItems([]); setError("Feedback queue unavailable. Administrator access and current configuration are required."); } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [refresh]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  return <section aria-label="Intelligence feedback queue" className="min-w-0 rounded-xl border border-white/15 bg-[#101010] p-4 text-[#f5efdf]">
    <h2 className="text-lg font-semibold">Answer feedback</h2>
    <p className="mt-2 text-sm leading-relaxed text-[#d9ceb8]">Newest 50 unexpired reports, including resolved reports. Comments are untrusted user input with best-effort redaction. Disposition and regression drafts send nothing, create no task and do not train, publish or deploy anything.</p>
    <p className="mt-2 text-sm leading-relaxed text-[#d9ceb8]">Reports stop appearing in reads after at most 30 days, or sooner when the answer expires. Stored expired feedback is removed on a later accepted feedback submission or authorized cleanup; no automatic purge is installed. Account deletion removes linked feedback and scrubs its audit link and payload hash, while minimal review facts remain.</p>
    <button type="button" className={`${control} mt-3`} onClick={() => setRefresh(value => value + 1)} disabled={loading}>Refresh queue</button>
    {loading ? <p role="status" className="mt-3 text-sm">Loading reports…</p> : null}
    {error ? <p role="alert" ref={errorRef} tabIndex={-1} className="mt-3 text-sm text-[#ffb4b4]">{error}</p> : null}
    {!loading && !error && !items.length ? <p className="mt-3 text-sm">No unexpired reports.</p> : null}
    <div className="mt-4 grid gap-4">{items.map(item => <FeedbackReview key={item.id} item={item}
      onUpdate={next => setItems(previous => previous.map(value => value.id === next.id ? next : value))} />)}</div>
  </section>;
}

function FeedbackReview({ item, onUpdate }: { item: FeedbackQueueItem; onUpdate: (value: FeedbackQueueItem) => void }) {
  const id = useId();
  const [category, setCategory] = useState(item.category || "other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const pending = useRef<{ payload: string; requestId: string } | null>(null);
  const inFlight = useRef(false);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  async function review(action: "classify" | "resolve" | "reopen" | "regression_draft") {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setNotice("");
    const payload = JSON.stringify({ feedbackId: item.id, expectedRevision: item.revision, action, category: action === "classify" ? category : null });
    try {
      if (pending.current?.payload !== payload) pending.current = { payload, requestId: crypto.randomUUID() };
      const response = await fetch("/api/admin/intelligence/feedback", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: pending.current.requestId }) });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.feedback) throw Error(response.status === 409 ? "stale" : "unavailable");
      onUpdate({ ...item, ...data.feedback, regressionDraftId: data.regressionDraftId ?? item.regressionDraftId,
        regressionDraft: data.regressionDraft ?? item.regressionDraft });
      pending.current = null;
      setNotice(action === "regression_draft" ? "Synthetic regression-case draft recorded for human review. No execution or deployment." : "Review saved. No communication or task created.");
    } catch (caught) { setError(caught instanceof Error && caught.message === "stale" ? "This revision changed or conflicts with an earlier request. Refresh the queue; your category selection is preserved." : "Review not confirmed. Retry the same action to reconcile; no send was requested."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <article className="min-w-0 rounded-lg border border-white/15 p-3">
    <h3 className="break-words text-base">{item.category?.replaceAll("_", " ")} · {item.status}</h3>
    <p className="mt-1 text-sm text-[#d9ceb8]">Saved review revision {item.revision} · answer revision {item.answerRevision}</p>
    <p className="mt-1 text-sm text-[#d9ceb8]">Current source validity: {item.sourceValid ? "eligible" : "unavailable or revoked"}. Historical report is not validation.</p>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.comment || "No comment supplied."}</p>
    <label htmlFor={`${id}-category`} className="mt-3 block text-sm">Classification</label>
    <select id={`${id}-category`} className={`${control} mt-1 w-full min-w-0`} value={category} onChange={event => setCategory(event.target.value)} disabled={busy}>
      {categories.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
    </select>
    <p className="mt-1 break-words text-sm">Selected: {category.replaceAll("_"," ")}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={control} disabled={busy || category === item.category} onClick={() => void review("classify")}>Save classification</button>
      <button type="button" className={control} disabled={busy} onClick={() => void review(item.status === "open" ? "resolve" : "reopen")}>{item.status === "open" ? "Resolve report" : "Reopen report"}</button>
      <button type="button" className={control} disabled={busy || !!item.regressionDraftId} onClick={() => void review("regression_draft")}>Create synthetic regression draft</button>
    </div>
    <p className="mt-2 text-sm text-[#d9ceb8]">{item.regressionDraftId ? "Regression draft exists; human review required." : "Regression drafting is optional and uses no comment or customer text."}</p>
    {item.regressionDraft ? <details className="mt-3 rounded-md border border-white/15 p-3">
      <summary className="min-h-11 cursor-pointer text-sm">Inspect synthetic regression draft</summary>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.regressionDraft}</p>
      <p className="mt-2 text-sm text-[#d9ceb8]">Review-required draft only. Not an executed test, approved knowledge or deployment.</p>
    </details> : null}
    {notice ? <p role="status" className="mt-2 text-sm text-[#d9ceb8]">{notice}</p> : null}
    {error ? <p role="alert" ref={errorRef} tabIndex={-1} className="mt-2 text-sm text-[#ffb4b4]">{error}</p> : null}
  </article>;
}
