import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeadQuickOverview } from "../../app/components/admin/LeadQuickOverview";
import { leadCardFixture } from "../../app/lib/leadPresentationFixtures";
import { leadPageHeading, leadRequestLabel } from "../../app/lib/leadReadability";
import { manualContactReviewTarget, type ManualContactReview } from "../../app/lib/manualContactReview";
import { evaluateLeadCommunicationPermission, type LeadPermissionFacts, type StoredPermission } from "../../src/lib/messaging/permission-service";

const view = leadCardFixture({subtype:"seller",tier:"assigned",state:"offered",score:60,isTest:true});
const facts: LeadPermissionFacts = {leadId:"synthetic",isTest:false,suppressed:false,consentEmail:true,consentSms:false,consentCall:true,consentText:null,consentVersion:"synthetic",source:"synthetic",formOrRoute:"/home-value",optedOutEmail:false,optedOutSms:false};
const permission: StoredPermission = {channel:"phone",purpose:"manual_one_to_one",state:"allowed",consentVersion:"synthetic",source:"synthetic",evidenceAt:"2026-10-09T12:00:00Z"};
function snapshot(overrides: Partial<LeadPermissionFacts> = {}, state: StoredPermission["state"] = "allowed"): ManualContactReview {
  return {ok:true,lead:{isTest:Boolean(overrides.isTest),suppressed:Boolean(overrides.suppressed)},manualContact:{canReview:true,terminal:false,phone:"+1 (252) 555-0100",email:"synthetic@example.test"},reviewMatrix:(["phone","email"] as const).map(channel=>({channel,purpose:"manual_one_to_one",decision:evaluateLeadCommunicationPermission({...facts,...overrides},[{...permission,channel,state}],{channel,purpose:"manual_one_to_one",autoSendEnabled:false,humanApproved:false})}))};
}
describe("action-first lead detail",()=>{
  it("uses a short human heading, never the intake text or attribution JSON",()=>{
    expect(leadPageHeading("INTERNAL QA — very long diagnostic payload",true)).toBe("Test lead");
    expect(leadPageHeading("SYNTHETIC REVIEWER")).toBe("SYNTHETIC REVIEWER");
    expect(leadPageHeading(null)).toBe("Lead details");
    expect(leadPageHeading("x".repeat(500)).length).toBe(80);
    expect(leadRequestLabel("renter")).toBe("Rental-to-homeownership plan");
  });
  it("keeps QA contact blocked with a compact overview instead of administrative forms",()=>{
    const html=renderToStaticMarkup(<LeadQuickOverview view={view} leadId="synthetic" request="Home value request" receivedAt="2026-10-02T01:56:00.040Z" blocked canReview status="new"/>);
    expect(html).toContain("TEST — DO NOT CONTACT"); expect(html).toContain("Contact blocked");
    expect(html).toContain("9:56 PM EDT");
    expect(html).not.toMatch(/tel:|mailto:|<form|Attribution:|Saved canonically|Next-action intelligence/);
    expect(html).toContain("Review tasks"); expect(html).toContain("History");
  });
  it("offers native contact only for stored eligible permission and an authorized editor",()=>{
    const review=snapshot();
    expect(review.reviewMatrix?.[0].decision.allowed).toBe(false); // Human review is still required.
    expect(manualContactReviewTarget(review,"phone")).toBe("tel:+12525550100");
    expect(manualContactReviewTarget(review,"email")).toBe("mailto:synthetic@example.test");
    expect(manualContactReviewTarget({...review,manualContact:{...review.manualContact!,canReview:false}},"phone")).toBeNull();
    expect(manualContactReviewTarget({...review,manualContact:{...review.manualContact!,terminal:true}},"phone")).toBeNull();
    expect(manualContactReviewTarget({...review,ok:false},"phone")).toBeNull();
  });
  it.each(["denied","ambiguous","held","opted_out"] as const)("fails closed for %s",state=>{
    const review=snapshot({},state);
    expect(manualContactReviewTarget(review,"phone")).toBeNull(); expect(manualContactReviewTarget(review,"email")).toBeNull();
  });
  it("does not treat contact values or broad consent as a purpose-specific grant",()=>{
    for (const overrides of [{isTest:true},{suppressed:true},{optedOutEmail:true}]) {
      expect(manualContactReviewTarget(snapshot(overrides),overrides.optedOutEmail?"email":"phone")).toBeNull();
    }
    const review=snapshot(); review.reviewMatrix=[{channel:"phone",purpose:"manual_one_to_one",decision:evaluateLeadCommunicationPermission(facts,[],{channel:"phone",purpose:"manual_one_to_one",humanApproved:false})}];
    expect(manualContactReviewTarget(review,"phone")).toBeNull();
  });
  it("rejects URI injection and malformed destinations",()=>{
    const review=snapshot();
    for(const value of ["x@example.test?bcc=other@example.test","x@example.test\r\nBCC:other@example.test","javascript:alert(1)"]) expect(manualContactReviewTarget({...review,manualContact:{...review.manualContact!,email:value}},"email")).toBeNull();
    for(const value of ["+1+2525550100","tel:12525550100","12"]) expect(manualContactReviewTarget({...review,manualContact:{...review.manualContact!,phone:value}},"phone")).toBeNull();
  });
});
