// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ACQUISITION_AGGREGATE_SQL, ACQUISITION_DRIVER, loadAcquisitionReport } from "../../app/lib/persistence/neonAcquisitionReport";
import { ACQUISITION_PLACEMENTS, type AcquisitionWindow } from "../../app/lib/growth/acquisition-window";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
const now = new Date("2026-10-16T12:00:00.000Z");
const window: AcquisitionWindow = { mode: "7", placement: "all", from: "2026-10-09T12:00:00.000Z", to: now.toISOString(), label: "Last 7 days" };
const analyst: LeadCenterPrincipal = { userId: "synthetic", role: "read_only_analyst", agentId: null, email: "synthetic@example.test", name: "Synthetic" };
function rows() { return ["all", ...ACQUISITION_PLACEMENTS.map(p => p.key)].flatMap(key => ["mike", "brandon", "unknown"].map(operator => ({ key, operator, inquiries: "0", contacts: "0", unresolved: "0", envelopes: "0", represented: "0", accepted: "0", delivered: "0", pending: "0", retry: "0", failed: "0", unknown: "0", access_allowed: true, generated_at: now.toISOString(), private_payload: "private-never-project@example.test" }))); }
describe("private acquisition aggregate boundary", () => {
  it("distinguishes an actual measured zero from unavailable and never projects private extras", async () => {
    const report = await loadAcquisitionReport(window, analyst, { query: async () => rows(), now });
    expect(report).toMatchObject({ coverage: "complete", totals: { inquiries: 0, contacts: 0, unresolved: 0 } });
    expect(JSON.stringify(report)).not.toMatch(/private-never|@|private_payload|recipient|contact_id/);
  });
  it.each([null, { ...analyst, role: "approved_agent" as const }])("denies before any database query", async principal => {
    const query = vi.fn(); expect((await loadAcquisitionReport(window, principal, { query, now })).coverage).toBe("unavailable"); expect(query).not.toHaveBeenCalled();
  });
  it("requires an owner assignment scope, leaving analyst aggregates global", async () => {
    const query = vi.fn(async (_text: string, _params: unknown[]) => rows());
    expect((await loadAcquisitionReport(window, { ...analyst, role: "primary_lead_owner" }, { query, now })).coverage).toBe("unavailable");
    expect(query).not.toHaveBeenCalled();
    await loadAcquisitionReport(window, { ...analyst, role: "primary_lead_owner", agentId: "00000000-0000-4000-8000-000000009901" }, { query, now });
    expect(query.mock.calls[0][1][4]).toBe("00000000-0000-4000-8000-000000009901");
  });
  it.each([null, [], {}, [{ invalid: 1 }]])("rejects a missing/malformed result rather than zero", async value => expect((await loadAcquisitionReport(window, analyst, { query: async () => value, now })).coverage).toBe("unavailable"));
  it.each([-1, "NaN", null, 0.5, Number.MAX_SAFE_INTEGER + 1])("fails closed on invalid aggregate counts %s", async value => {
    const valueRows: Record<string, unknown>[] = rows(); valueRows[0].inquiries = value;
    expect((await loadAcquisitionReport(window, analyst, { query: async () => valueRows, now })).totals).toBeNull();
  });
  it("does not call a stale snapshot complete", async () => {
    const oldRows = rows().map(r => ({ ...r, generated_at: "2026-10-16T11:00:00.000Z" }));
    expect(await loadAcquisitionReport(window, analyst, { query: async () => oldRows, now })).toMatchObject({ coverage: "stale", totals: null });
  });
  it("fails closed on row security, timeout, mixed snapshots and missing operators", async () => {
    const denied = rows().map(r => ({ ...r, access_allowed: false }));
    const mixed = rows(); mixed[0].generated_at = "2026-10-16T11:59:59.000Z";
    for (const r of [denied, mixed, rows().slice(1)]) expect((await loadAcquisitionReport(window, analyst, { query: async () => r, now })).coverage).toBe("unavailable");
    expect((await loadAcquisitionReport(window, analyst, { query: async () => { throw new Error("synthetic timeout"); }, now })).totals).toBeNull();
  });
  it("rejects an unvalidated direct caller window before SQL", async () => {
    const query = vi.fn(); await loadAcquisitionReport({ ...window, placement: "injected" } as unknown as AcquisitionWindow, analyst, { query, now }); expect(query).not.toHaveBeenCalled();
  });
  it("keeps parameterized full-cohort aggregates independent of the legacy detail bound", () => {
    expect(ACQUISITION_AGGREGATE_SQL).not.toMatch(/LIMIT\s+5000|jsonb_agg\(.*contact|l\.email|l\.phone|recipient_reference/);
    expect(ACQUISITION_AGGREGATE_SQL).toContain("count(DISTINCT c.contact_id)");
    expect(ACQUISITION_AGGREGATE_SQL).toContain("l.created_at < $2::timestamptz");
    expect(ACQUISITION_AGGREGATE_SQL).not.toContain("consent_email");
    expect(ACQUISITION_AGGREGATE_SQL).not.toContain("duplicate_of_lead_id IS NULL");
  });
  it("identifies the exact validation condition without logging row values, private extras, principal or window", async () => {
    const events: Record<string,unknown>[]=[];
    const malformed=rows();malformed[0].generated_at="untrusted-private-timestamp";
    const r=await loadAcquisitionReport(window,analyst,{query:async()=>malformed,now,onDiagnostic:e=>events.push(e)});
    expect(r.coverage).toBe("unavailable");expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({stage:"validation",condition:"validation:snapshot_parse",aggregateExecution:"response_received",rowCount:12,expectedRows:12,scalarTypes:{generated_at:["string"]}});
    expect(JSON.stringify(events)).not.toMatch(/untrusted-private|private-never|example\.test|2026-10-09|DATABASE_URL|postgres/);
    expect(events[0].correlation).toBe(events[1].correlation);
  });
  it("classifies a transport/SQL timeout without retaining the error message or response", async () => {
    const events:Record<string,unknown>[]=[];
    const error=Object.assign(new Error("private-driver-body and private parameters"),{code:"57014"});
    await loadAcquisitionReport(window,analyst,{query:async()=>{throw error;},now,onDiagnostic:e=>events.push(e)});
    expect(events[1]).toMatchObject({stage:"transport",aggregateExecution:"attempted_unconfirmed",condition:"exception",error:{sqlstate:"57014",statementTimeout:true}});
    expect(events[1].queryMs).toBeTypeOf("number");expect(JSON.stringify(events)).not.toContain("private-driver-body");
  });
  it("records a non-query gate and never turns logging failure into a data-path failure", async () => {
    const events:Record<string,unknown>[]=[];const query=vi.fn();
    await loadAcquisitionReport(window,null,{query,now,onDiagnostic:e=>events.push(e)});
    expect(query).not.toHaveBeenCalled();expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({condition:"gate:permission",aggregateExecution:"not_attempted"});
    expect((await loadAcquisitionReport(window,analyst,{query:async()=>rows(),now,onDiagnostic:()=>{throw Error("logger failure");}})).coverage).toBe("complete");
  });
  it("records a malformed row container explicitly and keeps the driver label pinned to installed source", async () => {
    const events:Record<string,unknown>[]=[];
    await loadAcquisitionReport(window,analyst,{query:async()=>[null],now,onDiagnostic:e=>events.push(e)});
    expect(events.at(-1)).toMatchObject({condition:"result:row_shape"});
    const pkg=JSON.parse(readFileSync("node_modules/@neondatabase/serverless/package.json","utf8"));
    expect(ACQUISITION_DRIVER).toBe(`@neondatabase/serverless@${pkg.version}`);
  });
});
