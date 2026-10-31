"use client";

import { useEffect, useRef, useState } from "react";
import { manualContactReviewTarget, type ManualContactReview } from "../../lib/manualContactReview";
import { useInvalidateContactDisclosure } from "./LeadContactDisclosure";
import { contactReadiness, prepareRequestReply, preparedReplyUri } from "../../lib/contactReadiness";

export function LeadContactActions({ leadId, blocked, canReview, requestLabel = "real estate request" }: { leadId: string; blocked: boolean; canReview: boolean; requestLabel?: string }) {
  const [review, setReview] = useState<ManualContactReview>({});
  const [state, setState] = useState("Checking contact permission…");
  const [selected, setSelected] = useState<"phone" | "email" | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState("");
  const [auditing, setAuditing] = useState(false);
  const auditPending = useRef(false);
  const invalidateDisclosure = useInvalidateContactDisclosure();
  const requestScope = useRef({ active: false });
  useEffect(() => {
    const scope = { active: !blocked && canReview };
    requestScope.current = scope;
    setReview({}); setSelected(null); setConfirmed(false); setAudit("");
    if (!scope.active) return;
    readPermission(leadId).then(value => { if (scope.active) { setReview(value); setState("Review the request before contacting this person."); } }).catch(error => { if (scope.active) { setReview({}); setSelected(null); setConfirmed(false); if (error instanceof ContactAccessDenied) invalidateDisclosure?.(); setState("Contact permission could not be verified. No contact action is available."); } });
    return () => { scope.active = false; };
    // The endpoint always reads the current role/ownership and stored consent.
  }, [leadId, blocked, canReview, invalidateDisclosure]);

  async function openNativeContact() {
    if (!selected || !confirmed || busy) return;
    const expectedTarget = manualContactReviewTarget(review, selected);
    const scope = requestScope.current;
    setBusy(true);
    try {
      const fresh = await readPermission(leadId);
      if (!scope.active) return;
      setReview(fresh);
      const target = manualContactReviewTarget(fresh, selected);
      if (!target || target !== expectedTarget) { setSelected(null); setConfirmed(false); setState("Permission changed or is unavailable. No contact action was opened."); return; }
      setState(selected === "phone" ? "Opening your dialer… Record the actual result after your call." : "Opening your email app… Nothing is sent or recorded by Lead Center.");
      if (selected === "email") {
        const draft = prepareRequestReply(fresh, requestLabel);
        window.location.assign(preparedReplyUri(target, draft));
      } else window.location.assign(target);
    } catch (error) { if (!scope.active) return; setReview({}); setSelected(null); setConfirmed(false); if (error instanceof ContactAccessDenied) invalidateDisclosure?.(); setState("Contact permission could not be verified. Nothing was opened."); }
    finally { setBusy(false); }
  }
  async function recordEvaluation() {
    if (auditPending.current || !review.operator?.canRecordEvaluation) return;
    auditPending.current = true; setAuditing(true); setAudit("Saving the evaluation to the audit…");
    const scope = requestScope.current;
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/communication-permissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "email", purpose: "manual_one_to_one", humanApproved: false }) });
      if ([401,403,404].includes(response.status)) throw new ContactAccessDenied("access_unavailable");
      const value = await response.json();
      if (!response.ok || !value.ok) throw Error("audit_unavailable");
      const fresh = await readPermission(leadId);
      if (!scope.active) return;
      setReview(fresh); setSelected(null); setConfirmed(false);
      setAudit("Evaluation saved to the audit. No permission was amended, and no message or task was created.");
    } catch (error) {
      if (!scope.active) return;
      setSelected(null); setConfirmed(false); setReview({});
      if (error instanceof ContactAccessDenied) invalidateDisclosure?.();
      setAudit("Evaluation save could not be confirmed. Permission has not been amended; nothing was sent. Refresh the evidence before continuing.");
    } finally { auditPending.current = false; setAuditing(false); }
  }
  if (blocked) return <p role="status" className="rounded-lg border border-[#7f1d1d] bg-[#2a0909] p-3 text-sm text-[#ffd7d7]">Contact blocked. Test, suppressed and terminal records are for review only.</p>;
  if (!canReview) return <p className="text-sm text-[#d9ceb8]">Read-only access. A currently authorized operator can handle follow-up; the assigned owner does not need to participate in testing.</p>;
  const email = contactReadiness(review, "email"), phone = contactReadiness(review, "phone");
  const draft = prepareRequestReply(review, requestLabel);
  return <section aria-label="Contact this lead" className="min-w-0 space-y-3">
    <h3 className="font-semibold text-[#e2c06f]">Contact readiness</h3>
    <div className="grid grid-cols-2 gap-2">
      {(["email", "phone"] as const).map(channel => <button key={channel} type="button" disabled={!manualContactReviewTarget(review, channel)} onClick={() => { setSelected(channel); setConfirmed(false); }} className={`min-h-11 rounded-lg border border-[#d9af52]/45 px-3 py-3 text-sm font-bold ${channel === (email.ready ? "email" : "phone") ? "bg-[#d9af52] text-[#090909]" : "bg-transparent text-[#e2c06f]"} disabled:bg-transparent disabled:text-[#b9ae9d] focus-visible:outline-2 focus-visible:outline-cyan-300`}>{channel === "phone" ? "Review & call" : "Review & email"}</button>)}
    </div>
    {review.operator ? <p className="break-words text-sm text-[#d9ceb8]">Operating as {review.operator.name}. Reply about this request only.</p> : null}
    {review.ok ? <dl className="grid min-w-0 gap-2 text-sm sm:grid-cols-2">{([["Email",email],["Phone",phone]] as const).map(([label,value])=><div key={label} className="min-w-0"><dt className="font-semibold">{label} — {value.label}</dt><dd className="mt-1 leading-5 text-[#d9ceb8] [overflow-wrap:anywhere]">{value.reason}</dd></div>)}</dl> : null}
    <p role="status" className="text-sm leading-5 text-[#d9ceb8]">{state}</p>
    {review.ok && !email.ready && !phone.ready ? <p className="text-sm leading-5 text-[#d9ceb8]">Contact remains restricted. Internal qualification and the existing review task can continue. The evidence below explains what is missing; this screen does not grant consent.</p> : null}
    {selected ? <div className="rounded-lg border border-[#d9af52]/45 p-3">
      <p className="break-words text-sm font-semibold">{selected === "phone" ? review.manualContact?.phone : review.manualContact?.email}</p>
      {selected === "email" ? <label className="mt-3 block text-sm">Prepared reply — unsent<textarea readOnly value={draft.body} rows={6} className="mt-2 w-full min-w-0 rounded-lg border border-[#d9af52]/40 bg-[#080a0b] p-3 text-sm leading-6 [overflow-wrap:anywhere]"/></label> : null}
      <label className="my-3 flex min-h-11 items-start gap-3 text-sm leading-5"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0"/>I reviewed the request and contact permission. Open my {selected === "phone" ? "dialer" : "email app"}; do not record completed contact.</label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!confirmed || busy} onClick={openNativeContact} className="min-h-11 rounded-lg bg-[#d9af52] px-4 py-2 text-sm font-bold text-[#090909] disabled:opacity-50">{busy ? "Checking…" : selected === "phone" ? "Open dialer" : "Open email app"}</button><button type="button" onClick={() => { setSelected(null); setConfirmed(false); }} className="min-h-11 px-4 text-sm">Cancel</button></div>
    </div> : null}
    <details className="min-w-0 border-t border-white/10 pt-2 text-sm"><summary className="min-h-11 cursor-pointer py-3 text-[#e2c06f] focus-visible:outline-2 focus-visible:outline-cyan-300">Permission evidence and audit</summary>
      <div className="space-y-2 break-words text-[#d9ceb8] [overflow-wrap:anywhere]">
        <p>Consent version: {review.consentEvidence?.version || "Not recorded"}. Recorded: {review.consentEvidence?.recordedAt || "Not recorded"}.</p>
        <p className="whitespace-pre-wrap">{review.consentEvidence?.text || "The permission reader has no recorded consent wording."}</p>
        <p>Matching request consent is read-only evidence, not a new permission record. SMS, marketing, sequences and automatic messages are not enabled.</p>
        {review.reviewMatrix?.filter(r=>r.purpose==='manual_one_to_one').map(r=><p key={r.channel}>{r.channel}: {r.decision.code} · {r.decision.decisionSource || "Source not supplied"}{r.decision.code === 'legal_hold' || r.decision.code === 'bic_hold' ? " — A contact hold is recorded; its source and reason require review. The code alone is not a legal finding." : r.decision.explanation ? ` — ${r.decision.explanation}` : ""}</p>)}
        {review.operator?.canRecordEvaluation ? <button type="button" disabled={auditing} onClick={recordEvaluation} className="min-h-11 rounded-lg border border-[#d9af52]/40 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-cyan-300">Save current email evaluation to audit</button> : null}
        <p>Saving an evaluation records what the engine currently decided. It does not grant consent or change permission.</p>
        {audit ? <p role="status" aria-live="polite">{audit}</p> : null}
      </div>
    </details>
  </section>;
}

class ContactAccessDenied extends Error {}

async function readPermission(leadId: string) {
  const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/communication-permissions`, { cache: "no-store" });
  if ([401, 403, 404].includes(response.status)) throw new ContactAccessDenied("access_unavailable");
  if (!response.ok) throw new Error("permission_unavailable");
  const data = await response.json() as ManualContactReview;
  if (!data?.ok || !data.manualContact) throw Error("permission_unavailable");
  return data;
}
