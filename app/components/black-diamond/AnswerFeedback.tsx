"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FeedbackReceipt } from "@/lib/intelligence/feedback";

const categories = [
  ["incorrect_claim", "Incorrect claim"], ["stale_information", "Stale information"],
  ["unsupported_citation", "Unsupported citation"], ["unsafe_private_content", "Unsafe/private content"],
  ["handoff_issue", "Handoff issue"], ["other", "Other"],
] as const;
const control = "min-h-11 rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-[#f5efdf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a96e] disabled:opacity-50";

/** No browser persistence, session minting or writes on mount/prefetch. */
export function AnswerFeedback({ answerId, revision }: { answerId: string; revision: number }) {
  // Key the inner state to the exact answer revision, including in-flight retry identity.
  return <FeedbackForm key={`${answerId}:${revision}`} answerId={answerId} revision={revision} />;
}

function FeedbackForm({ answerId, revision }: { answerId: string; revision: number }) {
  const id = useId();
  const [feedback, setFeedback] = useState<FeedbackReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(false);
  const [category, setCategory] = useState<string>(categories[0][0]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const pending = useRef<{ payload: string; requestId: string } | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();
    void fetch(`/api/intelligence/feedback?answerId=${encodeURIComponent(answerId)}&revision=${revision}`, { cache: "no-store", credentials: "same-origin", signal: abort.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.ok || !Array.isArray(data.feedback)) throw Error("unavailable");
        if (!abort.signal.aborted) setFeedback(data.feedback);
      }).catch(() => { if (!abort.signal.aborted) setError("Feedback is unavailable. Your session or this answer may have expired."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => { mounted.current = false; abort.abort(); };
  }, [answerId, revision]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function submit(kind: FeedbackReceipt["kind"]) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError("");
    const payload = JSON.stringify({ answerId, revision, kind, category: kind === "report" ? category : null, comment: kind === "report" ? comment : "" });
    try {
      if (pending.current?.payload !== payload) pending.current = { payload, requestId: crypto.randomUUID() };
      const response = await fetch("/api/intelligence/feedback", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: pending.current.requestId }) });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.feedback) throw Error("unavailable");
      if (mounted.current) {
        setFeedback(previous => [...previous.filter(item => item.id !== data.feedback.id), data.feedback]);
        if (kind === "report") { setComment(""); setReport(false); }
      }
      pending.current = null;
    } catch { if (mounted.current) setError("Feedback was not confirmed. Your draft is preserved; retry to check the same request. No message was sent."); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  }
  const rating = feedback.find(item => item.kind !== "report");
  const recordedReport = feedback.find(item => item.kind === "report");
  return <section aria-label="Answer feedback" className="mt-3 min-w-0 rounded-lg border border-white/15 bg-black/20 p-3 text-[#f5efdf]">
    <p className="text-sm">Was this AI answer useful?</p>
    {loading ? <p role="status" className="mt-2 text-sm">Checking saved feedback…</p> : null}
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" className={control} disabled={loading || busy || !!rating} onClick={() => void submit("helpful")}>Helpful</button>
      <button type="button" className={control} disabled={loading || busy || !!rating} onClick={() => void submit("not_helpful")}>Not helpful</button>
      <button type="button" className={control} disabled={loading || busy || !!recordedReport} aria-expanded={report} onClick={() => setReport(value => !value)}>Report a problem</button>
    </div>
    {feedback.length ? <div role="status" className="mt-2 text-sm text-[#d9ceb8]">{feedback.map(item => <p key={item.id}>Recorded: {item.kind.replaceAll("_", " ")}{item.kind === "report" ? ` · ${item.status} · review revision ${item.revision}` : ""}.</p>)}</div> : null}
    {report ? <form className="mt-3 grid gap-3" onSubmit={event => { event.preventDefault(); void submit("report"); }}>
      <label htmlFor={`${id}-category`} className="text-sm">Problem category</label>
      <select id={`${id}-category`} className={`${control} w-full min-w-0`} value={category} onChange={event => setCategory(event.target.value)} disabled={busy}>
        {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label htmlFor={`${id}-comment`} className="text-sm">Optional comment (2,000 characters maximum)</label>
      <textarea id={`${id}-comment`} value={comment} onChange={event => setComment(event.target.value)} maxLength={2000} rows={3}
        className={`${control} w-full min-w-0`} disabled={busy} aria-describedby={`${id}-privacy`} />
      <p id={`${id}-privacy`} className="text-sm leading-relaxed text-[#d9ceb8]">Avoid names, addresses, contact details and secrets. Reports are linked to your account or guest session, not anonymous. We redact common contact details; redaction may miss private information. Feedback stops appearing in reads after at most 30 days, or sooner when the answer expires. Stored expired feedback is removed during a later accepted feedback submission or authorized cleanup, not by an automatic 30-day purge. Deleting your account removes account-linked feedback. Minimal staff-review audit is retained without the deleted feedback link or payload hash. Feedback does not train AI or send a message.</p>
      <button type="submit" className={`${control} justify-self-start`} disabled={busy}>{busy ? "Saving…" : "Submit report"}</button>
    </form> : null}
    {error ? <p role="alert" ref={errorRef} tabIndex={-1} className="mt-3 text-sm text-[#ffb4b4]">{error}</p> : null}
  </section>;
}
