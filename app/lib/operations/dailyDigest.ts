import { createHash, randomUUID } from "node:crypto";
import type { NotificationProvider, NotificationResult } from "../leadNotificationTypes";
import { TRAFFIC_METRICS, type TrafficReport } from "../persistence/neonTrafficReport";
import {configuredLaunchFrom} from "../leadAlertLaunch";
import {resolveSmtpConfiguration} from "../emailProviderConfiguration";

export const DIGEST_ZONE = "America/New_York";
const localDate = (date: Date) => new Intl.DateTimeFormat("en-CA",{timeZone:DIGEST_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
function midnight(day: string) {
  const base = Date.parse(day+"T00:00:00Z");
  let utc = base + 5*3600000;
  for (let i=0;i<3;i++) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:DIGEST_ZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(utc)).map(p=>[p.type,p.value]));
    const represented = Date.parse(parts.year+"-"+parts.month+"-"+parts.day+"T"+parts.hour+":"+parts.minute+":"+parts.second+"Z");
    utc += base-represented;
  }
  return new Date(utc).toISOString();
}
export function digestPeriods(activatedAt: string, now: Date) {
  if (!Number.isFinite(Date.parse(activatedAt)) || Date.parse(activatedAt)>now.getTime()) return [];
  const hour = Number(new Intl.DateTimeFormat("en-US",{timeZone:DIGEST_ZONE,hour:"numeric",hourCycle:"h23"}).format(now));
  if (hour<8) return [];
  const today = localDate(now), start=localDate(new Date(activatedAt));
  // Bounded seven-day catch-up horizon; operational readout explicitly records
  // older missed periods, never bursts an unlimited email backlog.
  const earliest = new Date(Date.parse(today+"T00:00Z")-7*86400000).toISOString().slice(0,10);
  const result: Array<{day:string;from:string;to:string}> = [];
  for (let day=start>earliest?start:earliest;day<today;day=new Date(Date.parse(day+"T00:00Z")+86400000).toISOString().slice(0,10))
    result.push({day,from:midnight(day),to:midnight(new Date(Date.parse(day+"T00:00Z")+86400000).toISOString().slice(0,10))});
  return result;
}
export const digestKey = (userId:string,from:string) => "amm-daily-v1-"+createHash("sha256").update(userId+"\n"+from).digest("hex");
const escape = (v:string) => v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function renderDailyDigest(report: TrafficReport) {
  const m=report.metrics;
  const labels:Record<string,string>={pageViews:"Public page views",embeddedViews:"Embedded views (separate)",
    visits:"Measured visits (consented)",browsers:"Estimated browsers (consented)",identifiedViews:"Views with optional identity",
    starts:"Form starts (not people)",embeddedStarts:"Embedded form starts",inquiries:"Eligible inquiries",contacts:"Distinct recorded contacts",
    cashReview:"Cash/direct-purchase review requests",homeValue:"Home Value requests",buyer:"Buyer requests",other:"Other requests",
    reviewFactsComplete:"Requests with minimum review facts",unassigned:"Unassigned inquiry exceptions",failedAlerts:"Failed internal alert envelopes",
    recordedResponses:"Recorded human responses",appointmentsRequested:"Appointment requests",appointmentsConfirmed:"Confirmed appointments"};
  const reportingDate=new Intl.DateTimeFormat("en-US",{timeZone:DIGEST_ZONE,dateStyle:"medium"}).format(new Date(report.from));
  const lines = ["Ask Magic Mike · Our Town Properties, Inc.", "Daily operations · "+DIGEST_ZONE,
    "Reporting interval: ["+report.from+", "+report.to+")", "Coverage: "+report.coverage.toUpperCase()+" — "+report.reason,
    "Reporting date: "+reportingDate, "Snapshot: "+(report.generatedAt || "unavailable"), ...TRAFFIC_METRICS.map(k=>labels[k]+": "+(m?m[k]:"UNKNOWN")),
    "Visits and browsers are consented estimates, not exact people. Without identified views, identity metrics are UNKNOWN.",
    "Starts are mounted-form events. Inquiry eligibility excludes test, suppressed, spam and internal-QA records.",
    "Review facts complete is not a purchase qualification, written offer or business outcome.",
    "https://www.askmagicmike.com/admin/distribution", "https://www.askmagicmike.com/admin/today"];
  if (m && !m.identifiedViews) for (const key of ["visits","browsers"]) {
    const index=lines.findIndex(l=>l.startsWith(labels[key]+":")); lines[index]=labels[key]+": UNKNOWN (no identified-view coverage)";
  }
  return {subject:"Ask Magic Mike | Daily operations · "+reportingDate,text:lines.join("\n"),
    html:'<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#080808;color:#f4ead4;font:16px/1.6 Arial,sans-serif"><main style="max-width:600px;margin:auto;padding:24px"><h1 style="font:28px Georgia,serif;color:#e2c06f">Your daily operating brief</h1>'+lines.map(l=>'<p style="overflow-wrap:anywhere">'+escape(l)+'</p>').join("")+'<a href="https://www.askmagicmike.com/admin/distribution" style="display:inline-block;background:#e2c06f;color:#080808;padding:14px 20px">Open protected report</a></main></body></html>'};
}
export function digestDisposition(result: NotificationResult, attempts:number) {
  if (result.ok) return result.providerMessageId ? "accepted" : "unknown";
  if (result.ambiguous) return "unknown";
  if (result.provider==="smtp" && result.retryable && !/^smtp_response_[45][0-9]{2}$/.test(result.errorCode)) return "unknown";
  return result.retryable && attempts<3 ? "retry" : "failed";
}
export type DigestSql = {query(sql:string,params?:unknown[]):Promise<Record<string,unknown>[]>};
type DigestEnv = Record<string,string|undefined>;
/** One dedicated, authenticated operator binding; never falls back to Mike,
 * BCC, an arbitrary user, or a browser-provided recipient. */
