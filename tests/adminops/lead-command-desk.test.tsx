// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe,expect,it,vi } from "vitest";
import { buildAdminTodayQueue,emptyAdminTodayQueue } from "../../app/lib/adminTodayQueue";
import { buildTodayDesk,deskRequests,deskFilter,deskPage,deskDate,elapsedSince } from "../../app/lib/adminTodayDesk";
import { LeadCommandDesk } from "../../app/components/admin/LeadCommandDesk";
import { normalizeTask } from "../../app/lib/persistence/supabase/adminAppointmentFollowupOps";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("../../app/admin/today/actions",()=>({completeTodayTask:vi.fn(),reviewTodayAction:vi.fn()}));
const now=new Date("2026-11-06T18:00:00.000Z");
const principal:LeadCenterPrincipal={userId:"synthetic-admin",role:"administrator",agentId:null,email:"admin@example.test",name:"SYNTHETIC"};
const lead=(id="one",patch:Record<string,unknown>={})=>({id,created_at:"2026-11-06T17:00:00Z",updated_at:"2026-11-06T17:00:00Z",status:"new",score:99,lead_grade:"A",first_name:"SYNTHETIC "+id,assigned_agent_id:"owner",has_contact:true,owner_name:"SYNTHETIC OPERATOR",...patch});
const task=(id="task",leadId="one",status="open",due="2026-11-06T17:30:00Z")=>normalizeTask({id,lead_id:leadId,status,due_at:due,category:"followup:manual",created_at:"2026-11-06T17:00:00Z",updated_at:"2026-11-06T17:00:00Z",title:"SYNTHETIC internal review"})!;
const queue=(leads=[lead()],tasks:ReturnType<typeof task>[]=[])=>
  buildAdminTodayQueue({leads,tasks,appointments:[],now,permissions:leads.map(l=>({lead_id:l.id,channel:"email",purpose:"manual_one_to_one",state:"allowed"}))});
