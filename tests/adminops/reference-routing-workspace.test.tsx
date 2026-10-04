import { renderToStaticMarkup } from "react-dom/server";
import { describe,expect,it } from "vitest";
import { AllocationWorkspace } from "../../app/components/admin/AllocationWorkspace";
import { allocationWorkspaceFixture } from "../../app/lib/leadPresentationFixtures";
import { ALLOCATION_FILTERS,EMPTY_ALLOCATION_FILTERS,matchesAllocationFilters,allocationPriority } from "../../app/lib/allocationWorkspaceFilters";
import { normalizeAdminLeadRow } from "../../app/lib/persistence/supabase/adminLeadView";
import { presentLead } from "../../app/lib/leadPresentation";
import { normalizeAppointment,normalizeTask } from "../../app/lib/persistence/supabase/adminAppointmentFollowupOps";

describe("routing workspace and persisted checklist — no send",()=>{
 it("offers all seven operational filters and keeps synthetic mutations disabled",()=>{
  const html=renderToStaticMarkup(<AllocationWorkspace state={allocationWorkspaceFixture} preview/>);
  expect(html.match(/<select/g)).toHaveLength(7);expect(html).toContain("Provider acceptance is not human contact");
  expect(html).toContain("SYNTHETIC REVIEWER");expect(html).not.toContain("/api/");
  expect(html).toContain("<button disabled");expect(html).not.toContain("Staff channel enrollment");
 });
 for(const key of ALLOCATION_FILTERS)it("filters actual bounded rows by "+key,()=>{
  const row=allocationWorkspaceFixture.offers[0];
  const expected=key==="priority"?allocationPriority(row.score):key==="ownerId"?row.ownerId!:row[key];
  expect(matchesAllocationFilters(row,{...EMPTY_ALLOCATION_FILTERS,[key]:expected})).toBe(true);
  expect(matchesAllocationFilters(row,{...EMPTY_ALLOCATION_FILTERS,[key]:"no matching fixture"})).toBe(false);
 });
 it("does not manufacture completed contact, appointments or tasks from delivery/next-follow-up timestamps",()=>{
  const lead=normalizeAdminLeadRow({id:"00000000-0000-4000-8000-000000000002",assigned_agent_id:"00000000-0000-4000-8000-000000000001",next_follow_up_at:"2026-10-05T16:00:00Z"});
  const view=presentLead({lead,tier:"assigned",principal:{userId:"fixture",role:"approved_agent",name:"SYNTHETIC",email:"synthetic@example.test",agentId:lead.assigned_agent_id},evidence:{appointments:[],followupTasks:[],outcomes:[]}});
  for(const label of ["Human contact","Appointment request","Appointment confirmation","Next task recorded","Documented outcome"])expect(view.steps.find(step=>step.label===label)?.state).toBe("pending");
  expect(view.steps.find(step=>step.label==="Reviewed packet")?.state).toBe("not_applicable");
 });
 it("confirmed appointment, actual open task and documented outcome complete only their own persisted steps",()=>{
  const id="00000000-0000-4000-8000-000000000002",agent="00000000-0000-4000-8000-000000000001";
  const lead=normalizeAdminLeadRow({id,assigned_agent_id:agent});
  const view=presentLead({lead,tier:"assigned",principal:{userId:"fixture",role:"approved_agent",name:"SYNTHETIC",email:"synthetic@example.test",agentId:agent},
   evidence:{appointments:[normalizeAppointment({id:"fixture-appointment",lead_id:id,status:"confirmed",confirmed_at:"2026-10-04T18:00:00Z"})!],followupTasks:[normalizeTask({id:"fixture-task",lead_id:id,title:"INTERNAL QA evidence review",status:"open"})!],outcomes:[{id:"fixture-outcome",outcome_type:"qualified",amount_usd:null,occurred_at:"2026-10-04T18:00:00Z",source_system:"synthetic"}]}});
  for(const label of ["Appointment request","Appointment confirmation","Next task recorded","Documented outcome"])expect(view.steps.find(step=>step.label===label)?.state).toBe("complete");
  expect(view.steps.find(step=>step.label==="Human contact")?.state).toBe("pending");
 });
});
