import { describe, expect, it } from "vitest";
import { LEAD_CONSENT_LANGUAGE_TEXT as copy } from "../../app/lib/leadConsent";
import { projectManualRequestPermissions, type RequestConsentRecord } from "../../src/lib/messaging/request-contact-permission";
import { evaluateLeadCommunicationPermission, type LeadPermissionFacts, type StoredPermission } from "../../src/lib/messaging/permission-service";
const id="11111111-1111-4111-8111-111111111111",at="2026-10-30T12:00:00.000Z";
const lead:LeadPermissionFacts={leadId:id,isTest:false,suppressed:false,consentEmail:true,consentCall:true,consentSms:false,consentText:copy,consentVersion:"amm_contact_v2",source:"synthetic",formOrRoute:"/home-value",optedOutEmail:false,optedOutSms:false};
const row=(type="email"):RequestConsentRecord=>({lead_id:id,consent_type:type,granted:true,language_version:"amm_contact_v2",language_text:copy,collected_at:at});
const projection=(changes:Partial<LeadPermissionFacts>={},records=[row(),row("call")],stored:StoredPermission[]=[])=>projectManualRequestPermissions({...lead,...changes},stored,records,at);
describe("inquiry-specific manual request evidence (read only)",()=>{
  it("projects only manual email/call from exact immutable canonical evidence",()=>{
    const input=[row(),row("call")];const original=JSON.stringify(input);const rows=projection({},input);
    expect(rows.map(r=>[r.channel,r.purpose,r.evidenceKind])).toEqual([["email","manual_one_to_one","canonical_request_consent"],["phone","manual_one_to_one","canonical_request_consent"]]);
    expect(JSON.stringify(input)).toBe(original);
    const d=evaluateLeadCommunicationPermission(lead,rows,{channel:"email",purpose:"manual_one_to_one",autoSendEnabled:false});
    expect(d).toMatchObject({allowed:false,requiresHumanApproval:true,code:"auto_send_disabled",decisionSource:"canonical_request_consent"});
  });
  it.each(["transactional_acknowledgment","requested_service_response","appointment_coordination","property_alert_subscription","marketing_nurture"] as const)("does not widen to %s",purpose=>{
    expect(evaluateLeadCommunicationPermission(lead,projection(),{channel:"email",purpose,humanApproved:true,autoSendEnabled:true}).allowed).toBe(false);
  });
  it("does not infer SMS even from a forged broad flag",()=>{
    const l={...lead,consentSms:true};expect(evaluateLeadCommunicationPermission(l,projection({consentSms:true}),{channel:"sms",purpose:"manual_one_to_one",humanApproved:true}).allowed).toBe(false);
  });
  it.each(["denied","held","ambiguous","opted_out","allowed"] as const)("preserves an explicit manual %s decision",state=>{
    const p:StoredPermission={channel:"email",purpose:"manual_one_to_one",state,consentVersion:"old",source:"explicit",evidenceAt:at};
    const rows=projection({},[row(),row("call")],[p]);expect(rows.filter(r=>r.channel==='email')).toEqual([p]);
  });
  it.each([{isTest:true},{suppressed:true},{consentVersion:null},{consentText:null},{consentText:"different copy"}])("fails closed for missing/ineligible lead evidence %j",changes=>expect(projection(changes)).toHaveLength(0));
  it.each([
    [],[{...row(),lead_id:"other-inquiry"}],[{...row(),granted:false}],[{...row(),language_version:"unknown"}],
    [{...row(),language_text:"unknown"}],[{...row(),collected_at:"invalid"}],[{...row(),collected_at:"2026-10-29T12:00:00Z"}],[row(),row()],
  ].map(records=>({records})))("does not infer email from missing, conflicting, other-inquiry or altered consent %j",({records})=>expect(projection({},records).filter(r=>r.channel==='email')).toHaveLength(0));
  it("does not treat a declined email flag as a grant or block an independent recorded call",()=>expect(projection({consentEmail:false}).map(r=>r.channel)).toEqual(['phone']));
  it("honors current channel opt-out after evidence projection",()=>expect(evaluateLeadCommunicationPermission({...lead,optedOutEmail:true},projection(),{channel:'email',purpose:'manual_one_to_one',humanApproved:true}).code).toBe('channel_opt_out'));
  it("does not reinterpret another-purpose denial or grant marketing",()=>{
    const p:StoredPermission={channel:'email',purpose:'marketing_nurture',state:'denied',consentVersion:null,source:'synthetic',evidenceAt:at};
    const rows=projection({},[row()],[p]);expect(rows[0]).toEqual(p);expect(evaluateLeadCommunicationPermission(lead,rows,{channel:'email',purpose:'marketing_nurture',humanApproved:true}).code).toBe('consent_denied');
  });
  it("rejects invalid/future collection times",()=>{
    for(const time of [null,'invalid','2099-01-01T00:00:00Z'])expect(projectManualRequestPermissions(lead,[],[row()],time)).toHaveLength(0);
  });
});
