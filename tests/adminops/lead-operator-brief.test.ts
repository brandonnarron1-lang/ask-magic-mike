import {describe,expect,it} from "vitest";
import {normalizeAdminLeadRow,type AdminLeadDetailResult} from "../../app/lib/persistence/supabase/adminLeadView";
import {normalizeTask,normalizeAppointment} from "../../app/lib/persistence/supabase/adminAppointmentFollowupOps";
import {buildOperatorBrief} from "../../app/lib/leadOperatorBrief";
import type {LeadCenterPrincipal} from "../../src/lib/admin/rbac-policy";
const now=new Date("2026-11-06T18:00:00Z");
const principal:LeadCenterPrincipal={userId:"synthetic",role:"approved_agent",agentId:"owner",email:"agent@example.test",name:"SYNTHETIC"};
const detail=(patch:Record<string,unknown>={}):AdminLeadDetailResult=>({configured:true,lead:normalizeAdminLeadRow({id:"lead",created_at:"2026-11-06T17:00:00Z",status:"new",assigned_agent_id:"owner",email:"synthetic@example.test",...patch}),timeline:[],appointments:[],followupTasks:[],outcomes:[],firstResponse:null});
describe("protected operator brief from existing detail only",()=>{
  it("never recommends contact for an anonymous question",()=>{
    const brief=buildOperatorBrief(detail({email:null,phone:null}),principal,now)!;
    expect(brief.held).toBe(true);expect(brief.recommendation).toContain("do not guess");
  });
  it("does not treat last_contacted, task completion or receipt as first human response",()=>{
    const brief=buildOperatorBrief(detail({last_contacted_at:"2026-11-06T17:10:00Z"}),principal,now)!;
    expect(brief.firstHumanResponseAt).toBeNull();expect(brief.responseMinutes).toBeNull();
    expect(brief.recommendation).toContain("current permission");
  });
  it("preserves actual milestone timestamp/provenance without fabricating elapsed values",()=>{
    const d=detail();d.firstResponse={id:"m",first_human_response_at:"2026-11-06T17:05:00Z",response_minutes:5,source_system:"operator_recorded",actor:"synthetic",evidence_audit_id:null};
    expect(buildOperatorBrief(d,principal,now)).toMatchObject({responseMinutes:5,responseProvenance:"operator_recorded"});
    d.firstResponse.first_human_response_at="invalid";
    expect(buildOperatorBrief(d,principal,now)?.responseMinutes).toBeNull();
  });
  it.each([{communication_suppressed:true},{status:"closed_lost"},{conversion_stage:"disqualified"},{closed_lost_reason:"no_follow_up"},{is_test:true}])("keeps held/terminal/NO FOLLOW-UP internal only: %o",patch=>{
    const b=buildOperatorBrief(detail(patch),principal,now)!;
    expect(b.held).toBe(true);expect(b.anchor).toBe("qualification-review");expect(b.recommendation).toContain("Do not contact");
  });
  it("does not confuse inherited read ownership with direct mutation authority",()=>{
    const b=buildOperatorBrief(detail({assigned_agent_id:null,inquiry_owner_agent_id:"owner",inquiry_owner_agent_name:"SYNTHETIC OWNER"}),principal,now)!;
    expect(b.ownership.inherited).toBe(true);expect(b.canMaintain).toBe(false);
    expect(b.recommendation).toContain("Read-only");
  });
  it("selects an existing overdue task before a requested appointment and never revives terminal tasks",()=>{
    const d=detail();
    d.followupTasks=[normalizeTask({id:"task",title:"SYNTHETIC internal review",lead_id:"lead",status:"open",due_at:"2026-11-06T17:30:00Z"})!];
    d.appointments=[normalizeAppointment({id:"appointment",lead_id:"lead",status:"requested",requested_at:"2026-11-06T17:40:00Z"})!];
    expect(buildOperatorBrief(d,principal,now)).toMatchObject({anchor:"follow-up",overdue:true});
    d.followupTasks[0].status="cancelled";
    expect(buildOperatorBrief(d,principal,now)).toMatchObject({anchor:"appointment-review",overdue:false});
  });
});
