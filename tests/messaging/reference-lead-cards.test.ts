import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync,readFileSync } from "node:fs";
import { leadCardFixture } from "../../app/lib/leadPresentationFixtures";
import { LEAD_MODULES, lockScreenPresentation, presentLead, type LeadSubtype } from "../../app/lib/leadPresentation";
import { renderLeadCategorySvg, renderLeadOfferEmail, renderLeadOfferSms } from "../../app/lib/leadOfferRenderers";
import { smsEncodingEstimate } from "../../src/lib/messaging/sms-policy";
import { normalizeAdminLeadRow } from "../../app/lib/persistence/supabase/adminLeadView";

describe("reference lead cards — no send", () => {
  it("keeps diagnostic JSON out of the operator summary without altering the canonical record", () => {
    const question = 'Question: INTERNAL QA — DO NOT CONTACT\nAttribution: {"source":"ourtownproperties"}';
    const lead = normalizeAdminLeadRow({id:"00000000-0000-4000-8000-000000000002", assigned_agent_id:"00000000-0000-4000-8000-000000000001", question_raw:question, timeline_months:0, source:"ourtownproperties"});
    const view = presentLead({lead,tier:"assigned",principal:{userId:"fixture",name:"SYNTHETIC",email:"synthetic@example.test",role:"approved_agent",agentId:lead.assigned_agent_id}});
    expect(view.identity?.question).toBe("Question: INTERNAL QA — DO NOT CONTACT");
    expect(view.source).toBe("Our Town Properties website");
    expect(view.timeline).toBe("Immediate / within 30 days");
    expect(lead.question).toBe(question);
  });
  for (const subtype of Object.keys(LEAD_MODULES) as LeadSubtype[]) {
    it(`${subtype}: one snapshot, accessible facts, no private transport data`, () => {
      const view = leadCardFixture({ subtype, tier: "assigned", state: "offered", score: 84, isTest: true });
      const email = renderLeadOfferEmail(view);
      const sms = renderLeadOfferSms(view, "K7M2Q8HJ");
      expect(email.subject.startsWith("[TEST]")).toBe(true);
      expect(email.text).toContain(view.offer!.id);
      expect(sms.text).toContain(view.offer!.id);
      expect(sms.text).toContain("CLAIM K7M2Q8HJ");
      expect(sms.text).toContain("STOP"); expect(sms.text).toContain("HELP");
      for (const text of [email.html, email.subject, email.preheader, email.text, sms.text, JSON.stringify(lockScreenPresentation(view))]) {
        expect(text).not.toContain("synthetic@example.test");
        expect(text).not.toContain("Please review the appropriate evidence");
      }
      expect(email.html).not.toMatch(/<script|backdrop-filter|display:grid/);
      expect(new TextEncoder().encode(email.html).length).toBeLessThan(40000);
      expect(renderLeadCategorySvg(subtype)).not.toContain(view.reference);
      expect(renderLeadCategorySvg(subtype)).not.toContain("K7M2Q8HJ");
    });
  }
  it("preclaim cannot serialize contact identity; copied audit recipient has no claim action", () => {
    const view = leadCardFixture({ subtype: "buyer", tier: "pre_claim", state: "offered", score: 42, isTest: false });
    expect(view.priority).toBe("NEW"); expect(view.identity).toBeUndefined();
    const audit = leadCardFixture({ subtype: "buyer", tier: "audit", state: "offered", score: 84, isTest: true });
    expect(audit.offer).toBeUndefined(); expect(audit.actions).toEqual([]);
  });
  it("unassigned and analyst viewers fail closed, even requesting assigned tier", () => {
    const lead = normalizeAdminLeadRow({ id: "00000000-0000-4000-8000-000000000002", first_name: "PRIVATE" });
    expect(() => presentLead({ lead, tier: "assigned", principal: { userId: "x", email: "x@example.test", name: "x", role: "read_only_analyst", agentId: null } })).toThrow("forbidden");
  });
  it("expired/accepted messages never advertise a live claim code", () => {
    for (const state of ["expired", "accepted", "claimed_elsewhere", "paused", "blocked", "failed_delivery", "missing_data"] as const) {
      const view = leadCardFixture({ subtype: "routing", tier: "pre_claim", state, score: 42, isTest: true });
      expect(renderLeadOfferSms(view, "K7M2Q8HJ").text).not.toContain("CLAIM K7M2Q8HJ");
    }
  });
  it("GSM extension table and non-BMP Unicode count correctly", () => {
    expect(smsEncodingEstimate("é£Δ").encoding).toBe("GSM-7");
    expect(smsEncodingEstimate("{}€^").units).toBe(8);
    expect(smsEncodingEstimate("😀").units).toBe(2);
    expect(smsEncodingEstimate("😀".repeat(36)).segments).toBe(2);
  });
  it("known financing remains self-reported, not a verified preapproval claim",()=>{
    const lead=normalizeAdminLeadRow({id:"00000000-0000-4000-8000-000000000002",assigned_agent_id:"00000000-0000-4000-8000-000000000001",preapproval:true,financing:"Conventional"});
    const view=presentLead({lead,tier:"assigned",principal:{userId:"fixture",name:"SYNTHETIC",email:"synthetic@example.test",role:"approved_agent",agentId:lead.assigned_agent_id}});
    expect(view.financing).toBe("Self-reported: Conventional — verify evidence");
    expect(lockScreenPresentation(view).financing).toBe("Private in Lead Center");
  });
  it("deterministic master and fetchable category JPEG meet measured size targets", async () => {
    const nextRequire = createRequire(require.resolve("next/package.json"));
    const sharp = nextRequire("sharp") as (input: Buffer) => { png(): { toBuffer(): Promise<Buffer> }; resize(w:number,h:number): { jpeg(options:object): { toBuffer():Promise<Buffer> } }; metadata():Promise<{width?:number;height?:number;exif?:unknown}> };
    for (const subtype of Object.keys(LEAD_MODULES) as LeadSubtype[]) {
      const svg = Buffer.from(renderLeadCategorySvg(subtype,`data:image/png;base64,${readFileSync("public/images/ask-magic-mike/brand-pack-v2/our-town-logo-clean.png").toString("base64")}`));
      const master = await sharp(svg).png().toBuffer();
      const media = await sharp(svg).resize(720, 900).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
      expect((await sharp(master).metadata()).width).toBe(1080);
      expect((await sharp(master).metadata()).height).toBe(1350);
      expect(media.length).toBeLessThan(300000);
      expect((await sharp(media).metadata()).exif).toBeUndefined();
      if (process.env.AMM_RENDER_ALLOCATION_ARTWORK === "1") {
        mkdirSync("output/reference-allocation", { recursive: true });
        writeFileSync(`output/reference-allocation/${subtype}-master.png`, master);
        writeFileSync(`public/images/ask-magic-mike/notifications/allocation-${LEAD_MODULES[subtype].media}-v1.jpg`, media);
      }
    }
  });
});
