import {afterEach,expect,it,vi} from "vitest";
const {query}=vi.hoisted(()=>({query:vi.fn()}));
vi.mock("@neondatabase/serverless",()=>({neon:()=>({query})}));
import {loadNeonAdminActivity} from "../../app/lib/persistence/neonAdminActivityView";
const principal={userId:"synthetic",role:"administrator" as const,agentId:null,email:"synthetic@example.test",name:"SYNTHETIC"};
const row={activity_source:"audit",source_id:"synthetic",lead_id:"synthetic-lead",lead_label:"SYNTHETIC",event_type:"synthetic.event",actor:"synthetic"};
afterEach(()=>{vi.unstubAllEnvs();query.mockReset();});
it.each([new Date("2026-10-19T01:00:00Z"),"2026-10-19T01:00:00Z"])("retains actual Neon/JSON dates without inventing epoch history: %s",async stamp=>{
 vi.stubEnv("DATABASE_URL","postgresql://synthetic.invalid/mock-only");query.mockResolvedValue([{...row,occurred_at:stamp,recorded_at:stamp}]);
 const r=await loadNeonAdminActivity({principal,source:"audit"});expect(r.events).toHaveLength(1);expect(r.events[0].occurredAt).toBe("2026-10-19T01:00:00.000Z");expect(r.incompleteSources).toEqual([]);
});
it("reports invalid date evidence as incomplete, never1970",async()=>{
 vi.stubEnv("DATABASE_URL","postgresql://synthetic.invalid/mock-only");query.mockResolvedValue([{...row,occurred_at:new Date("invalid"),recorded_at:null}]);
 const r=await loadNeonAdminActivity({principal,source:"audit"});expect(r.events).toEqual([]);expect(r.incompleteSources).toEqual(["audit"]);
});
