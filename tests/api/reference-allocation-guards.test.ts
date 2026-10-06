import { beforeEach,describe,expect,it,vi } from "vitest";
import { NextRequest,NextResponse } from "next/server";
import { hasLeadCenterPermission,type LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
const mocks=vi.hoisted(()=>({query:vi.fn(),task:vi.fn(),principal:null as LeadCenterPrincipal|null}));
vi.mock("@neondatabase/serverless",()=>({neon:()=>({query:mocks.query})}));
vi.mock("@/lib/admin/rbac-session",()=>({requireLeadCenterApiPermission:async(_:unknown,permission:Parameters<typeof hasLeadCenterPermission>[1])=>{
 if(!mocks.principal||!hasLeadCenterPermission(mocks.principal.role,permission))return {ok:false,response:NextResponse.json({ok:false,error:"forbidden"},{status:403})};
 return {ok:true,principal:mocks.principal};
}}));
vi.mock("@/lib/admin/lead-operations",()=>({createCanonicalAdminLeadTask:mocks.task}));
vi.mock("@/lib/analytics/ledger",()=>({trackEventNoWait:vi.fn()}));
import { POST as createTask } from "../../app/api/admin/leads/[id]/tasks/route";
import { POST as createOffers } from "../../app/api/admin/allocation/offers/route";
import { GET as dueGet } from "../../app/api/admin/allocation/due/route";
import { GET as offerGet } from "../../app/api/admin/allocation/offers/[id]/route";
import { GET as enrollmentGet } from "../../app/api/admin/allocation/enrollment/route";
import { allocationQuery } from "../../app/lib/leadAllocation";
import { POST as pilotPost } from "../../app/api/admin/allocation/pilot/route";
const lead="00000000-0000-4000-8000-000000007711",agent="00000000-0000-4000-8000-000000007712";
function request(path:string,body:object,origin="https://www.askmagicmike.com"){return new NextRequest(`https://www.askmagicmike.com${path}`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify(body)});}
beforeEach(()=>{
 vi.unstubAllEnvs();vi.stubEnv("DATABASE_URL","postgresql://synthetic.invalid/no-network");vi.stubEnv("VERCEL_ENV","development");vi.stubEnv("LEAD_ALLOCATION_ENABLED","true");
 vi.clearAllMocks();mocks.principal={userId:"fixture-staff",role:"approved_agent",agentId:agent,name:"SYNTHETIC",email:"synthetic@example.test"};
 mocks.query.mockResolvedValue([{assigned_agent_id:agent,is_test:false,communication_suppressed:false}]);
 mocks.task.mockResolvedValue({ok:true,value:{taskId:"fixture-task",auditId:"fixture-audit",createdAt:"2026-10-04T16:00:00Z"}});
});
describe("reference allocation actual route guards — isolated mocked session, no send",()=>{
 it("pilot stays admin/same-origin/Preview gated with no request-authored recipients, scopes or prices",async()=>{
  const body={action:'seed',pilotId:lead,index:1};
  expect((await pilotPost(request('/api/admin/allocation/pilot',body))).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();mocks.principal!.role='administrator';
  expect((await pilotPost(request('/api/admin/allocation/pilot',body,'https://unowned.invalid'))).status).toBe(403);
  expect((await pilotPost(request('/api/admin/allocation/pilot',body))).status).toBe(409);
  vi.stubEnv('LEAD_ALLOCATION_STAFF_PILOT_ENABLED','true');vi.stubEnv('VERCEL_ENV','preview');
  expect((await pilotPost(request('/api/admin/allocation/pilot',body))).status).toBe(503);
  expect(mocks.query).not.toHaveBeenCalled();vi.stubEnv('VERCEL_ENV','development');
  expect((await pilotPost(request('/api/admin/allocation/pilot',{...body,recipient:'+19195550199',budget:1}))).status).toBe(400);
  expect(mocks.query).not.toHaveBeenCalled();mocks.query.mockResolvedValue([]);
  expect((await pilotPost(request('/api/admin/allocation/pilot',body))).status).toBe(409);
 });
 it("same-origin assigned task uses the existing canonical transaction",async()=>{
  const response=await createTask(request(`/api/admin/leads/${lead}/tasks`,{title:"Synthetic evidence task",body:"No send",category:"evidence_review",priority:"normal"}),{params:Promise.resolve({id:lead})});
  expect(response.status).toBe(200);expect(mocks.task).toHaveBeenCalledWith(expect.objectContaining({leadId:lead,agentId:agent,actor:"lead_center:fixture-staff"}));
 });
 it("cross-origin fails before session/database; arbitrary assignee and another agent's lead fail",async()=>{
  expect((await createTask(request(`/api/admin/leads/${lead}/tasks`,{title:"No write"},"https://external.invalid"),{params:Promise.resolve({id:lead})})).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();
  expect((await createTask(request(`/api/admin/leads/${lead}/tasks`,{title:"No write",agent_id:lead}),{params:Promise.resolve({id:lead})})).status).toBe(403);
  mocks.query.mockResolvedValue([{assigned_agent_id:lead,is_test:false,communication_suppressed:false}]);
  expect((await createTask(request(`/api/admin/leads/${lead}/tasks`,{title:"No write"}),{params:Promise.resolve({id:lead})})).status).toBe(404);
  expect(mocks.task).not.toHaveBeenCalled();
 });
 for(const role of ["administrator","primary_lead_owner","approved_agent","read_only_analyst"] as const)it(`four-role task scope: ${role}`,async()=>{
  mocks.principal!.role=role;
  const response=await createTask(request(`/api/admin/leads/${lead}/tasks`,{title:"Synthetic task",priority:"low",due_at:"2026-10-05T16:00:00Z"}),{params:Promise.resolve({id:lead})});
  expect(response.status).toBe(role==="read_only_analyst"?403:200);
 });
 it("Preview and held allocation fail before database calls",async()=>{
  mocks.principal!.role="administrator";vi.stubEnv("VERCEL_ENV","preview");
  const denied=await createOffers(request("/api/admin/allocation/offers",{leadId:lead,expectedVersion:0}));
  expect(denied.status).toBe(503);expect(await denied.json()).toMatchObject({ok:false,error:"preview_data_disabled"});
  expect(mocks.query).not.toHaveBeenCalled();
  vi.stubEnv("VERCEL_ENV","development");vi.stubEnv("LEAD_ALLOCATION_ENABLED","false");
  expect((await createOffers(request("/api/admin/allocation/offers",{leadId:lead,expectedVersion:0}))).status).toBe(409);
 });
 it("ordinary scanner/browser GET cannot invoke the durable due worker",async()=>{
  expect((await dueGet(new NextRequest("https://www.askmagicmike.com/api/admin/allocation/due"))).status).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled();
 });
 it("disabled or unattested Preview GETs never read a Production-scoped database URL",async()=>{
  vi.stubEnv("VERCEL_ENV","preview");
  expect(allocationQuery()).toBeNull();
  expect((await offerGet(new NextRequest(`https://www.askmagicmike.com/api/admin/allocation/offers/${lead}`),{params:Promise.resolve({id:lead})})).status).toBe(503);
  expect((await enrollmentGet(new NextRequest("https://www.askmagicmike.com/api/admin/allocation/enrollment"))).status).toBe(503);
  vi.stubEnv("PREVIEW_DATA_MODE","enabled");vi.stubEnv("ALLOW_PREVIEW_DB_MUTATION","true");
  // Flags alone are not endpoint attestation.
  expect(allocationQuery()).toBeNull();
  expect(mocks.query).not.toHaveBeenCalled();
 });
});
