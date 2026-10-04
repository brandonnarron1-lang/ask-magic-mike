import { randomUUID } from "node:crypto";
import type { AllocationQuery } from "./leadAllocation";
import { processPendingAllocationIntents } from "./leadAllocationDispatch";

export const ALLOCATION_CADENCE_SECONDS = 60;
export const ALLOCATION_BATCH_SIZE = 5;
// These conservative review limits hold discovery, not capture/owner custody.
export const ALLOCATION_BACKLOG_LIMIT = 50;
export const ALLOCATION_QUEUE_AGE_LIMIT_SECONDS = 600;

export async function allocationBacklog(sql: AllocationQuery) {
  const rows = await sql.query(`SELECT count(*)::int AS pending,
    COALESCE(extract(epoch FROM clock_timestamp()-min(n.created_at)),0)::float8 AS oldest_seconds
    FROM public.lead_notifications n
    WHERE n.notification_type IN ('allocation_offer','allocation_confirmation')
      AND n.status='pending' AND n.attempt_count=0 AND n.provider_message_id IS NULL`);
  return { pending:Number(rows[0]?.pending || 0), oldestSeconds:Math.max(0,Number(rows[0]?.oldest_seconds || 0)) };
}

/** Only called behind the existing machine auth + mutation/activation gates.
 * DB time/lease survives restarts; no in-process timers or another queue.
 * Individual canonical send reservations remain the final idempotency fence. */
export async function runAllocationScheduler(sql:AllocationQuery) {
  if(process.env.LEAD_ALLOCATION_ENABLED!=="true"||process.env.LEAD_ALLOCATION_DUE_ENABLED!=="true")
    return {ok:true,held:true,processed:0};
  const token=randomUUID();
  const row=(await sql.query("SELECT public.acquire_lead_allocation_scheduler_v1($1::uuid) AS result",[token]))[0];
  const lease=row?.result as {acquired?:boolean;reason?:string;start_gap_seconds?:number|null;late_seconds?:number|null}|undefined;
  if(!lease?.acquired)return {ok:true,held:true,processed:0,reason:lease?.reason||"lease_unavailable"};
  const ownsLease=async()=>Boolean((await sql.query(`SELECT true AS owned FROM public.lead_allocation_scheduler_lease
    WHERE id='staff_v1' AND token=$1::uuid AND lease_until>clock_timestamp()`,[token]))[0]?.owned);
  let summary:Record<string,unknown>={ok:false,error:"scheduler_interrupted"};
  try {
    const before=await allocationBacklog(sql);
    const overloaded=before.pending>ALLOCATION_BACKLOG_LIMIT||before.oldestSeconds>ALLOCATION_QUEUE_AGE_LIMIT_SECONDS;
    if(!await ownsLease())return {ok:false,error:"scheduler_lease_lost"};
    // Expired offers already fail closed on claim. Under overload, retain Mike
    // custody and hold *new* discovery rather than manufacture more paid work.
    // Expiry cleanup continues even during overload, avoiding permanent
    // head-of-line blocking by stale offer alerts. Only discovery is held.
    const expiry=(await sql.query("SELECT public.expire_lead_allocation_offers_v2(25,$1::boolean) AS result",[!overloaded]))[0]?.result;
    const dispatch=await processPendingAllocationIntents(sql,{beforeEach:ownsLease});
    const after=await allocationBacklog(sql);
    summary={ok:true,overloaded,fallbackReviewRequired:overloaded,before,after,
      startGapSeconds:lease.start_gap_seconds??null,lateSeconds:lease.late_seconds??null,
      expiry,dispatch,noHistoricalRetries:true};
    return summary;
  } catch {
    summary={ok:false,error:"allocation_scheduler_failed",noAutomaticResend:true};
    return summary;
  } finally {
    // An old/restarted worker cannot release or overwrite its successor's lease.
    // Store counts only, not recipient IDs, raw provider payloads or error data.
    const dispatch=summary.dispatch as {processed?:number;accepted?:number;reconciliationRequired?:number}|undefined;
    await sql.query(`UPDATE public.lead_allocation_scheduler_lease SET lease_until=NULL,last_completed_at=clock_timestamp(),last_result=$2::jsonb
      WHERE id='staff_v1' AND token=$1::uuid AND lease_until>clock_timestamp()`,[token,JSON.stringify({ok:summary.ok===true,
      overloaded:summary.overloaded===true,processed:dispatch?.processed||0,accepted:dispatch?.accepted||0,
      reconciliationRequired:dispatch?.reconciliationRequired||0,startGapSeconds:summary.startGapSeconds??null,
      lateSeconds:summary.lateSeconds??null,backlog:summary.after??null,error:summary.ok===true?null:"scheduler_incomplete"})]);
  }
}
