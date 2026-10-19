import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {Phase6CopilotPanel} from "../../src/components/admin/phase6-copilot-panel";
import {LeadContactDisclosure} from "../../app/components/admin/LeadContactDisclosure";

const leadId="00000000-0000-4000-8000-000000000002";
const draft={id:leadId,draft_key:leadId,version:1,artifact_type:"lead_summary",channel:null,purpose:"internal_review",status:"generated",content:"SYNTHETIC handoff; not scheduled.",content_hash:"a".repeat(64),source_fingerprint:"b".repeat(64),evidence_references:["https://example.test/source"],missing_facts:["Timeframe"],limitations:["Not permission to contact"],model:"none",created_by:"synthetic",reviewed_by:null,reviewed_at:null,created_at:"2026-10-18T16:00:00Z",updated_at:"2026-10-18T16:00:00Z",schema_version:"amm.r2.workers.v1"};
const panel=(props:Partial<Parameters<typeof Phase6CopilotPanel>[0]>={})=><Phase6CopilotPanel leadId={leadId} isTest={false} suppressed={false} canPrepareHandoff {...props}/>;
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("handoff panel synthetic component responses (not session/SQL proof)",()=>{
  it("does not generate on render;explicit handoff uses only the existing endpoint",async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json({ok:true,draft,modelCalls:0}));vi.stubGlobal("fetch",fetch);
    render(panel());expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Prepare handoff review"}));
    await screen.findByRole("status");expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual(["/api/admin/copilot",expect.objectContaining({method:"POST",body:JSON.stringify({leadId,artifactType:"lead_summary",mode:"reviewed_handoff"})})]);
    expect(screen.getByRole("textbox")).toHaveValue(draft.content);
  });
  it.each([{isTest:true},{suppressed:true}])("keeps QA/suppressed preparation disabled: %j",props=>{
    const fetch=vi.fn();vi.stubGlobal("fetch",fetch);render(panel(props));
    expect(screen.getByRole("button",{name:"Prepare handoff review"})).toBeDisabled();expect(fetch).not.toHaveBeenCalled();
  });
  it("does not offer preparation without server-derived maintenance permission",()=>{
    render(panel({canPrepareHandoff:false}));expect(screen.queryByRole("button",{name:"Prepare handoff review"})).not.toBeInTheDocument();
  });
  it.each([401,403,404])("clears stale contact workspace after refreshed %s",async status=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({ok:false,error:"denied"},{status})));
    render(<LeadContactDisclosure leadId={leadId}><p>synthetic@example.test</p>{panel()}</LeadContactDisclosure>);
    fireEvent.click(screen.getByRole("button",{name:"Prepare handoff review"}));
    await screen.findByRole("status",{name:"Lead access unavailable"});expect(screen.queryByText("synthetic@example.test")).not.toBeInTheDocument();
  });
  it("retains approval truth on reload and removes approval after an expired response",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({ok:false,error:"stale_draft_facts",expired:true,version:2,status:"expired"},{status:409})));
    render(panel({initialDrafts:[draft]}));fireEvent.click(screen.getByRole("button",{name:"Approve draft"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("draft was expired");
    expect(screen.queryByRole("button",{name:"Approve draft"})).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("expired");
  });
  it.each([401,403,404])("clears the workspace when review loses access with %s",async status=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({ok:false,error:"denied"},{status})));
    render(<LeadContactDisclosure leadId={leadId}><p>synthetic@example.test</p>{panel({initialDrafts:[draft]})}</LeadContactDisclosure>);
    fireEvent.click(screen.getByRole("button",{name:"Approve draft"}));
    await screen.findByRole("status",{name:"Lead access unavailable"});
    expect(screen.queryByText("synthetic@example.test")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("an approved saved brief never claims a message or appointment was executed",()=>{
    render(panel({initialDrafts:[{...draft,status:"approved",version:2}]}));
    expect(screen.getByRole("status")).toHaveTextContent("approved. Approval does not send or schedule anything.");
    expect(screen.queryByRole("button",{name:"Approve draft"})).not.toBeInTheDocument();
  });
});
