// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { signalOperator } from "../../src/lib/social/operator-signal";
import { checkpointIncidents } from "../../src/lib/social/operations";

const repository="brandonnarron1-lang/ask-magic-mike";
const now=new Date("2026-11-03T02:00:00Z");
const incidents=checkpointIncidents([],[{code:"unresolved_provider_result",channelId:"synthetic-instagram"}],now).incidents;
function fixture(){
  let issue: {number:number;title:string;body:string;state:string;html_url:string}|undefined;
  let ambiguous=false;
  const transport=vi.fn(async(url,options)=>{
    const method=options?.method||"GET", value=options?.body?JSON.parse(String(options.body)):{};
    expect(String(url)).toMatch(/^https:\/\/api\.github\.com\/repos\/brandonnarron1-lang\/ask-magic-mike\/issues/);
    if(method==="POST"){
      expect(value.assignees).toEqual(["brandonnarron1-lang"]);
      issue={number:321,title:value.title,body:value.body,state:"open",html_url:`https://github.com/${repository}/issues/321`};
      if(ambiguous)throw Error("timeout after commit");
      return Response.json(issue);
    }
    if(method==="PATCH"){issue={...issue!,...value};return Response.json(issue);}
    return Response.json(String(url).includes("?state=")?(issue?[issue]:[]):issue);
  }) as ReturnType<typeof vi.fn> & typeof fetch;
  return {transport,ambiguous:()=>{ambiguous=true;},changeReadback:()=>{issue!.state="closed";},writes:()=>transport.mock.calls.filter(([,o])=>o?.method==="POST"||o?.method==="PATCH").length};
}
describe("Owned publisher operator signal, mocked GitHub only",()=>{
  it("creates and reads back one assigned issue, then suppresses unchanged holds even if the ledger was unavailable",async()=>{
    const f=fixture();const options={token:"synthetic",repository,incidents,transport:f.transport};
    expect((await signalOperator(options)).status).toBe("CREATED");
    const later=checkpointIncidents([],[{code:incidents[0].code,channelId:incidents[0].channelId}],new Date(+now+86400_000)).incidents;
    expect((await signalOperator({...options,incidents:later})).status).toBe("UNCHANGED");expect(f.writes()).toBe(1);
  });
  it("reconciles an ambiguous issue creation before considering another external effect",async()=>{
    const f=fixture();f.ambiguous();const o={token:"synthetic",repository,incidents,transport:f.transport};
    await expect(signalOperator(o)).rejects.toThrow("timeout");
    expect((await signalOperator(o)).status).toBe("UNCHANGED");expect(f.writes()).toBe(1);
  });
  it("updates only meaningful resolution/recurrence, never daily comments",async()=>{
    const f=fixture();const o={token:"synthetic",repository,incidents,transport:f.transport};
    await signalOperator(o);expect((await signalOperator({...o,incidents:[]})).status).toBe("UPDATED");
    expect((await signalOperator({...o,incidents:[]})).status).toBe("UNCHANGED");
    expect((await signalOperator(o)).status).toBe("UPDATED");expect(f.writes()).toBe(3);
    expect(f.transport.mock.calls.every(([url])=>!String(url).includes("comments"))).toBe(true);
  });
  it("a queue-full deferral creates no issue",async()=>{const f=fixture();expect((await signalOperator({token:"synthetic",repository,incidents:[],transport:f.transport})).status).toBe("NO_INCIDENT");expect(f.writes()).toBe(0);});
  it.each([401,403,429,500])("does not retry an unauthorized/failed signal HTTP %i",async status=>{const transport=vi.fn(async()=>new Response("{}",{status}));await expect(signalOperator({token:"synthetic",repository,incidents,transport})).rejects.toThrow("unconfirmed");expect(transport).toHaveBeenCalledTimes(1);});
  it("fails closed on incomplete issue inventory rather than posting a duplicate",async()=>{const transport=vi.fn(async()=>Response.json([],{headers:{link:'<https://api.github.com/next>; rel="next"'}}));await expect(signalOperator({token:"synthetic",repository,incidents,transport})).rejects.toThrow("inventory_incomplete");expect(transport).toHaveBeenCalledTimes(5);});
  it("rejects a different repo or private data without a request",async()=>{const transport=vi.fn();await expect(signalOperator({token:"synthetic",repository:"other/project",incidents,transport})).rejects.toThrow("binding_invalid");await expect(signalOperator({token:"synthetic",repository,incidents:[{...incidents[0],code:"secret@example.test"}],transport})).rejects.toThrow("private_payload");expect(transport).not.toHaveBeenCalled();});
});
