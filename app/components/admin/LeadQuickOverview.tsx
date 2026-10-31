import type { LeadPresentation } from "../../lib/leadPresentation";
import { leadReceivedLabel } from "../../lib/leadReadability";
import { LeadContactActions } from "./LeadContactActions";
import { LeadSectionNavigation } from "./LeadSectionNavigation";
import { LeadContactDisclosure } from "./LeadContactDisclosure";
import { normalizeBuyerInterest, type BuyerInterestV1 } from "../../lib/buyerInterest";

export function LeadQuickOverview({ view, leadId, receivedAt, request, blocked, canReview, status }: {
  view: LeadPresentation; leadId: string; receivedAt: string | null; request: string;
  blocked: boolean; canReview: boolean; status: string;
}) {
  const identity = view.disclosure === "assigned" || view.disclosure === "supervisor" ? view.identity : undefined;
  let interest: BuyerInterestV1 | null = null;
  if (identity?.buyerInterest) { try { interest = normalizeBuyerInterest(identity.buyerInterest); } catch { /* Unsupported DTOs are not rendered as verified interests. */ } }
  const contactValue = (value: unknown) => typeof value === "string" && value.trim() ? value : "Not provided";
  return <LeadContactDisclosure key={leadId} leadId={leadId}><section aria-label="Lead overview" className="min-w-0 space-y-4 rounded-xl border border-[#d9af52]/40 bg-[#101214] p-4 text-[#f5ead1]">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{request}</h2><span className="text-sm text-[#e2c06f]">{view.isTest ? "TEST — DO NOT CONTACT" : status.replaceAll("_", " ")}</span></div>
    {identity ? <dl aria-label="Saved contact details" className="grid min-w-0 gap-3 sm:grid-cols-2">
      {[["Phone", identity.phone], ["Email", identity.email]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-[#b9ae9d]">{label}</dt><dd className="mt-1 select-text whitespace-pre-wrap break-words text-base [overflow-wrap:anywhere]">{contactValue(value)}</dd></div>)}
    </dl> : null}
    {interest ? <section aria-label="Submitted buying interest" className="space-y-2 rounded-lg border border-[#d9af52]/25 p-3 text-sm leading-6">
      <h3 className="font-semibold text-[#e2c06f]">{interest.kind === "specific" ? "Property interest" : "Home search"}</h3>
      {interest.kind === "search" ? <dl><dt className="text-xs text-[#b9ae9d]">Desired area</dt><dd className="select-text break-words [overflow-wrap:anywhere]">{interest.desired_area}</dd>{interest.budget_range ? <><dt className="mt-2 text-xs text-[#b9ae9d]">Submitted budget range</dt><dd className="select-text break-words">{interest.budget_range}</dd></> : null}</dl> : interest.properties.map((property, index) => <dl key={index} className="grid min-w-0 gap-2 sm:grid-cols-2">
        {[["Property address", property.address_text], ["Unit", property.unit], ["Listing URL (reference only)", property.listing_url], ["Listing reference", property.reference]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-[#b9ae9d]">{label}</dt><dd className="select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value}</dd></div>)}
      </dl>)}
      <p className="text-xs text-[#b9ae9d]">Submitted interest, not the buyer’s home address. Availability and property facts are not verified.</p>
    </section> : identity?.address ? <div><p className="text-xs text-[#b9ae9d]">{view.subtype === "seller" || view.subtype === "cash_seller" ? "Seller property" : "Recorded address"}</p><p className="select-text whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{identity.address}</p></div> : null}
    <dl className="grid gap-3 sm:grid-cols-2">
      {[["Area", view.location], ["Timeframe", view.timeline], ["Source", view.source], ["Assignment", view.custodian]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-[#b9ae9d]">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}
    </dl>
    {!view.isTest && identity?.question ? <div className="text-sm leading-6"><p className="whitespace-pre-line break-words">{identity.question.slice(0, 280)}{identity.question.length > 280 ? "…" : ""}</p>{identity.question.length > 280 ? <details className="mt-2"><summary className="cursor-pointer py-2 text-[#e2c06f]">Read full request</summary><p className="whitespace-pre-line break-words">{identity.question}</p></details> : null}</div> : null}
    <LeadContactActions key={leadId} leadId={leadId} blocked={blocked} canReview={canReview} requestLabel={request}/>
    <p className="text-xs leading-5 text-[#b9ae9d]">Received {leadReceivedLabel(receivedAt)}. {view.isTest ? "Read-only walkthrough; no contact or task changes." : "After contact, record what actually happened and set the next task."}</p>
    <LeadSectionNavigation leadId={leadId} isTest={view.isTest}/>
  </section></LeadContactDisclosure>;
}
