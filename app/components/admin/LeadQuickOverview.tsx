import type { LeadPresentation } from "../../lib/leadPresentation";
import { leadReceivedLabel } from "../../lib/leadReadability";
import { LeadContactActions } from "./LeadContactActions";
import { LeadSectionNavigation } from "./LeadSectionNavigation";

export function LeadQuickOverview({ view, leadId, receivedAt, request, blocked, canReview, status }: {
  view: LeadPresentation; leadId: string; receivedAt: string | null; request: string;
  blocked: boolean; canReview: boolean; status: string;
}) {
  return <section aria-label="Lead overview" className="min-w-0 space-y-4 rounded-xl border border-[#d9af52]/40 bg-[#101214] p-4 text-[#f5ead1]">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{request}</h2><span className="text-sm text-[#e2c06f]">{view.isTest ? "TEST — DO NOT CONTACT" : status.replaceAll("_", " ")}</span></div>
    <dl className="grid gap-3 sm:grid-cols-2">
      {[["Area", view.location], ["Timeframe", view.timeline], ["Source", view.source], ["Assignment", view.custodian]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-[#b9ae9d]">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}
    </dl>
    {!view.isTest && view.identity?.question ? <div className="text-sm leading-6"><p className="whitespace-pre-line break-words">{view.identity.question.slice(0, 280)}{view.identity.question.length > 280 ? "…" : ""}</p>{view.identity.question.length > 280 ? <details className="mt-2"><summary className="cursor-pointer py-2 text-[#e2c06f]">Read full request</summary><p className="whitespace-pre-line break-words">{view.identity.question}</p></details> : null}</div> : null}
    <LeadContactActions key={leadId} leadId={leadId} blocked={blocked} canReview={canReview}/>
    <p className="text-xs leading-5 text-[#b9ae9d]">Received {leadReceivedLabel(receivedAt)}. {view.isTest ? "Read-only walkthrough; no contact or task changes." : "After contact, record what actually happened and set the next task."}</p>
    <LeadSectionNavigation leadId={leadId} isTest={view.isTest}/>
  </section>;
}
