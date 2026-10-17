"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { BuyerIntentSection } from "../black-diamond/BuyerIntentSection";
import { TextField } from "../black-diamond/FormField";
import { guestInterest, MAX_GUEST_INTERESTS, type GuestInterest } from "../../lib/consumerInterests";
import { experienceContract } from "../../lib/experienceContract";

export function GuestWorkspace() {
  const [items, setItems] = useState<GuestInterest[]>([]);
  const [kind, setKind] = useState<"property" | "search">("property");
  const [error, setError] = useState("");
  const [request, setRequest] = useState<GuestInterest | null>(null);
  const requestHeading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { if (request) requestHeading.current?.focus(); }, [request]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    if (items.length >= MAX_GUEST_INTERESTS) { setError("Keep up to eight interests. Remove one before adding another."); return; }
    try {
      const item = guestInterest({ kind, value: String(data.get("interest") ?? ""), budget: String(data.get("budget") ?? "") }, crypto.randomUUID());
      if (items.some(existing => JSON.stringify(existing.declared) === JSON.stringify(item.declared))) { setError("That interest is already in this comparison."); return; }
      setItems(current => [...current, item]); form.reset();
    } catch { setError("Add an address, a complete http/https listing link without sign-in details, or a search area. Keep the reference within 500 characters and the budget within 160."); }
  }

  return <div className="space-y-8">
    <section aria-labelledby="saved-interests-heading" className="rounded-xl border border-[#cda24a55] bg-[#101214] p-5 sm:p-7">
      <h2 id="saved-interests-heading" className="font-serif text-3xl">Save what matters to you.</h2>
      <p className="mt-3 leading-7 text-[#d9ceb8]">Guest comparison only. References stay in this page’s memory; reloading or leaving discards them. Nothing here is submitted or sent. Do not enter contact details or private sign-in links.</p>
      <form onSubmit={save} className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Interest type
          <select className="amm-form-field mt-2 min-h-11 text-base" value={kind} onChange={event => setKind(event.target.value as "property" | "search")}>
            <option value="property">Property reference</option><option value="search">Search preference</option>
          </select>
        </label>
        <TextField name="interest" label={kind === "property" ? "Address or listing link" : "Search area"} autoComplete="off" maxLength={500} required />
        {kind === "search" ? <TextField name="budget" label="Budget range (optional)" autoComplete="off" maxLength={160} /> : null}
        <button type="submit" className="amm-primary-button min-h-11 px-5 py-3 self-end">Save for comparison</button>
        {error ? <p role="alert" className="text-[#ffcabd] sm:col-span-2">{error}</p> : null}
      </form>
      <p className="mt-5 text-sm leading-6 text-[#d9ceb8]" role="status">{items.length ? `${items.length} of eight interests saved in memory.` : "No saved interests yet. No sample listings have been added."}</p>
      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2" aria-label="Compare saved interests">
        {items.map(item => <article key={item.id} className="min-w-0 rounded-lg border border-white/20 p-4 [overflow-wrap:anywhere]">
          <h3 className="select-text text-lg font-semibold">{item.label}</h3>
          <p className="mt-2 text-sm text-[#e2c06f]">User-reported · unverified</p>
          <dl className="mt-3 space-y-2 text-sm leading-6">
            <div><dt className="font-semibold">Interest</dt><dd>{item.declared.kind === "search" ? "Search preference" : "Property reference"}</dd></div>
            <div><dt className="font-semibold">Budget</dt><dd>{item.declared.kind === "search" ? item.declared.budget_range || "Not provided" : "Not provided"}</dd></div>
            <div><dt className="font-semibold">Availability, price and ownership</dt><dd>Not established</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={Boolean(request)} onClick={() => setRequest(item)} className="amm-cyan-button min-h-11 px-4 py-3 disabled:opacity-60">Prepare a help request</button>
            <button type="button" onClick={() => setItems(current => current.filter(existing => existing.id !== item.id))} aria-label={`Remove ${item.label}`} className="amm-secondary-button min-h-11 px-4 py-3">Remove</button>
          </div>
        </article>)}
      </div>
      {request ? <p className="mt-4 text-sm leading-6">One request form is open below. Its selected reference stays fixed while you review or resolve it; removing a comparison does not cancel or change that request.</p> : null}
    </section>
    <section aria-labelledby="workspace-guidance-heading" className="rounded-xl border border-white/20 p-5 sm:p-7">
      <h2 id="workspace-guidance-heading" className="font-serif text-3xl">Questions worth checking.</h2>
      <p className="mt-3 leading-7">Ask about availability, property condition, ongoing costs, and what needs professional verification. A saved reference is not a verified listing, valuation, financing decision or appointment. Not a survey.</p>
      <p className="mt-3 text-sm leading-6 text-[#d9ceb8]">Source: {experienceContract.brokerage}’s existing <a className="underline" href={experienceContract.offers.buyer.destination}>buying-plan guidance</a> and <a className="underline" href={experienceContract.offers.compare.destination}>seller-options review</a>. Service guidance only; no property data was retrieved.</p>
    </section>
    {request ? <section aria-labelledby="workspace-request-heading">
      <h2 id="workspace-request-heading" ref={requestHeading} tabIndex={-1} className="mb-4 scroll-mt-24 font-serif text-3xl">Review before you ask for help.</h2>
      <p className="mb-4 leading-7">Only the normal form below can submit a request. Contact fields are empty and permission is not preselected. A saved receipt confirms storage—not delivery, contact or a booked appointment.</p>
      <BuyerIntentSection initialInterest={request.declared} attributionOverrides={{ placement: "consumer_workspace" }} />
    </section> : null}
  </div>;
}
