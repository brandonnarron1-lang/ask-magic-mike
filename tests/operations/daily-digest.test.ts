// @vitest-environment node
import {describe,expect,it,vi} from "vitest";
import {ResendEmailNotificationProvider} from "../../app/lib/leadNotificationProvider";
import {readLaunchCallbackCorrelation} from "../../app/lib/launchCallbackCorrelation";
import {digestPeriods,digestKey,digestDisposition,renderDailyDigest,verifiedDigestRecipient} from "../../app/lib/operations/dailyDigest";
import {TRAFFIC_METRICS,type TrafficMetrics} from "../../app/lib/persistence/neonTrafficReport";
describe("daily digest period and send boundaries",()=>{
  it("uses the previous Eastern day, honors spring/fall DST and waits until 8am",()=>{
    expect(digestPeriods("2026-11-03T17:00Z",new Date("2026-11-04T12:59Z"))).toEqual([]);
    const spring=digestPeriods("2026-03-08T12:00Z",new Date("2026-03-09T12:00Z"))[0];
    expect(spring.from).toBe("2026-03-08T05:00:00.000Z"); expect(spring.to).toBe("2026-03-09T04:00:00.000Z");
    const fall=digestPeriods("2026-11-01T12:00Z",new Date("2026-11-02T13:00Z"))[0];
    expect(Date.parse(fall.to)-Date.parse(fall.from)).toBe(25*3600000);
  });
  it("bounds catch-up and keeps retry identity independent of template version",()=>{
    expect(digestPeriods("2026-01-01",new Date("2026-11-04T13:00Z"))).toHaveLength(7);
    expect(digestKey("operator","2026-11-03T05:00Z")).toBe(digestKey("operator","2026-11-03T05:00Z"));
    expect(digestKey("other","2026-11-03T05:00Z")).not.toBe(digestKey("operator","2026-11-03T05:00Z"));
  });
  it("holds unknown acceptance and bounds safe retries",()=>{
    expect(digestDisposition({ok:false,provider:"mock",retryable:true,ambiguous:true,errorCode:"timeout",errorSummary:""},1)).toBe("unknown");
    expect(digestDisposition({ok:false,provider:"mock",retryable:true,errorCode:"429",errorSummary:""},1)).toBe("retry");
    expect(digestDisposition({ok:false,provider:"mock",retryable:true,errorCode:"429",errorSummary:""},3)).toBe("failed");
    expect(digestDisposition({ok:true,provider:"mock"},1)).toBe("unknown");
    expect(digestDisposition({ok:false,provider:"smtp",retryable:true,errorCode:"smtp_transport_retryable",errorSummary:""},1)).toBe("unknown");
  });
  it("renders honest zero/unavailable reports with no consumer PII and protected links",()=>{
    const base={from:"2026-11-03T05:00Z",to:"2026-11-04T05:00Z",generatedAt:null,collectionStartedAt:null,reason:"Activation began partway through day."};
    const unavailable=renderDailyDigest({...base,coverage:"unavailable",metrics:null});
    expect(unavailable.text).toContain("Public page views: UNKNOWN");
    expect(unavailable.html).toContain("https://www.askmagicmike.com/admin/distribution");
    const zero=renderDailyDigest({...base,coverage:"partial",metrics:Object.fromEntries(TRAFFIC_METRICS.map(k=>[k,0])) as TrafficMetrics});
    expect(zero.text).toContain("Eligible inquiries: 0"); expect(zero.text).toContain("Estimated browsers (consented): UNKNOWN");
  });
  it("never substitutes Mike or an unverified operator",async()=>{
    const sql={query:async()=>[]};
    await expect(verifiedDigestRecipient(sql,{LEAD_NOTIFICATION_TO:"mike@example.test"})).rejects.toThrow();
    await expect(verifiedDigestRecipient(sql,{OPERATOR_DAILY_DIGEST_USER_ID:"operator",LEAD_NOTIFICATION_SECOND_OPERATOR_TO:"operator@example.test"})).rejects.toThrow();
    await expect(verifiedDigestRecipient(sql,{OPERATOR_DAILY_DIGEST_USER_ID:"operator",LEAD_NOTIFICATION_SECOND_OPERATOR_TO:"OPS@example.test",LEAD_NOTIFICATION_TO:"ops@example.test"})).rejects.toThrow("digest_recipient_binding_missing");
  });
  it("keeps strict report delivery separate from lead callback/suppression correlation",async()=>{
    for(const [key,value] of Object.entries({EMAIL_ENABLED:"true",LEAD_NOTIFICATION_MODE:"production",LEAD_NOTIFICATION_PRODUCTION_ENABLED:"true",RESEND_API_KEY:"synthetic-offline",RESEND_FROM:"sender@example.test"}))vi.stubEnv(key,value);
    try {
      let body:Record<string,unknown>={}; let signal:AbortSignal|null|undefined;
      const transport=vi.fn<typeof fetch>(async(_url,init)=>{body=JSON.parse(String(init?.body));signal=init?.signal;return Response.json({id:"synthetic-provider-id"})});
      const request={notificationId:"10000000-0000-4000-8000-000000000001",channel:"email" as const,recipient:"operator@example.test",text:"Synthetic internal report",idempotencyKey:"synthetic-operator-period",operationalDigest:true};
      expect((await new ResendEmailNotificationProvider("production",transport).send(request)).ok).toBe(true);
      expect(body.tags).toEqual([{name:"amm_operator_report_id",value:request.notificationId}]);expect(signal).toBeTruthy();
      expect(readLaunchCallbackCorrelation({data:{tags:body.tags,to:["operator@example.test"]}})).toEqual({notificationId:null,recipient:null});
    } finally {vi.unstubAllEnvs();}
  });
});
