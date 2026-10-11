import { describe, expect, it } from "vitest";
import { renderReadableLeadAlert } from "../../app/lib/leadAlertReadableTemplate";
import { renderCompactLeadAlert } from "../../app/lib/leadAlertCompactTemplate";
import { COMPACT_LEAD_ALERT_TEMPLATE_VERSION, LEAD_ALERT_TEMPLATE_VERSION, renderLeadAlert, renderLeadAlertForTemplateVersion, type LeadAlertRenderInput } from "../../app/lib/leadAlertTemplates";

const fixture: LeadAlertRenderInput = {
  leadId:"00000000-0000-4000-8000-000000000001",sessionId:"00000000-0000-4000-8000-000000000002",correlationId:"00000000-0000-4000-8000-000000000003",
  payload:{funnel_type:"renter",lead_type:"renter",lead_source_surface:"renter_page",name:"SYNTHETIC REVIEWER",city:"Wilson",email:"private@example.test",phone:"+12025550199",address:"1 Synthetic Street",timeline:"3",consent_email:true,consent_sms:false,consent_call:false,consent_language_version:"synthetic_v1",attribution:{source:"ourtownproperties",medium:"owned_media",campaign:"website_widget",first_touch:{source:"synthetic"}},status:"new",assigned_agent_id:null},
  score:{score:60,grade:"active",version:"deterministic_v1",factors:[],explanation:"Synthetic only"},routing:{owner:"mike",intentLabel:"Rental-to-homeownership",sourceLabel:"ourtownproperties",routingReason:"synthetic"},submittedAt:"2026-10-10T12:00:00Z",
};
describe("compact future v5 (pure render, no provider)",()=>{
  it("keeps generation and the approved one-copy key pinned to v4 while adding a distinct reader",()=>{
    expect(LEAD_ALERT_TEMPLATE_VERSION).toBe("lead_alert_email_v4");
    expect(COMPACT_LEAD_ALERT_TEMPLATE_VERSION).toBe("lead_alert_email_v5");
    expect(renderLeadAlert(fixture)).toEqual(renderReadableLeadAlert(fixture));
    expect(renderLeadAlertForTemplateVersion(fixture,"lead_alert_email_v4")).toEqual(renderReadableLeadAlert(fixture));
    expect(renderLeadAlertForTemplateVersion(fixture,COMPACT_LEAD_ALERT_TEMPLATE_VERSION)).toEqual(renderCompactLeadAlert(fixture));
  });
  it.each(["lead_alert_email_v1","lead_alert_email_v2","lead_alert_email_v3"])("retains %s queued rendering rather than compacting its history",version=>{
    const old=renderLeadAlertForTemplateVersion(fixture,version)!;expect(old.text).toContain("First touch:");expect(old.text).toContain(fixture.correlationId);
  });
  it("puts an identity-free subject then the bare main-record link on text lines 1 and 2",()=>{
    const email=renderCompactLeadAlert({...fixture,routing:{...fixture.routing,intentLabel:"private@example.test",sourceLabel:"private@example.test"}});
    expect(email.text.split("\n")[0]).toBe(email.subject);
    expect(email.text.split("\n")[1]).toBe(`Open saved lead: https://www.askmagicmike.com/admin/leads/${fixture.leadId}`);
    for(const value of ["SYNTHETIC REVIEWER","private@example.test","+12025550199","1 Synthetic Street",fixture.correlationId]) expect(email.subject).not.toContain(value);
    expect(email.text).toContain("Source needs review in Lead Center");
    expect(email.html).not.toContain("Your three-step walkthrough");expect(email.html.match(/<a /g)).toHaveLength(1);
  });
  it("does not expand contact/address disclosure, change Reply-To projection, or invent lifecycle evidence",()=>{
    const email=renderCompactLeadAlert(fixture);
    for(const value of [fixture.payload.email!,fixture.payload.phone!,fixture.payload.address!,fixture.sessionId,fixture.correlationId,"First touch:","website_widget"]) {expect(email.html).not.toContain(value);expect(email.text).not.toContain(value);}
    expect(email.safeEmail).toBe(renderReadableLeadAlert(fixture).safeEmail);expect(email.safePhone).toBe(renderReadableLeadAlert(fixture).safePhone);
    expect(email.text).toContain("Priority: Medium");expect(email.html).not.toMatch(/>Active<|Email sent|Contacted|Booked/);
  });
  it("preserves newer inquiry context while linking only to its canonical record",()=>{
    const id="00000000-0000-4000-8000-000000000099";const email=renderCompactLeadAlert({...fixture,duplicateOfLeadId:id});
    expect(email.html).toContain(`/admin/leads/${id}`);expect(email.html).not.toContain(fixture.leadId);expect(email.text).toContain("not a new assignment");
  });
  it("escapes long untrusted summary values and keeps QA unmistakably suppressed",()=>{
    const email=renderCompactLeadAlert({...fixture,payload:{...fixture.payload,is_test:true,name:"<script>synthetic</script>",city:"Élm City & Wilson"}});
    expect(email.html).not.toContain("<script>");expect(email.html).toContain("&lt;script&gt;");expect(email.html).toContain("Élm City &amp; Wilson");expect(email.subject).toMatch(/^\[TEST\]/);expect(email.text).toContain("DO NOT CONTACT");
    expect(renderLeadAlertForTemplateVersion(fixture,"unrecognized")).toBeNull();
  });
});
