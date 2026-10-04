"use client";
import { useState } from "react";
import { LEAD_MODULES, LEAD_PRESENTATION_VERSION, type DisclosureTier, type LeadSubtype, type OfferState } from "../../lib/leadPresentation";
import { leadCardFixture } from "../../lib/leadPresentationFixtures";
import { renderLeadOfferEmail, renderLeadOfferSms } from "../../lib/leadOfferRenderers";
import { ReferenceLeadCard } from "./ReferenceLeadCard";

export function CrossChannelReviewStudio() {
  const [subtype, setSubtype] = useState<LeadSubtype>("buyer");
  const [tier, setTier] = useState<DisclosureTier>("pre_claim");
  const [state, setState] = useState<OfferState>("offered");
  const [priority, setPriority] = useState("TEST");
  const [channel, setChannel] = useState("all");
  const view = leadCardFixture({ subtype, tier, state, score: priority === "HOT" ? 84 : priority === "ACTIVE" ? 72 : 42, isTest: priority === "TEST" });
  const email = renderLeadOfferEmail(view);
  const sms = renderLeadOfferSms(view, "K7M2Q8HJ");
  const selectors = [
    { label: "Module / subtype", value: subtype, options: Object.entries(LEAD_MODULES).map(([key, value]) => [key, `${value.label} · ${value.title}`]), set: (v: string) => setSubtype(v as LeadSubtype) },
    { label: "Disclosure tier", value: tier, options: ["pre_claim", "assigned", "supervisor", "audit"].map(v => [v,v]), set: (v: string) => setTier(v as DisclosureTier) },
    { label: "Offer state", value: state, options: ["offered", "accepted", "claimed_elsewhere", "expired", "paused", "blocked", "failed_delivery", "missing_data"].map(v => [v,v]), set: (v: string) => setState(v as OfferState) },
    { label: "Priority", value: priority, options: ["TEST", "HOT", "ACTIVE", "NEW"].map(v => [v,v]), set: setPriority },
    { label: "Channel", value: channel, options: ["all", "web", "email", "sms", "mms"].map(v => [v,v]), set: setChannel },
  ];
  return <section className="my-8" aria-label="Reference-driven cross-channel studio">
    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D9AF52]">Reference-driven allocation · {LEAD_PRESENTATION_VERSION}</p><h2 className="mt-2 font-serif text-3xl text-[#F5EAD1]">One lead. One offer. Every channel.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#D9CEB8]">Synthetic, no-send review. Both references inform these operational cards. No consumer portraits, property values, availability claims or live assignment are imported.</p></div>
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{selectors.map(selector => <label key={selector.label} className="min-w-0 text-xs font-bold uppercase tracking-wide text-[#D9AF52]">{selector.label}<select aria-label={selector.label} value={selector.value} onChange={event => selector.set(event.target.value)} className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[#D9AF52]/40 bg-[#121619] px-3 text-sm normal-case tracking-normal text-[#F5EAD1] focus-visible:outline-2 focus-visible:outline-[#24BED8]">{selector.options.map(([v,label]) => <option key={v} value={v}>{label.replaceAll("_", " ")}</option>)}</select></label>)}</div>
    <p className="mb-5 rounded-xl border border-[#D9AF52]/30 bg-[#121619] p-4 text-sm leading-6 text-[#F5EAD1]">All fixtures remain suppressed and synthetic, even when a non-TEST priority is selected. No send button, recipient picker or test-delivery bypass exists. Browser previews are not mail-client delivery tests.</p>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {channel === "all" || channel === "web" ? <ReferenceLeadCard view={view} preview /> : null}
      {channel === "all" || channel === "email" ? <section className="min-w-0 rounded-2xl border border-[#D9AF52]/35 bg-[#121619] p-4"><h3 className="text-lg font-bold text-[#D9AF52]">Email · compiled HTML + text</h3><p className="my-3 break-words text-sm text-[#F5EAD1]">{email.subject}</p><iframe title="Reference allocation email" sandbox="" srcDoc={email.html} className="h-[820px] w-full rounded-lg border border-[#D9AF52]/30" /><details className="mt-4"><summary className="min-h-11 cursor-pointer text-sm text-[#F5EAD1]">Plain-text alternative</summary><pre className="whitespace-pre-wrap break-words text-sm leading-6 text-[#D9CEB8]">{email.text}</pre></details></section> : null}
      {channel === "all" || channel === "sms" ? <section className="min-w-0 rounded-2xl border border-[#D9AF52]/35 bg-[#121619] p-5"><h3 className="text-lg font-bold text-[#D9AF52]">SMS · exact handset text</h3><pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-[#24BED8]/35 bg-[#080A0B] p-4 text-sm leading-6 text-[#F5EAD1]">{sms.text}</pre><p className="mt-4 text-sm text-[#D9CEB8]">{sms.encoding} · {sms.units} encoding units · {sms.segments} segments. Pricing and registration unverified; no carrier send.</p></section> : null}
      {channel === "all" || channel === "mms" ? <section className="min-w-0 rounded-2xl border border-[#D9AF52]/35 bg-[#121619] p-5"><h3 className="text-lg font-bold text-[#D9AF52]">MMS · category-only artwork</h3>{/* Static, local, non-personal artwork; never the consumer's property. */}<img src={`/images/ask-magic-mike/notifications/allocation-${LEAD_MODULES[subtype].media}-v1.jpg`} width={720} height={900} alt={`${LEAD_MODULES[subtype].label} illustrative category artwork. Commands and deadline are in the message text.`} className="mt-4 h-auto w-full rounded-xl" /><h4 className="mt-4 text-sm font-bold text-[#D9AF52]">Independently usable companion text</h4><pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#F5EAD1]">{sms.text}</pre><p className="mt-4 text-sm text-[#D9CEB8]">Artwork contains no lead facts, code or capability. SMS and MMS are alternatives, not a double-send.</p></section> : null}
    </div>
  </section>;
}
