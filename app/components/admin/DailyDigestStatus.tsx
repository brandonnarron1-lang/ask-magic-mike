import {neon} from "@neondatabase/serverless";
import {isPreviewDataDisabled} from "../../../src/lib/preview-security";
import {hasLeadCenterPermission,type LeadCenterPrincipal} from "../../../src/lib/admin/rbac-policy";
export async function loadDailyDigestStatus(principal:LeadCenterPrincipal|null) {
  let message="Not activated. No daily report delivery is claimed.";
  if(principal && hasLeadCenterPermission(principal.role,"notification:manage") && !isPreviewDataDisabled() && process.env.DATABASE_URL && process.env.OPERATOR_DAILY_DIGEST_USER_ID) {
    try {
      const sql=neon(process.env.DATABASE_URL,{fetchOptions:{signal:AbortSignal.timeout(5000)}});
      const rows=await sql.query(`SELECT
        count(*) FILTER(WHERE r.status='unknown' OR (r.status='processing' AND r.claimed_at<now()-interval '10 minutes')) AS unknown,
        count(*) FILTER(WHERE r.status='failed') AS failed,
        max(r.accepted_at) AS accepted_at,
        max((SELECT max(e.occurred_at) FROM public.provider_webhook_events e WHERE e.provider=r.provider AND e.provider_message_id=r.provider_message_id
          AND e.signature_verified=true AND e.event_type='delivered')) AS delivered_at
        FROM public.operational_daily_reports r WHERE r.recipient_user_id=$1`,[process.env.OPERATOR_DAILY_DIGEST_USER_ID]);
      const row=rows[0];
      if(!row || !Number.isSafeInteger(Number(row.unknown)) || !Number.isSafeInteger(Number(row.failed))) throw new Error("invalid_aggregate");
      message=(process.env.OPERATOR_DAILY_DIGEST_ENABLED==="true"?"Enabled":"Paused")+
        " · 8 a.m. Eastern, previous local day. Last provider acceptance: "+(row.accepted_at||"not recorded")+
        ". Recipient-server delivery: "+(row.delivered_at||"not verified")+
        ". Unknown/interrupted: "+row.unknown+"; failed: "+row.failed+
        ". Personal receipt remains unverified. Unknown outcomes require reconciliation, not resend.";
    } catch {message="Delivery status unavailable. Do not infer zero failures, delivery or personal receipt.";}
  }
  return message;
}
export function DailyDigestStatus({message}:{message:string}) {
  return <aside aria-label="Brandon daily digest status" className="mt-5 rounded-xl border border-[#cda24a55] p-4 text-sm leading-6">
    <h3 className="font-semibold text-[#e2c06f]">Brandon-only daily email</h3><p role="status" className="mt-2">{message}</p>
  </aside>;
}
