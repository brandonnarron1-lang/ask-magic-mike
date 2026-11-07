import {beforeEach,describe,expect,it,vi} from "vitest";
import type {AdminTodayAction} from "../../app/lib/adminTodayQueue";
const m=vi.hoisted(()=>({principal:vi.fn(),queue:vi.fn(),task:vi.fn(),review:vi.fn(),revalidate:vi.fn()}));
vi.mock("next/navigation",()=>({redirect:vi.fn((v:string)=>{throw Error("redirect:"+v);})}));
vi.mock("next/cache",()=>({revalidatePath:m.revalidate}));
vi.mock("../../src/lib/admin/rbac-session",()=>({requireLeadCenterPermission:m.principal}));
vi.mock("../../app/lib/adminTodayView",()=>({loadAdminTodayQueue:m.queue,mutateTodayActionReview:m.review}));
vi.mock("../../app/lib/adminAppointmentFollowupOps",()=>({updateFollowupTask:m.task}));
import {completeTodayTask,reviewTodayAction} from "../../app/admin/today/actions";
const item:AdminTodayAction={id:"lead:task:t",actionKey:"task:t",leadId:"lead",taskId:"t",appointmentId:null,notificationId:null,assignedAgentId:"real-owner",leadLabel:"SYNTHETIC",actionKind:"complete_task",priorityBucket:"overdue_sla",dueAt:"2026-11-06T17:00:00Z",timezone:"America/New_York",reasonCodes:["followup_overdue"],evidenceReferences:["task:t"],blockers:[],requiredPermission:"task:manage_assigned",recordVersion:"2026-11-06T17:00:00Z",reviewVersion:3,recommendedAction:"Review internal task",readOnly:false};
const form=()=>{const f=new FormData();for(const [k,v]of Object.entries({action_id:item.id,lead_id:item.leadId,record_version:item.recordVersion,review_version:"3",response_mode:"inline",idempotency_key:"same-synthetic-intent",assigned_agent_id:"forged-owner",priority:"highest",actor:"forged-actor"}))f.set(k,v);return f;};
describe("desk uses existing fresh server-authorized internal actions",()=>{
 beforeEach(()=>{vi.clearAllMocks();m.principal.mockResolvedValue({userId:"actual-user",role:"approved_agent",agentId:"real-owner"});m.queue.mockResolvedValue({items:[item],coverage:{state:"complete"}});m.task.mockResolvedValue({ok:true});m.review.mockResolvedValue({ok:true});});
 it("ignores forged owner/priority/actor and forwards the existing stable idempotency key",async()=>{
   expect(await completeTodayTask(form(),"inline")).toEqual({ok:true});
   expect(m.task).toHaveBeenCalledWith({leadId:"lead",taskId:"t",expectedUpdatedAt:item.recordVersion,action:"complete",actor:"lead_center:actual-user",idempotencyKey:"same-synthetic-intent"});
   expect(m.task.mock.calls[0][0]).not.toHaveProperty("priority");
   expect(m.task.mock.calls[0][0]).not.toHaveProperty("assigned_agent_id");
   expect(m.revalidate).toHaveBeenCalledWith("/admin/today");
 });
 it.each([
   {items:[{...item,readOnly:true}],coverage:{state:"complete"}},
   {items:[{...item,blockers:["communication_suppressed"]}],coverage:{state:"complete"}},
   {items:[item],coverage:{state:"limited"}},
   {items:[item],coverage:{state:"complete"},error:"synthetic unavailable"},
   {items:[],coverage:{state:"complete"}},
 ])("fails closed for inherited, held, capped, failed or stale reads: %o",async q=>{
   m.queue.mockResolvedValue(q);expect((await completeTodayTask(form(),"inline")).ok).toBe(false);expect(m.task).not.toHaveBeenCalled();
 });
 it("does not trust a forged parent or stale record version",async()=>{
   for(const [key,value]of [["lead_id","other-lead"],["record_version","stale"]]){
     const f=form();f.set(key,value);expect((await completeTodayTask(f,"inline")).ok).toBe(false);
   }
   expect(m.task).not.toHaveBeenCalled();
   expect(m.revalidate).not.toHaveBeenCalled();
 });
 it("checks current role for task completion even if the client fabricates an action",async()=>{
   m.principal.mockResolvedValue({userId:"reader",role:"read_only_analyst",agentId:null});
   expect((await completeTodayTask(form(),"inline")).ok).toBe(false);expect(m.task).not.toHaveBeenCalled();
 });
 it("keeps snooze/dismiss CAS and review action identity authoritative",async()=>{
   const f=form();f.set("review_status","dismissed");f.set("reason","SYNTHETIC internal disposition");
   f.set("review_version","2");expect((await reviewTodayAction(f,"inline")).ok).toBe(false);expect(m.review).not.toHaveBeenCalled();
   f.set("review_version","3");expect((await reviewTodayAction(f,"inline")).ok).toBe(true);
   expect(m.review.mock.calls[0][0]).toMatchObject({leadId:"lead",actionKey:"task:t",actorUserId:"actual-user",expectedVersion:3,status:"dismissed"});
 });
});
