import { allocationCommandCode, staffPhoneFingerprint, loadAllocationOffer, type AllocationQuery } from "./leadAllocation";
import { LEAD_MODULES } from "./leadPresentation";
import { renderLeadOfferEmail,renderLeadOfferSms } from "./leadOfferRenderers";
import type { NotificationProvider } from "./leadNotificationTypes";
import { assertProviderDeliveryAllowed } from "../../src/lib/preview-security";
import { emailProviderConfigurationReady } from "./emailProviderConfiguration";
import { agentSmsNotificationsEnabled,emailNotificationsEnabled,normalizeUsSmsRecipient,notificationMode,productionNotificationDeliveryEnabled,selectNotificationProvider } from "./leadNotificationProvider";

function configuredTransportReady(mobile:boolean) {
  if(notificationMode()!=="production"||!productionNotificationDeliveryEnabled())return false;
  if(!mobile)return emailNotificationsEnabled()&&emailProviderConfigurationReady();
  return agentSmsNotificationsEnabled()&&process.env.ENABLE_SMS==="true"&&process.env.SMS_PROVIDER==="twilio"&&/^AC[a-f0-9]{32}$/i.test(process.env.TWILIO_ACCOUNT_SID||"")&&Boolean(process.env.TWILIO_AUTH_TOKEN)&&Boolean(normalizeUsSmsRecipient(process.env.TWILIO_FROM_PHONE||process.env.TWILIO_PHONE_NUMBER));
}

/** Shared bounded post-commit processor for the protected admin and machine
 * venues. It cannot select old failures, retries or consumer messages. */
export async function processPendingAllocationIntents(sql:AllocationQuery,controls?:{beforeEach:()=>Promise<boolean>}) {
 if(process.env.LEAD_ALLOCATION_ENABLED!=="true"||process.env.LEAD_ALLOCATION_SENDS_ENABLED!=="true"||process.env.LEAD_ALLOCATION_TRANSPORT_APPROVED!=="true"||notificationMode()!=="production"||!productionNotificationDeliveryEnabled())return {held:true,processed:0,noHistoricalRetries:true};
 const pending=await sql.query("SELECT id FROM public.lead_notifications WHERE notification_type IN ('allocation_offer','allocation_confirmation') AND status='pending' AND attempt_count=0 AND provider_message_id IS NULL ORDER BY created_at,id LIMIT 5");
 const provider=selectNotificationProvider(),results=[];
 for(const row of pending){
  if(controls&&!await controls.beforeEach())break;
  results.push(await dispatchAllocationIntent(sql,provider,String(row.id),{segmentCostMicros:Number(process.env.LEAD_ALLOCATION_SEGMENT_COST_MICROS),mmsCostMicros:Number(process.env.LEAD_ALLOCATION_MMS_COST_MICROS),mmsReady:process.env.LEAD_ALLOCATION_MMS_FETCH_VERIFIED==="true"}));
 }
 return {held:false,processed:results.length,accepted:results.filter(result=>result.ok===true).length,
  reconciliationRequired:results.filter(result=>"reconciliationRequired" in result&&result.reconciliationRequired).length,results,noHistoricalRetries:true};
}

/** Only new allocation intents. Never general retries. All sends happen after
 * committed reservation; ambiguous outcomes remain for reconciliation. */
