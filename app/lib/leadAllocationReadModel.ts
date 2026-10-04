import { allocationQuery } from "./leadAllocation";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

export type AllocationWorkspaceState = {
  ready: boolean;
  held: boolean;
  error?: string;
  metrics: { pending: number; ambiguous: number; overdue: number; oldestPendingSeconds: number; reservedSegments: number; estimatedMicros: number };
  leads: Array<{ id: string; version: number; town: string; intent: string; score: number | null }>;
  offers: Array<{ reference: string; state: string; deadline: string; version: number; reason: string }>;
};
export async function loadAllocationWorkspace(principal: LeadCenterPrincipal | null): Promise<AllocationWorkspaceState> {
  const empty: AllocationWorkspaceState = { ready: false, held: true, metrics: { pending:0, ambiguous:0, overdue:0, oldestPendingSeconds:0, reservedSegments:0, estimatedMicros:0 }, leads:[], offers:[] };
  if (principal?.role !== "administrator") return { ...empty, error:"Administrator routing scope required." };
  const sql=allocationQuery(); if(!sql)return {...empty,error:"Database unavailable; allocation is held."};
  try {
    const policy=(await sql.query("SELECT active,approved_at,starts_at FROM public.lead_allocation_policy WHERE id='staff_v1'"))[0];
    const metrics=(await sql.query(`SELECT
      (SELECT count(*) FROM public.lead_notifications WHERE notification_type IN ('allocation_offer','allocation_confirmation') AND status='pending')::int AS pending,
      (SELECT count(*) FROM public.lead_allocation_send_reservations WHERE state='ambiguous' OR (state='reserved' AND created_at<now()-interval '1 minute'))::int AS ambiguous,
      (SELECT count(*) FROM public.lead_allocation_offers WHERE state='offered' AND deadline<=now())::int AS overdue,
      COALESCE((SELECT extract(epoch FROM now()-min(created_at)) FROM public.lead_notifications WHERE notification_type IN ('allocation_offer','allocation_confirmation') AND status='pending'),0)::int AS oldest,
      COALESCE(sum(segments),0)::int AS segments,COALESCE(sum(estimated_cost_micros),0)::bigint AS micros
      FROM public.lead_allocation_send_reservations WHERE day=(now() AT TIME ZONE 'America/New_York')::date`))[0];
    const leads=await sql.query(`SELECT l.id,l.allocation_version AS version,l.city AS town,l.lead_type AS intent,l.score
      FROM public.leads l JOIN public.lead_allocation_policy p ON p.id='staff_v1'
      WHERE p.starts_at IS NOT NULL AND l.created_at>=p.starts_at AND NOT l.is_test AND NOT l.communication_suppressed AND l.status NOT IN ('dead','converted','closed_won','closed_lost')
        AND (l.assigned_agent_id IS NULL OR l.assigned_agent_id=p.fallback_agent_id)
      ORDER BY l.created_at DESC LIMIT 25`);
    const offers=await sql.query("SELECT reference,state,deadline,version,reason FROM public.lead_allocation_offers ORDER BY created_at DESC LIMIT 25");
    return { ready:true,held:process.env.LEAD_ALLOCATION_ENABLED!=="true"||!policy?.active||!policy.approved_at||!policy.starts_at,
      metrics:{pending:Number(metrics.pending),ambiguous:Number(metrics.ambiguous),overdue:Number(metrics.overdue),oldestPendingSeconds:Number(metrics.oldest),reservedSegments:Number(metrics.segments),estimatedMicros:Number(metrics.micros)},
      leads:leads as AllocationWorkspaceState["leads"],offers:offers as AllocationWorkspaceState["offers"] };
  }catch{return {...empty,error:"Allocation schema/read model unavailable. No operation was attempted."};}
}
