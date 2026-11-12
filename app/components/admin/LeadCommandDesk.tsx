import Link from "next/link";
import type { AdminTodayQueueResult } from "../../lib/adminTodayQueue";
import { buildTodayDesk, deskRequests, deskDate, elapsedSince, DESK_PAGE_SIZE, type DeskRequest, type DeskFilter } from "../../lib/adminTodayDesk";
import { hasLeadCenterPermission, type LeadCenterPrincipal } from "../../../src/lib/admin/rbac-policy";
import { completeTodayTask, reviewTodayAction } from "../../admin/today/actions";
import { LeadSearchPanel } from "../../admin/leads/lead-search-panel";
import { ConversionMutationForm } from "./ConversionMutationForm";
import { HumanReviewObjective } from "./HumanReviewObjective";

const labels = { attention:"Needs attention", overdue:"Overdue tasks", delivery:"Delivery exceptions", waiting:"Waiting on human", held:"Held / read-only" };
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
function TaskControls({ request, principal, complete }: { request:DeskRequest; principal:LeadCenterPrincipal|null; complete:boolean }) {
  const item=request.primary;
  if (!complete || request.held || item.readOnly || !principal || !hasLeadCenterPermission(principal.role,item.requiredPermission)) return null;
  const hidden=<><input type="hidden" name="action_id" value={item.id}/><input type="hidden" name="lead_id" value={item.leadId}/><input type="hidden" name="record_version" value={item.recordVersion}/><input type="hidden" name="review_version" value={item.reviewVersion}/></>;
  return <div className="mt-4 border-t border-white/10 pt-4">
    {item.actionKind==="complete_task" && !item.blockers.length ? <ConversionMutationForm key={item.id} action={completeTodayTask} conflictRecovery={item.taskId ? {kind:"today_task",taskId:item.taskId} : undefined} successReturnTo="/admin/today?today_action=completed" submitLabel="Complete task" successMessage="Internal task completed. No message, human-response milestone or appointment was recorded." className="mb-3">{hidden}</ConversionMutationForm> : null}
    <details><summary className={`min-h-11 cursor-pointer py-3 text-sm text-[#e2c06f] ${focus}`}>More internal actions</summary>
      <div className="grid gap-3 sm:grid-cols-2">
        <ConversionMutationForm key={`snooze:${item.id}`} action={reviewTodayAction} successReturnTo="/admin/today?today_action=snoozed" submitLabel="Snooze 24 hours" successMessage="This existing action is snoozed for one day. No consumer action occurred." className="rounded-lg border border-white/10 p-3">{hidden}<input type="hidden" name="review_status" value="snoozed"/></ConversionMutationForm>
        <ConversionMutationForm key={`dismiss:${item.id}`} action={reviewTodayAction} successReturnTo="/admin/today?today_action=dismissed" submitLabel="Dismiss action" successMessage="Action dismissed with its audit reason. No request or consent record was deleted." className="rounded-lg border border-white/10 p-3">
          {hidden}<input type="hidden" name="review_status" value="dismissed"/>
          <label className="mb-3 block text-sm">Dismissal reason<input name="reason" required minLength={3} maxLength={160} className={`mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-black p-3 text-sm ${focus}`}/></label>
        </ConversionMutationForm>
      </div>
    </details>
  </div>;
}
function RequestCard({ request, index, queue, principal, complete }: { request:DeskRequest; index:number; queue:AdminTodayQueueResult; principal:LeadCenterPrincipal|null; complete:boolean }) {
  const item=request.primary, facts=item.facts;
  return <article className={`min-w-0 rounded-2xl border bg-[#0d0d0c] p-4 shadow-[0_12px_48px_#0004] sm:p-6 ${request.held?"border-white/15":"border-[#cda24a40]"}`}>
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-semibold text-[#e2c06f]"><span aria-hidden="true">{String(index+1).padStart(2,"0")} · </span>{item.requestContext || "Request type not provided"}</p>
      <Link href={`/admin/leads/${item.leadId}`} className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[#d9af52] px-4 py-3 text-sm font-bold text-[#0a0907] hover:bg-[#eed190] ${focus}`}>Open request</Link>
    </div>
    <div className="flex min-w-0 items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {request.held ? <span className="rounded-full bg-[#35141b] px-2.5 py-1 text-[#ffbdc8]">{item.readOnly?"Read-only access":"Internal review only"}</span> : request.overdue ? <span className="rounded-full bg-[#35141b] px-2.5 py-1 text-[#ffbdc8]">Existing task overdue</span> : <span className="rounded-full bg-[#cda24a18] px-2.5 py-1 text-[#f0cf7a]">Human review</span>}
          {request.delivery ? <span className="rounded-full border border-[#b7374d66] px-2.5 py-1 text-[#ffbdc8]">Delivery exception</span> : null}
        </div>
        <h3 className="mt-3 break-words font-serif text-2xl leading-snug text-[#f7ecd5]">{item.leadLabel}</h3>
        <p className="mt-2 text-sm text-[#c9bfad]">{elapsedSince(item.receivedAt,queue.generatedAt)} · {item.ownership==="inherited"?"Inherited owner":facts?.owner || (item.assignedAgentId?"Ownership recorded — name unavailable":"No assigned owner")}</p>
      </div>
    </div>
    <div className="mt-5 rounded-xl border-l-2 border-[#cda24a] bg-[#cda24a08] p-3 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#e2c06f]">One next human step</p>
      <p className="mt-2 text-base font-medium leading-6 text-[#f7ecd5]">{request.next}</p>
      <p className="mt-2 text-sm leading-6 text-[#c9bfad]">Why now: {request.reason}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={`/admin/leads/${item.leadId}#${request.anchor}`} className={`inline-flex min-h-11 items-center py-3 text-sm text-[#e2c06f] underline underline-offset-4 ${focus}`}>Go to next step</Link>
      </div>
    </div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div><dt className="text-xs text-[#b5aa97]">Current owner</dt><dd className="mt-1">{facts?.owner || (item.assignedAgentId?"Recorded — name unavailable":"Unassigned")}{item.ownership==="inherited"?" · inherited, read access only":""}</dd></div>
      <div><dt className="text-xs text-[#b5aa97]">Contact readiness</dt><dd className="mt-1">{request.held?"Contact not available from this desk":"Fresh permission review in protected detail"}</dd></div>
      <div><dt className="text-xs text-[#b5aa97]">Existing action due</dt><dd className="mt-1">{item.taskId || item.appointmentId ? deskDate(item.dueAt,item.timezone) : "No task due time recorded"}</dd></div>
    </dl>
    <HumanReviewObjective value={item.humanReview} now={queue.generatedAt} held={request.held}/>
    <details className="mt-3 text-sm"><summary className={`min-h-11 cursor-pointer py-3 text-[#c9bfad] ${focus}`}>Facts, timestamps &amp; evidence</summary>
      <dl className="grid gap-3 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
        {[
          ["Property / location interest",facts?.location || "Not provided"],
          ["Supplied timeline",facts?.timelineMonths===null || facts?.timelineMonths===undefined?"Not provided":`${facts.timelineMonths} month(s) — supplied, not a deadline`],
          ["Acquisition source",facts?.source || "Unknown"],["Capture surface",facts?.captureSurface || "Unknown"],
          ["Actual capture",deskDate(item.receivedAt,item.timezone)],["First human-response milestone",deskDate(facts?.firstHumanResponseAt,item.timezone)],
        ].map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs text-[#b5aa97]">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}
      </dl>
      <p className="mt-3 text-xs leading-5 text-[#c9bfad]">Retained entries, not independent verification. {request.actions.length} open action reference(s) grouped into this one inquiry. Internal task completion is not contact, delivery or a confirmed appointment.</p>
      <p className="mt-2 break-words text-xs text-[#b5aa97]">{request.actions.flatMap(a=>a.evidenceReferences).join(" · ")}</p>
      {request.delivery?<div className="mt-3 space-y-2 rounded-lg border border-[#b7374d55] p-3"><p className="font-semibold">Recorded delivery exceptions</p>{request.actions.filter(a=>a.notificationId).slice(0,6).map(a=><p key={a.id} className="text-xs leading-5">{a.notificationEvidence?.audience||"Recipient scope unknown"} · {a.notificationEvidence?.template||"Template not recorded"} · {a.notificationEvidence?.channel||"Channel unknown"} · {a.notificationEvidence?.status||"State unknown"}. {a.reasonCodes.includes("notification_provider_reconciliation")?"UNKNOWN effect — reconcile, never blindly resend.":"Review actual provider evidence; not personal receipt."}</p>)}<p className="text-xs leading-5 text-[#c9bfad]">Up to six exception references shown here. Open protected activity for the loaded history; original alerts and new receipts retain separate identities.</p></div>:null}
    </details>
    <TaskControls request={request} principal={principal} complete={complete}/>
  </article>;
}
export function LeadCommandDesk({ queue,principal,filter="attention",page=1,notice,reviewTask }: { queue:AdminTodayQueueResult; principal:LeadCenterPrincipal|null; filter?:DeskFilter; page?:number; notice?:string|null; reviewTask?:string }) {
  const desk=buildTodayDesk(queue), readable=queue.configured&&!queue.error&&Number.isFinite(Date.parse(queue.generatedAt))&&["complete","limited"].includes(queue.coverage?.state||""), limited=queue.coverage?.state==="limited";
  const matching=readable?deskRequests(desk.requests,filter):[], complete=readable&&queue.coverage?.state==="complete";
  const currentPage=Math.min(Math.max(1,page),Math.max(1,Math.ceil(matching.length/DESK_PAGE_SIZE)));
  const offset=(currentPage-1)*DESK_PAGE_SIZE,requests=matching.slice(offset,offset+DESK_PAGE_SIZE);
  const reviewItem=readable ? queue.items.find(item=>item.taskId===reviewTask) : undefined;
  const reviewRequest=reviewItem ? buildTodayDesk({...queue,items:[reviewItem]}).requests[0] : undefined;
  return <main className="min-h-screen bg-[#050505] px-3 py-5 text-[#f7ecd5] [overflow-wrap:anywhere] sm:px-6 sm:py-8">
    <div className="mx-auto max-w-6xl">
      <header className="rounded-2xl border border-[#cda24a40] bg-[radial-gradient(ellipse_at_top_right,#cda24a12,transparent_60%),linear-gradient(120deg,#17140e,#080807)] p-4 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e2c06f]">Ask Magic Mike · Command desk</p><span className="hidden text-xs text-[#c9bfad] sm:inline">Private workspace · Human-led</span></div>
        <h1 className="mt-3 font-serif text-3xl leading-tight sm:mt-5 sm:text-5xl">Your next step.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d8ceba]">Human-led. No automatic contact or assignment.</p>
        <nav className="mt-3 hidden flex-wrap gap-3 sm:flex" aria-label="Desk navigation">
          <Link href="/admin/leads" className={`inline-flex min-h-11 items-center rounded-lg border border-[#cda24a55] px-4 text-sm font-semibold ${focus}`}>All inquiries</Link>
          <Link href="/admin/reporting" className={`inline-flex min-h-11 items-center px-3 text-sm text-[#e2c06f] ${focus}`}>Recorded outcomes</Link>
        </nav>
        <nav className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-5" aria-label="Today queue summary">
          {Object.entries(labels).map(([key,label])=><Link key={key} href={`/admin/today?view=${key}`} aria-current={filter===key?"page":undefined} className={`min-h-14 rounded-xl border p-2 sm:p-3 ${focus} ${filter===key?"border-[#cda24a88] bg-[#cda24a14]":"border-white/10 bg-black/20"}`}><span className="block text-xs leading-5 text-[#d8ceba]">{label}</span><span className="mt-1 block font-serif text-2xl sm:text-3xl">{readable?desk.counts[key as DeskFilter]:"—"}</span></Link>)}
        </nav>
      </header>
      {notice?<p role="status" className="mt-4 rounded-lg border border-cyan-200/30 bg-cyan-200/5 p-3 text-sm text-cyan-100">{notice}</p>:null}
      {reviewTask ? <section aria-labelledby="fresh-task-heading" className="mt-5 space-y-3 rounded-2xl border border-cyan-200/30 p-3 sm:p-5">
        <h2 id="fresh-task-heading" className="font-serif text-2xl">Fresh task review</h2>
        <p className="text-sm leading-6 text-[#d8ceba]">Read from your current authorized queue. Opening this page saves nothing. Review current ownership and permission before acting again; the original rejected page is still unsafe to submit.</p>
        {reviewItem && reviewRequest ? <>
          <p className="break-words text-xs text-[#c9bfad]">Current task version: <code>{reviewItem.recordVersion}</code>. {reviewRequest.held || reviewItem.readOnly || reviewItem.blockers.length || !complete ? "Held / read-only — completion unavailable." : "Open task — explicit completion still rechecks current permission, ownership and version."}</p>
          <RequestCard request={{...reviewRequest,primary:reviewItem}} index={0} queue={queue} principal={principal} complete={complete}/>
        </> : <p role="status" className="text-sm leading-6 text-[#ffbdc8]">Task unavailable in your current authorized queue. It may be completed, canceled, missing, terminal, reassigned or inaccessible. No completion was recorded by this review. Do not use the old form.</p>}
      </section> : null}
      {queue.error?<p role="alert" className="mt-4 rounded-lg border border-[#b7374d66] bg-[#35141b] p-3 text-sm text-[#ffbdc8]">Queue unavailable. Protected data could not be read completely. No action was changed.</p>:null}
      {!readable||limited?<p role="status" className="mt-4 text-sm leading-6 text-[#c9bfad]">{!readable?"Queue unavailable. No measured counts are available; this does not mean there is no work.":`Limited results: ${queue.coverage?.leadCount} recent authorized open requests. The ${queue.coverage?.limitedBy.join(", ")} query reached its limit. Counts describe returned inquiries only; queue mutations are held.`}</p>:<details className="mt-2 text-xs leading-5 text-[#c9bfad]"><summary className={`min-h-11 cursor-pointer py-3 ${focus}`}>{queue.coverage?.leadCount ?? 0} open requests read · Scope &amp; count definitions</summary><p>One card per inquiry in this bounded authorized read (maximum 1,000). Counts overlap by filter, not distinct people. Completed, terminal and dismissed work is not included; tests are excluded.</p></details>}
      <details className="mt-2 max-w-xl rounded-xl border border-white/15 bg-[#0d0d0c] px-4"><summary className={`min-h-11 cursor-pointer py-3 font-semibold ${focus}`}>Find a request</summary><div className="mb-4"><LeadSearchPanel/></div></details>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-labelledby="today-work-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs uppercase tracking-[.15em] text-[#e2c06f]">Priority work</p><h2 id="today-work-heading" className="mt-2 font-serif text-3xl">{labels[filter]}</h2></div><p className="text-xs text-[#b5aa97]">As of {deskDate(queue.generatedAt,queue.timezone)}</p></div>
          <div className="space-y-4">{requests.length?requests.map((r,index)=><RequestCard key={r.leadId} request={r} index={index+offset} queue={queue} principal={principal} complete={complete}/>):<div className="rounded-2xl border border-white/15 bg-[#0d0d0c] p-5 sm:p-7"><h3 className="font-serif text-3xl">{!readable?"Queue unavailable":limited?"No actions in limited results":desk.requests.length?"No requests in this view":"No open actions returned"}</h3><p className="mt-3 text-sm leading-6 text-[#c9bfad]">{!readable?"A failed or unconfigured read is not a clear queue.":limited?"This bounded read cannot establish that all work is complete.":desk.requests.length?"Try another view. Held work stays out of the contact-action queue.":"No open actions were returned in your authorized scope. This is not a traffic or conversion measurement. No customer task has been invented."}</p><Link href="/admin/leads" className={`mt-4 inline-flex min-h-11 items-center text-sm text-[#e2c06f] underline ${focus}`}>Open Lead Center</Link></div>}</div>
          {matching.length>DESK_PAGE_SIZE?<nav aria-label="Desk pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-[#c9bfad]">{offset+1}–{offset+requests.length} of {matching.length} returned inquiries</span><div className="flex gap-3">{currentPage>1?<Link className={`inline-flex min-h-11 items-center text-[#e2c06f] ${focus}`} href={`/admin/today?view=${filter}&page=${currentPage-1}`}>Previous</Link>:null}{offset+requests.length<matching.length?<Link className={`inline-flex min-h-11 items-center text-[#e2c06f] ${focus}`} href={`/admin/today?view=${filter}&page=${currentPage+1}`}>Next</Link>:null}</div></nav>:null}
        </section>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <section aria-label="Priority explanation" className="rounded-xl border border-[#cda24a33] bg-[#100f0c] p-4">
            <h2 className="font-serif text-xl">Why this order?</h2><p className="mt-3 text-sm leading-6 text-[#c9bfad]">Existing overdue tasks, delivery exceptions, missing ownership, then recorded requests and other open work. Due time and stable inquiry identity break ties.</p>
            <p className="mt-3 text-sm leading-6 text-[#c9bfad]">No lead score, protected trait, financial profile, location or missing optional answer ranks this desk. Priority never grants permission.</p>
            <p className="mt-3 text-xs text-[#b5aa97]">Advisory rubric: {desk.version}. Waiting on human means no first-response milestone is recorded, not proof that no contact occurred. A new capture is not a human response; a provider receipt is not personal acknowledgment.</p>
          </section>
        </aside>
      </div>
    </div>
  </main>;
}
