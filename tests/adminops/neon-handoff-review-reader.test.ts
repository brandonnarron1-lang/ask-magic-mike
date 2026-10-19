import {afterEach,describe,expect,it,vi} from "vitest";
const {query}=vi.hoisted(()=>({query:vi.fn()}));
vi.mock("@neondatabase/serverless",()=>({neon:()=>({query})}));
import {loadNeonAdminLeadDetail} from "../../app/lib/persistence/neonAdminLeadView";
import type {LeadCenterPrincipal} from "../../src/lib/admin/rbac-policy";

const original=process.env.DATABASE_URL;
const leadId="00000000-0000-4000-8000-000000000002";
const principal:LeadCenterPrincipal={userId:"synthetic",role:"administrator",agentId:null,email:"synthetic@example.test",name:"Synthetic"};
const row={id:leadId,draft_key:leadId,version:3,artifact_type:"lead_summary",purpose:"lead_summary",status:"approved",content:"SYNTHETIC brief; no contact",content_hash:"a".repeat(64),source_fingerprint:"b".repeat(64),model:"none",created_by:"synthetic",schema_version:"amm.r2.workers.v1",evidence_references:["https://example.test/source"],missing_facts:[],limitations:[]};
afterEach(()=>{if(original===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=original;query.mockReset();});
describe("Neon review read model timestamp round trip (synthetic query projection only)",()=>{
  it.each(["Date","JSON"])("retains approved handoff and schema version with %s timestamps",async kind=>{
    process.env.DATABASE_URL="postgresql://synthetic.invalid/mock-only";
    const timestamp=kind==="Date"?new Date("2026-10-18T16:00:00Z"):"2026-10-18T16:00:00.000Z";
    query.mockImplementation(async(sql:string)=>sql.includes("FROM public.ai_draft_reviews")?[{...row,created_at:timestamp,updated_at:timestamp,reviewed_at:timestamp}]:sql.includes("SELECT l.*")?[{id:leadId,status:"new",created_at:timestamp}]:[]);
    const result=await loadNeonAdminLeadDetail(leadId,principal);
    expect(result.aiDrafts).toHaveLength(1);
    expect(result.aiDrafts![0]).toMatchObject({status:"approved",version:3,schema_version:"amm.r2.workers.v1",created_at:"2026-10-18T16:00:00.000Z",reviewed_at:"2026-10-18T16:00:00.000Z"});
  });
  it("does not turn malformed timestamps into a usable saved review",async()=>{
    process.env.DATABASE_URL="postgresql://synthetic.invalid/mock-only";
    query.mockImplementation(async(sql:string)=>sql.includes("FROM public.ai_draft_reviews")?[{...row,created_at:new Date("invalid"),updated_at:"missing"}]:sql.includes("SELECT l.*")?[{id:leadId,status:"new"}]:[]);
    expect((await loadNeonAdminLeadDetail(leadId,principal)).aiDrafts).toEqual([]);
  });
});
