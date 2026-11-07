import type { AdminLeadDetailResult } from "../../lib/adminLeadView";
import type { LeadCenterPrincipal } from "../../../src/lib/admin/rbac-policy";
import { buildOperatorBrief } from "../../lib/leadOperatorBrief";
import { deskDate } from "../../lib/adminTodayDesk";

export function LeadOperatorBrief({detail,principal}:{detail:AdminLeadDetailResult;principal:LeadCenterPrincipal|null}) {
  const brief=buildOperatorBrief(detail,principal);
  if(!brief)return null;
  return <section aria-label="Operator action brief" className="min-w-0 rounded-2xl border border-[#cda24a66] bg-[linear-gradient(135deg,#1a150c,#0c0b09)] p-4 text-[#f7ecd5] sm:p-6 [overflow-wrap:anywhere]">
    <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#e2c06f]">Current responsibility · One next step</p>
    <h2 className="mt-3 font-serif text-2xl leading-snug">{brief.recommendation}</h2>
    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-[#c9bfad]">Actual owner</dt><dd className="mt-1">{brief.ownership.label}</dd></div>
      <div><dt className="text-xs text-[#c9bfad]">Current action boundary</dt><dd className="mt-1">{brief.held?"Contact held — internal review only":!brief.canMaintain?"Read-only scope":"Fresh server permission and exact destination check still required"}</dd></div>
      <div><dt className="text-xs text-[#c9bfad]">Existing next task</dt><dd className="mt-1">{deskDate(brief.due)}{brief.overdue?" · Overdue":""}</dd></div>
      <div><dt className="text-xs text-[#c9bfad]">First human-response evidence</dt><dd className="mt-1">{brief.firstHumanResponseAt?`${deskDate(brief.firstHumanResponseAt)} · ${brief.responseMinutes===null?"elapsed time unknown":`${brief.responseMinutes} minutes after capture`}`:"Not recorded — elapsed response time unknown"}</dd>{brief.responseProvenance?<dd className="mt-1 text-xs text-[#c9bfad]">Recorded provenance: {brief.responseProvenance}. Not provider acknowledgment.</dd>:null}</div>
    </dl>
    <a href={`#${brief.anchor}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#d9af52] px-4 py-3 text-sm font-bold text-[#090909] outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Review next step</a>
    <p className="mt-3 text-xs leading-5 text-[#c9bfad]">Nothing here contacts a consumer, changes ownership or creates a task. Task completion, app opening and receipt delivery are not evidence of a human response.</p>
  </section>;
}
