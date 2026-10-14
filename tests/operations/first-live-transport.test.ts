// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFirstLiveLeadMonitor, FirstLiveMonitorError, observeFirstLiveMonitor } from "../../src/lib/operations/first-live-lead-monitor";
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe("pinned Neon HTTP monitor transport; no real network",()=>{
  it("uses transaction-local statement timeout and one shared abort signal",async()=>{
    const calls:Array<{body:{queries:Array<{query:string;params:unknown[]}>};signal:AbortSignal}>=[];
    vi.stubGlobal("fetch",vi.fn(async(_url:unknown,init:RequestInit)=>{
      const body=JSON.parse(String(init.body));calls.push({body,signal:init.signal as AbortSignal});
      const empty={fields:[],rows:[],rowCount:0,command:"SELECT"};
      const invariant={fields:[{name:"unsuppressed_qa",dataTypeID:23},{name:"qa_without_explicit_evidence",dataTypeID:23}],rows:[["0","0"]],rowCount:1,command:"SELECT"};
      return Response.json({results:[empty,body.queries[1].query.includes("COUNT(*) FILTER")?invariant:empty]});
    }));
    const report=await createFirstLiveLeadMonitor({DATABASE_URL:"postgresql://synthetic:synthetic@fixture.example.test/synthetic"})!.run();
    expect(report.scanned).toBe(0);expect(calls).toHaveLength(2);
    expect(calls[0].signal).toBe(calls[1].signal);
    for(const call of calls){expect(call.body.queries[0].query).toBe("SELECT set_config('statement_timeout', $1, true)");expect(call.body.queries[0].params[0]).toBe("8000ms");}
  });
  it("a stalled HTTP fetch really aborts; no Promise.race or live work remains",async()=>{
    let active=0;
    vi.stubGlobal("fetch",vi.fn(async(_url:unknown,init:RequestInit)=>{
      active++;try{await new Promise((_,reject)=>init.signal!.addEventListener("abort",()=>reject(new DOMException("aborted","AbortError")),{once:true}));}finally{active--;}
      return Response.json({});
    }));
    const monitor=createFirstLiveLeadMonitor({DATABASE_URL:"postgresql://synthetic:synthetic@fixture.example.test/synthetic"})!;
    await expect(monitor.run({budgetMs:25})).rejects.toMatchObject({stage:"assessment",safeCode:"deadline_exceeded"});
    expect(active).toBe(0);
  });
  it("configuration, unhealthy and SQL errors are distinct; private exception text is never emitted",async()=>{
    const logs=vi.spyOn(console,"error").mockImplementation(()=>{});
    expect(await observeFirstLiveMonitor(null,{},"synthetic-correlation")).toMatchObject({ok:false,error:"monitor_store_not_configured"});
    const failed={run:async()=>{throw new FirstLiveMonitorError("incident_audit","42501");}};
    expect(await observeFirstLiveMonitor(failed as never,{},"synthetic-correlation")).toMatchObject({ok:false,error:"first_live_monitor_failed"});
    expect(JSON.stringify(logs.mock.calls)).toContain("missing_configuration");expect(JSON.stringify(logs.mock.calls)).toContain("execution_error");expect(JSON.stringify(logs.mock.calls)).toContain("42501");
  });
});