export async function verifiedDigestRecipient(sql:DigestSql,env:DigestEnv) {
  const id=env.OPERATOR_DAILY_DIGEST_USER_ID, address=env.LEAD_NOTIFICATION_SECOND_OPERATOR_TO;
  if (!id || !address || address.toLowerCase()===env.LEAD_NOTIFICATION_TO?.toLowerCase() || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) throw new Error("digest_recipient_binding_missing");
  const rows=await sql.query(`SELECT id,email FROM public.lead_center_users WHERE id=$1 AND lower(email)=lower($2)
    AND role='administrator' AND banned=false AND "emailVerified"=true`,[id,address]);
  if (rows.length!==1 || rows[0].id!==id || String(rows[0].email).toLowerCase()!==address.toLowerCase()) throw new Error("digest_operator_not_verified");
  return {id,email:address};
}
export async function runDailyDigest(input:{sql:DigestSql;env:DigestEnv;now:Date;provider:NotificationProvider;
  report:(from:string,to:string)=>Promise<TrafficReport>}) {
  const {sql,env,now}=input;
  const recipient=await verifiedDigestRecipient(sql,env);
  const transport=digestTransport(env,input.provider.name);
  const periods=digestPeriods(env.OPERATOR_DAILY_DIGEST_ACTIVATED_AT || "",now);
  let accepted=0, attempted=0, interventionRequired=0;
  // Stale processing is uncertain, never a fresh claim or automatic replay.
  await sql.query(`UPDATE public.operational_daily_reports SET status='unknown',error_code='interrupted_provider_boundary',
    updated_at=$1,history=history||jsonb_build_array(jsonb_build_object('at',$1::text,'state','unknown'))
    WHERE status='processing' AND claimed_at<$1::timestamptz-interval '10 minutes'`,[now.toISOString()]);
  await sql.query(`UPDATE public.operational_daily_reports SET status='failed',error_code='retry_window_exhausted',updated_at=$1
    WHERE status='retry' AND (attempt_count>=3 OR first_attempt_at<=$1::timestamptz-interval '23 hours')`,[now.toISOString()]);
  // The previous day has priority over a bounded missed-period catch-up.
  for (const period of periods.toReversed()) {
    if (attempted>=1) break;
    const key=digestKey(recipient.id,period.from);
    const existing=await sql.query("SELECT id,status FROM public.operational_daily_reports WHERE idempotency_key=$1",[key]);
    if(existing.some(r=>r.status==="unknown" || r.status==="failed")) {interventionRequired++;continue;}
    if(existing.some(r=>r.status==="accepted" || r.status==="processing")) continue;
    if (!existing.length) {
      const body={...renderDailyDigest(await input.report(period.from,period.to)),...transport};
      await sql.query(`INSERT INTO public.operational_daily_reports(recipient_user_id,recipient,period_from,period_to,idempotency_key,frozen_body,next_attempt_at)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::timestamptz) ON CONFLICT DO NOTHING`,[recipient.id,recipient.email,period.from,period.to,key,JSON.stringify(body),now.toISOString()]);
    }
    const token=randomUUID();
    const rows=await sql.query(`UPDATE public.operational_daily_reports SET status='processing',claim_token=$2::uuid,claimed_at=$3,
      first_attempt_at=coalesce(first_attempt_at,$3),attempt_count=attempt_count+1,updated_at=$3,
      history=history||jsonb_build_array(jsonb_build_object('at',$3::text,'state','processing'))
      WHERE idempotency_key=$1 AND recipient_user_id=$4 AND lower(recipient)=lower($5)
      AND status IN ('pending','retry') AND next_attempt_at<=$3::timestamptz AND attempt_count<3
      AND (first_attempt_at IS NULL OR first_attempt_at>$3::timestamptz-interval '23 hours')
      RETURNING id,frozen_body,attempt_count`,[key,token,now.toISOString(),recipient.id,recipient.email]);
    if (!rows.length) continue;
    attempted++;
    const row=rows[0],body=row.frozen_body as {subject:string;text:string;html:string;frozenFrom:string;transportIdentity:string};
    let result:NotificationResult;
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      await verifiedDigestRecipient(sql,env);
      if(body.transportIdentity!==transport.transportIdentity || body.frozenFrom!==transport.frozenFrom) throw new Error("digest_transport_changed");
      result=await Promise.race([input.provider.send({notificationId:String(row.id),channel:"email",recipient:recipient.email,
        idempotencyKey:key,subject:body.subject,text:body.text,html:body.html,frozenFrom:body.frozenFrom,bcc:[],operationalDigest:true,deliveryTimeoutMs:5000}),
        new Promise<NotificationResult>(resolve=>{timer=setTimeout(()=>resolve({ok:false,provider:input.provider.name,retryable:false,ambiguous:true,errorCode:"digest_provider_timeout",errorSummary:"Acceptance unknown; do not resend."}),5000);})]);
    } catch { result={ok:false,provider:input.provider.name,retryable:false,ambiguous:true,errorCode:"digest_outcome_unknown",errorSummary:"Operator reconciliation required."}; }
    finally {clearTimeout(timer);}
    const state=digestDisposition(result,Number(row.attempt_count));
    const delay=!result.ok ? Math.min(3600000,Math.max(60000,result.retryAfterMs||300000)) : 300000;
    const saved=await sql.query(`UPDATE public.operational_daily_reports SET status=$3,provider=$4,provider_message_id=$5,
      accepted_at=CASE WHEN $3='accepted' THEN $6::timestamptz ELSE accepted_at END,error_code=$7,
      next_attempt_at=$6::timestamptz+($8::text||' milliseconds')::interval,updated_at=$6,
      history=history||jsonb_build_array(jsonb_build_object('at',$6::text,'state',$3::text))
      WHERE id=$1::uuid AND claim_token=$2::uuid AND status='processing' RETURNING id`,
      [row.id,token,state,result.provider,result.ok?result.providerMessageId||null:null,now.toISOString(),result.ok?null:result.errorCode,delay]);
    if (saved.length!==1) throw new Error("digest_checkpoint_unconfirmed");
    if(state==="accepted") accepted++;
    if(state==="unknown" || state==="failed") interventionRequired++;
  }
  return {periodsConsidered:periods.length,attempted,accepted,interventionRequired,scope:"brandon_only",personalReceipt:"unverified"};
}

function digestTransport(env:DigestEnv,provider:string) {
  let sender=configuredLaunchFrom(env.AGENT_NOTIFICATION_FROM_EMAIL||env.RESEND_FROM||env.FROM_EMAIL);
  let identity:unknown={provider,sender};
  if(provider==="smtp") {
    const smtp=resolveSmtpConfiguration(env);
    if(!smtp.ok) throw new Error("digest_sender_unverified");
    const c=smtp.configuration;sender=c.fromName+" <"+c.fromEmail+">";
    identity={provider,sender,host:c.host,port:c.port,user:c.user,replyTo:c.replyTo||null};
  }
  if(!sender) throw new Error("digest_sender_unverified");
  return {frozenFrom:sender,transportIdentity:createHash("sha256").update(JSON.stringify(identity)).digest("hex")};
}
