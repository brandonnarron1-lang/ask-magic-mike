// @vitest-environment node
import {beforeEach,afterEach,describe,expect,it,vi} from "vitest";
const dispatch=vi.hoisted(()=>vi.fn());
vi.mock("../../app/lib/leadAllocationDispatch",()=>({processPendingAllocationIntents:dispatch}));
import {runAllocationScheduler} from "../../app/lib/leadAllocationScheduler";
beforeEach(()=>{vi.stubEnv("LEAD_ALLOCATION_ENABLED","true");vi.stubEnv("LEAD_ALLOCATION_DUE_ENABLED","true");dispatch.mockReset().mockResolvedValue({processed:5,accepted:3,reconciliationRequired:1});});
afterEach(()=>vi.unstubAllEnvs());
function fixture(pending=0,oldest=0){
 const query=vi.fn(async(sql:string)=>sql.includes("acquire_lead_allocation_scheduler_v1")?[{result:{acquired:true,start_gap_seconds:65,late_seconds:5}}]:
  sql.includes("true AS owned")?[{owned:true}]:sql.includes("count(*)::int AS pending")?[{pending,oldest_seconds:oldest}]:
  sql.includes("expire_lead_allocation_offers_v2")?[{result:{ok:true,expired:0,first_offered:0}}]:[]);
 return {query};
}
describe("scheduler bounded orchestration",()=>{
 it("held flags do not touch SQL/providers",async()=>{
  const sql=fixture();vi.stubEnv("LEAD_ALLOCATION_DUE_ENABLED","false");
  expect(await runAllocationScheduler(sql)).toMatchObject({held:true,processed:0});
  expect(sql.query).not.toHaveBeenCalled();expect(dispatch).not.toHaveBeenCalled();
 });
 it("overload holds discovery, retains canonical custody, reports backlog and still bounds existing processor",async()=>{
  const sql=fixture(51,601);const result=await runAllocationScheduler(sql);
  expect(result).toMatchObject({ok:true,overloaded:true,fallbackReviewRequired:true,before:{pending:51,oldestSeconds:601},dispatch:{processed:5}});
  expect(sql.query).toHaveBeenCalledWith(expect.stringContaining("expire_lead_allocation_offers_v2"),[false]);
  expect(dispatch).toHaveBeenCalledTimes(1);expect(dispatch).toHaveBeenCalledWith(sql,expect.objectContaining({beforeEach:expect.any(Function)}));
 });
 it("lost lease cannot discover or dispatch and release remains token/expiry fenced",async()=>{
  const sql=fixture();const normal=sql.query.getMockImplementation()!;
  sql.query.mockImplementation(async s=>s.includes("true AS owned")?[]:normal(s));
  expect(await runAllocationScheduler(sql)).toMatchObject({ok:false,error:"scheduler_lease_lost"});
  expect(dispatch).not.toHaveBeenCalled();
  expect(sql.query.mock.calls.at(-1)?.[0]).toContain("token=$1::uuid AND lease_until>clock_timestamp()");
 });
 it("records actual cadence lateness, not an exact sixty-second SLA",async()=>{
  expect(await runAllocationScheduler(fixture())).toMatchObject({startGapSeconds:65,lateSeconds:5});
 });
 it("five intents include offer and confirmation work; bounded overload does not imply lead capacity",()=>{
  // Deterministic capacity fixture, not carrier throughput. Three dual-channel
  // sequential leads/minute require 12 intents/minute at 2 offer+2 confirmation.
  let pending=0,max=0;for(let minute=0;minute<10;minute++){pending+=12;pending-=Math.min(5,pending);max=Math.max(max,pending);}
  expect(pending).toBe(70);expect(max).toBeGreaterThan(50);
  let single=0;for(let minute=0;minute<10;minute++){single+=4;single-=Math.min(5,single);}
  expect(single).toBe(0); // two SMS-only leads/minute, offer+confirmation
 });
});