describe("operator_action_v1 on existing authorized queue",()=>{
  it("groups existing actions by inquiry and makes a real overdue task primary",()=>{
    const q=queue([lead()],[task()]);
    expect(q.items.length).toBeGreaterThan(1);
    const desk=buildTodayDesk(q);
    expect(desk.requests).toHaveLength(1);
    expect(desk.requests[0].primary.taskId).toBe("task");
    expect(desk.requests[0].reason).toContain("existing unsatisfied");
    expect(desk.counts).toMatchObject({attention:1,overdue:1,waiting:1});
    expect(desk.requests[0].actions.every(a=>a.actionKey!=="hot-review")).toBe(true);
  });
  it("never ranks by score, name, geography, financing or missing optional facts",()=>{
    const ids=(q:ReturnType<typeof queue>)=>buildTodayDesk(q).requests.map(r=>r.leadId);
    const before=queue([lead("a",{score:0,first_name:"Z",source:"unknown"}),lead("b",{score:100,first_name:"A"})]);
    const after=queue([lead("b",{score:0,first_name:"Z",city:"Other",timeline_months:0}),lead("a",{score:100,first_name:"A",stated_financing:"Unknown"})]);
    expect(ids(before)).toEqual(["a","b"]);expect(ids(after)).toEqual(ids(before));
  });
  it("separates unassigned review from actual assignment; no owner is changed",()=>{
    const raw=lead("unassigned",{assigned_agent_id:null});
    const q=buildAdminTodayQueue({leads:[raw],tasks:[],appointments:[],now,canViewUnassigned:true});
    const desk=buildTodayDesk(q);
    expect(desk.requests[0]).toMatchObject({anchor:"qualification-review",held:false});
    expect(desk.requests[0].next).toContain("No assignment");
    expect(raw.assigned_agent_id).toBeNull();
  });
  it("keeps suppressed, inherited and anonymous work outside attention; terminal/NO FOLLOW-UP/test absent",()=>{
    const q=queue([lead("held",{communication_suppressed:true}),lead("anonymous",{has_contact:false}),lead("inherited",{assigned_agent_id:null,inquiry_owner_agent_id:"owner"}),lead("terminal",{conversion_stage:"disqualified"}),lead("no-follow",{closed_lost_reason:"no_follow_up"}),lead("test",{is_test:true})]);
    const desk=buildTodayDesk(q);
    expect(deskRequests(desk.requests,"attention")).toEqual([]);
    expect(new Set(deskRequests(desk.requests,"held").map(r=>r.leadId))).toEqual(new Set(["held","anonymous","inherited"]));
    expect(desk.counts.overdue).toBe(0);
    for(const r of desk.requests)expect(r.next).toContain("without contacting");
  });
  it("canceled/completed obligations never become the primary task or overdue work",()=>{
    const desk=buildTodayDesk(queue([lead()],[task("done","one","done"),task("canceled","one","cancelled")]));
    expect(desk.requests[0].primary.taskId).toBeNull();
    expect(desk.counts.overdue).toBe(0);
  });
  it("keeps a permission-held overdue task out of actionable/overdue counts and task completion",()=>{
    const q=buildAdminTodayQueue({leads:[lead()],tasks:[task()],appointments:[],now,permissions:[]});
    const desk=buildTodayDesk(q);
    expect(desk.counts).toMatchObject({attention:0,overdue:0,waiting:0,held:1});
    expect(desk.requests[0].primary.taskId).toBe("task");
    expect(desk.requests[0].next).toContain("Do not complete contact work");
    const html=renderToStaticMarkup(<LeadCommandDesk queue={q} principal={principal} filter="held"/>);
    expect(html).not.toContain("Complete task");expect(html).not.toContain("Snooze 24 hours");
    expect(html).toContain("permission is held");
  });
  it("deduplicates repeated source identities and uses stable time/id tie breaks",()=>{
    const q=queue([lead()],[task(),task()]);
    const desk=buildTodayDesk({...q,items:[...q.items,...q.items]});
    expect(desk.requests).toHaveLength(1);
    expect(desk.requests[0].actions.filter(a=>a.taskId==="task")).toHaveLength(1);
  });
  it("records source and surface separately via the existing evidence parser",()=>{
    const item=queue([lead("source",{source:"instagram",source_detail:"widget / retained form"})]).items[0];
    expect(item.facts).toMatchObject({source:"instagram",captureSurface:"widget"});
    expect(queue([lead("source",{source:"instagram",source_detail:"arbitrary campaign"})]).items[0].facts?.captureSurface).toBeNull();
  });
  it("delivery exceptions are review links, never provider retries or personal-delivery claims",()=>{
    const q=queue();q.items.push({...q.items[0],id:"notification",actionKey:"notification:x",notificationId:"x",actionKind:"review_notification"});
    const r=buildTodayDesk(q).requests[0];
    expect(r.anchor).toBe("activity");expect(r.next).toContain("reconcile UNKNOWN");
    expect(r.delivery).toBe(true);
  });
  it("unknown times and untrusted filter/page inputs do not invent urgency",()=>{
    expect(deskFilter("https://example.test")).toBe("attention");
    expect(deskPage("-2")).toBe(1);expect(deskPage("999")).toBe(40);expect(deskPage("2")).toBe(2);
    expect(elapsedSince("invalid",now.toISOString())).toBe("Age unknown");
    expect(deskDate("invalid")).toBe("Not recorded");
    expect(deskDate(now.toISOString(),"invalid")).toContain("Timezone unavailable");
    expect(buildTodayDesk({...queue([lead()],[task()]),generatedAt:"invalid"}).counts.overdue).toBe(0);
  });
});
describe("command desk render: no query, identity grant or outbound effect",()=>{
  it("uses 25-request pages, not hundreds of repeated action cards",()=>{
    const q=queue(Array.from({length:30},(_,i)=>lead(String(i).padStart(2,"0"))));
    const html=renderToStaticMarkup(<LeadCommandDesk queue={q} principal={principal}/>);
    expect((html.match(/<article/g)||[])).toHaveLength(25);
    expect(html).toContain("Desk pagination");expect(html).toContain("page=2");
    expect(html).not.toMatch(/href="(?:tel:|sms:|mailto:)/);
  });
  it("shows truthful empty/unavailable/limited states without fabricated percentages or stale rows",()=>{
    const empty=queue([]);
    expect(renderToStaticMarkup(<LeadCommandDesk queue={empty} principal={principal}/>)).toContain("No open actions returned");
    const stale={...queue(),error:"synthetic failure"};
    const failed=renderToStaticMarkup(<LeadCommandDesk queue={stale} principal={principal}/>);
    expect(failed).toContain("No measured counts");expect(failed).not.toContain("SYNTHETIC one");
    expect(failed).not.toContain("Complete task");
    const limited={...queue([lead()],[task()]),coverage:{state:"limited" as const,leadCount:1,leadLimit:1000,limitedBy:["tasks"]}};
    const html=renderToStaticMarkup(<LeadCommandDesk queue={limited} principal={principal}/>);
    expect(html).toContain("Limited results");expect(html).not.toContain("Snooze 24 hours");expect(html).not.toContain("Complete task");
    expect(new DOMParser().parseFromString(html,"text/html").body.textContent).not.toContain("0%");expect(renderToStaticMarkup(<LeadCommandDesk queue={emptyAdminTodayQueue()} principal={principal}/>)).toContain("Queue unavailable");
  });
  it("held/read-only render has no action forms and untrusted labels are escaped",()=>{
    const q=queue([lead("hold",{communication_suppressed:true,first_name:"<script>SYNTHETIC</script>"})]);
    const html=renderToStaticMarkup(<LeadCommandDesk queue={q} principal={principal} filter="held"/>);
    expect(html).toContain("&lt;script&gt;");expect(html).not.toContain("<script>");
    expect(html).not.toContain("Complete task");expect(html).not.toContain("Dismiss action");
    expect(html).toContain("without contacting");
  });
});
