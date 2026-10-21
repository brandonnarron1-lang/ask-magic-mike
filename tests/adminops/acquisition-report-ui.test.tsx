import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AcquisitionReport } from "../../app/admin/distribution/AcquisitionReport";
import { ACQUISITION_PLACEMENTS } from "../../app/lib/growth/acquisition-window";
import type { AcquisitionReport as Report } from "../../app/lib/persistence/neonAcquisitionReport";
const now=new Date("2026-10-16T12:00:00.000Z");
const ledger={configured:true,schemaReady:true,generatedAt:now.toISOString(),proofs:[]};
const op={inquiriesWithEnvelope:1,noV6Recorded:10000,envelopes:1,providerAccepted:1,delivered:0,pending:0,retry:0,failed:0,unknown:1};
const counts={inquiries:10001,contacts:2300,unresolved:909,unknownOperatorEnvelopes:0,mike:op,brandon:{...op,delivered:1,unknown:0}};
const report:Report={coverage:"complete",scope:"all_eligible",window:{mode:"7",placement:"all",from:"2026-10-09T12:00:00.000Z",to:now.toISOString(),label:"Last 7 days"},generatedAt:now.toISOString(),totals:counts,placements:ACQUISITION_PLACEMENTS.map(p=>({key:p.key,counts}))};
describe("compact protected acquisition UI",()=>{
  it("shows exact counts, global distinctness, offset window and separate evidence stages",()=>{
    const html=renderToStaticMarkup(<AcquisitionReport report={report} ledger={ledger} filters={{}} now={now}/>);
    const d=new DOMParser().parseFromString(html,"text/html");
    expect(d.body.textContent).toContain("Globally distinct recorded contacts");expect(d.body.textContent).toContain("Unresolved contact linkage");
    expect(d.body.textContent).toContain("COMPLETE");expect(d.body.textContent).toContain("America/New_York");
    expect(d.body.textContent).toContain("not historical as-of delivery");expect(d.body.textContent).toContain("row contact counts must not be summed");
    expect(d.querySelectorAll("tbody tr")).toHaveLength(3);expect(d.body.textContent).toContain("five entry choices");
    expect(d.body.textContent).toContain("1 provider accepted · 0 recipient-server delivered");
    expect(d.body.textContent).toContain("Mailbox receipt: not observed");
    expect(d.querySelector("form")!.method).toBe("get");expect(d.querySelector('option[value="baseline"]')!.hasAttribute("disabled")).toBe(true);
    expect(html).not.toMatch(/tel:|mailto:|\/admin\/leads\/|provider_message_id|contact_id|@example/);
  });
  it("does not label missing data zero or echo invalid contact-like date input",()=>{
    const html=renderToStaticMarkup(<AcquisitionReport report={{...report,coverage:"unavailable",reason:"Database unavailable",totals:null,placements:[],generatedAt:null}} ledger={ledger} filters={{from:"private@example.test"}} now={now}/>);
    expect(html).toContain("UNAVAILABLE");expect(html).not.toContain("private@example.test");expect(html).not.toContain("10001");
  });
  it("exposes invalid-filter correction without a success or complete result",()=>{
    const html=renderToStaticMarkup(<AcquisitionReport report={null} error="Choose a supported window" ledger={ledger} filters={{}} now={now}/>);
    expect(html).toContain('role="alert"');expect(html).toContain("No aggregate query was executed");expect(html).not.toContain("COMPLETE");
  });
  it("separates all eligible sources from unchanged historic totals, filters and delivery grains",()=>{
    const summary={totals:{...counts,inquiries:12000,contacts:2700},sources:(["social","direct","other","unknown"] as const).map(key=>({key,counts:{...counts,inquiries:3000}}))};
    const d=new DOMParser().parseFromString(renderToStaticMarkup(<AcquisitionReport report={{...report,allSources:summary}} ledger={ledger} filters={{placement:ACQUISITION_PLACEMENTS[0].key}} now={now}/>),"text/html");
    const section=d.querySelector('[aria-labelledby="all-sources-heading"]')!;
    expect(section.textContent).toContain("12000 eligible inquiries");expect(section.textContent).toContain("2700 globally distinct recorded contacts");
    expect(section.querySelectorAll("article > h4")).toHaveLength(4);
    expect(section.textContent).toContain("placement selector filters only that historic three-tag report");
    expect(section.textContent).toContain("Missing/unknown attribution stays Unknown, not Direct");
    expect(section.textContent).toContain("do not sum row contact counts");expect(section.textContent).toContain("Mailbox receipt: not observed");
    expect(d.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(d.querySelector('[aria-label="Exact acquisition summary"]')?.textContent).toContain("10001");
    expect(d.querySelectorAll('select[name="acq_placement"] option')).toHaveLength(4);
  });
  it.each(["unavailable","stale"] as const)("never renders a stale or unavailable source summary as measured counts: %s",coverage=>{
    const html=renderToStaticMarkup(<AcquisitionReport report={{...report,coverage,totals:null,placements:[],allSources:{totals:counts,sources:[]}}} ledger={ledger} filters={{}} now={now}/>);
    expect(html).toContain("All-source summary unavailable; no zero is inferred");expect(html).not.toContain("10001");
  });
});
