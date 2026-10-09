"use client";

import { useEffect, useState } from "react";
import { manualContactReviewTarget, type ManualContactReview } from "../../lib/manualContactReview";

export function LeadContactActions({ leadId, blocked, canReview }: { leadId: string; blocked: boolean; canReview: boolean }) {
  const [review, setReview] = useState<ManualContactReview>({});
  const [state, setState] = useState("Checking contact permission…");
  const [selected, setSelected] = useState<"phone" | "email" | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (blocked || !canReview) return;
    let active = true;
    readPermission(leadId).then(value => { if (active) { setReview(value); setState("Review the request before contacting this person."); } }).catch(() => { if (active) setState("Contact permission could not be verified. No contact action is available."); });
    return () => { active = false; };
    // The endpoint always reads the current role/ownership and stored consent.
  }, [leadId, blocked, canReview]);

  async function openNativeContact() {
    if (!selected || !confirmed || busy) return;
    setBusy(true);
    try {
      const fresh = await readPermission(leadId);
      setReview(fresh);
      const target = manualContactReviewTarget(fresh, selected);
      if (!target) { setSelected(null); setConfirmed(false); setState("Permission changed or is unavailable. No contact action was opened."); return; }
      setState(selected === "phone" ? "Dialer opened. Record the actual result after your call." : "Email app opened. Nothing is sent or recorded by Lead Center.");
      window.location.assign(target);
    } catch { setState("Contact permission could not be verified. Nothing was opened."); }
    finally { setBusy(false); }
  }
  if (blocked) return <p role="status" className="rounded-lg border border-[#7f1d1d] bg-[#2a0909] p-3 text-sm text-[#ffd7d7]">Contact blocked. Test, suppressed and terminal records are for review only.</p>;
  if (!canReview) return <p className="text-sm text-[#d9ceb8]">Read-only access. An authorized assigned agent must handle follow-up.</p>;
  return <section aria-label="Contact this lead" className="min-w-0 space-y-3">
    <div className="grid grid-cols-2 gap-2">
      {(["phone", "email"] as const).map(channel => <button key={channel} type="button" disabled={!manualContactReviewTarget(review, channel)} onClick={() => { setSelected(channel); setConfirmed(false); }} className="min-h-11 rounded-lg border border-[#d9af52]/45 bg-[#d9af52] px-3 py-3 text-sm font-bold text-[#090909] disabled:bg-transparent disabled:text-[#b9ae9d] focus-visible:outline-2 focus-visible:outline-cyan-300">{channel === "phone" ? "Review & call" : "Review & email"}</button>)}
    </div>
    <p role="status" className="text-sm leading-5 text-[#d9ceb8]">{state}</p>
    {review.ok && !manualContactReviewTarget(review, "phone") && !manualContactReviewTarget(review, "email") ? <p className="text-sm leading-5 text-[#d9ceb8]">No approved contact option. Review <a href="#message-review" className="text-[#e2c06f] underline">communication permissions</a>; this screen cannot grant consent.</p> : null}
    {selected ? <div className="rounded-lg border border-[#d9af52]/45 p-3">
      <p className="break-words text-sm font-semibold">{selected === "phone" ? review.manualContact?.phone : review.manualContact?.email}</p>
      <label className="my-3 flex items-start gap-3 text-sm leading-5"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0"/>I reviewed the request and contact permission. Open my {selected === "phone" ? "dialer" : "email app"}; do not record completed contact.</label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!confirmed || busy} onClick={openNativeContact} className="min-h-11 rounded-lg bg-[#d9af52] px-4 py-2 text-sm font-bold text-[#090909] disabled:opacity-50">{busy ? "Checking…" : selected === "phone" ? "Open dialer" : "Open email app"}</button><button type="button" onClick={() => { setSelected(null); setConfirmed(false); }} className="min-h-11 px-4 text-sm">Cancel</button></div>
    </div> : null}
  </section>;
}

async function readPermission(leadId: string) {
  const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/communication-permissions`, { cache: "no-store" });
  if (!response.ok) throw new Error("permission_unavailable");
  return await response.json() as ManualContactReview;
}