export async function dispatchAllocationIntent(sql:AllocationQuery,provider:NotificationProvider,id:string,options:{ segmentCostMicros:number; mmsCostMicros:number; mmsReady:boolean; transportReady?:boolean }) {
  const venue=assertProviderDeliveryAllowed();if(!venue.ok)return {ok:false,error:venue.error};
  if(process.env.LEAD_ALLOCATION_SENDS_ENABLED!=="true")return {ok:false,error:"allocation_sends_held"};
  const rows=await sql.query(`SELECT n.*,e.user_id,e.phone_fingerprint,e.sms_enabled,e.mms_enabled,e.revoked_at,u.role,u.banned,u."agentId" AS user_agent_id,g.notification_phone,g.email,g.name
    FROM public.lead_notifications n JOIN public.agent_operational_enrollment e ON e.agent_id=n.agent_id JOIN public.lead_center_users u ON u.id=e.user_id JOIN public.agents g ON g.id=e.agent_id
    WHERE n.id=$1::uuid AND n.notification_type IN ('allocation_offer','allocation_confirmation')`,[id]);
  const n=rows[0];if(!n)return {ok:false,error:"allocation_intent_not_found"};
  if(n.banned===true||n.user_agent_id!==n.agent_id||n.revoked_at)return {ok:false,error:"staff_binding_revoked"};
  const meta=n.metadata as Record<string,unknown>;
  const view=await loadAllocationOffer(sql,String(meta.offer_id),{userId:String(n.user_id),role:n.role as "approved_agent",agentId:String(n.agent_id),name:String(n.name),email:String(n.email)});
  if(!view)return {ok:false,error:"offer_unavailable"};
  const email=renderLeadOfferEmail(view);const sms=renderLeadOfferSms(view,allocationCommandCode(view.offer!));
  const mobile=n.channel==="sms";
  const mms=mobile&&n.mms_enabled===true&&options.mmsReady;
  // Known configuration holds do not consume a recoverable intent or money.
  // The injectable readiness seam is for isolated no-send orchestration tests;
  // the protected production route never accepts it from a request.
  if(!(options.transportReady??configuredTransportReady(mobile)))return {ok:false,error:"transport_configuration_held"};
  if(mobile&&(!Number.isSafeInteger(options.segmentCostMicros)||options.segmentCostMicros<=0||(mms&&(!Number.isSafeInteger(options.mmsCostMicros)||options.mmsCostMicros<=0))))return {ok:false,error:"reviewed_pricing_required"};
  if(mobile&&staffPhoneFingerprint(String(n.notification_phone))!==n.phone_fingerprint)return {ok:false,error:"destination_binding_changed"};
  const segments=mobile?sms.segments:0;
  const cost=mobile?(mms?options.mmsCostMicros:segments*options.segmentCostMicros):0;
  const reservation=await sql.query("SELECT public.reserve_lead_allocation_send_v1($1::uuid,$2::int,$3::bigint,$4::boolean) AS result",[id,segments,cost,mms]);
  const reserved=reservation[0]?.result as {ok:boolean;error?:string};if(!reserved?.ok)return reserved||{ok:false,error:"send_reservation_failed"};
  let result;try{result=await provider.send({notificationId:id,channel:mobile?"sms":"email",recipient:String(mobile?n.notification_phone:n.email),text:mobile?sms.text:email.text,...(!mobile?{subject:email.subject,html:email.html}:{}),...(mms?{mediaUrls:[`https://www.askmagicmike.com/images/ask-magic-mike/notifications/allocation-${LEAD_MODULES[view.subtype].media}-v1.jpg`]}:{}),idempotencyKey:String(n.idempotency_key)});}catch{result={ok:false as const,provider:provider.name,retryable:false,errorCode:"provider_outcome_unknown",errorSummary:"Reconcile before any resend."};}
  // Failure/timeout after starting I/O is never a reason to auto-send SMS as
  // fallback or release the cost reservation. No consumer ack or BCC fanout.
  const accepted=result.ok&&Boolean(result.providerMessageId);
  await sql.query(`WITH notification AS (UPDATE public.lead_notifications SET status=$2,provider=$3,provider_message_id=$4,error_code=$5,error_summary=$6,sent_at=CASE WHEN $2='sent' THEN now() ELSE sent_at END,metadata=metadata||jsonb_build_object('allocation_provider_outcome',$7) WHERE id=$1::uuid RETURNING id),
    reservation AS (UPDATE public.lead_allocation_send_reservations SET state=$7 WHERE notification_id=$1::uuid AND EXISTS(SELECT 1 FROM notification) RETURNING notification_id)
    INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) SELECT 'system/allocation_dispatch','allocation.transport_outcome','lead',lead_id,jsonb_build_object('notification_id',id,'provider_outcome',$7) FROM public.lead_notifications WHERE id=$1::uuid RETURNING id`,[id,accepted?"sent":"processing",result.provider,result.ok?result.providerMessageId||null:null,accepted?null:"provider_reconciliation_required",accepted?null:"Provider outcome needs reconciliation. No automatic resend.",accepted?"accepted":"ambiguous"]);
  return {ok:accepted,providerAccepted:accepted,delivered:false,reconciliationRequired:!accepted};
}
