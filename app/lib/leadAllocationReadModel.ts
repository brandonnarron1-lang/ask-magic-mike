import { allocationQuery } from "./leadAllocation";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

export type AllocationWorkspaceState = {
  ready: boolean;
  held: boolean;
  error?: string;
  metrics: { pending: number; ambiguous: number; overdue: number; oldestPendingSeconds: number; reservedSegments: number; estimatedMicros: number };
  policy: { version: number; mode: string; offerSeconds: number; startsAt: string | null; fallback: string } | null;
  leads: Array<{ id: string; version: number; town: string; intent: string; score: number | null; source: string; ownerId: string | null; owner: string; lifecycle: string }>;
  offers: Array<{ reference: string; state: string; deadline: string; version: number; reason: string; town: string; intent: string; source: string; ownerId: string | null; owner: string; score: number | null; lifecycle: string; recipient: string; delivery: string }>;
  roster: Array<{ id: string; name: string; paused: boolean; approved: boolean; towns: string[]; intents: string[]; currentLoad: number; outstanding: number; concurrentCap: number; dailyCap: number; weight: number; channels: string }>;
};
export async function loadAllocationWorkspace(principal: LeadCenterPrincipal | null, readSql?: NonNullable<ReturnType<typeof allocationQuery>>): Promise<AllocationWorkspaceState> {
  const empty: AllocationWorkspaceState = { ready: false, held: true, metrics: { pending:0, ambiguous:0, overdue:0, oldestPendingSeconds:0, reservedSegments:0, estimatedMicros:0 }, policy:null, leads:[], offers:[], roster:[] };
  if (principal?.role !== "administrator") return { ...empty, error:"Administrator routing scope required." };
  const sql=readSql||allocationQuery(); if(!sql)return {...empty,error:"Database unavailable; allocation is held."};
  try {
    const policy=(await sql.query(`SELECT p.active,p.approved_at,p.starts_at,p.version,p.mode,p.offer_seconds,COALESCE(g.name,'Not reviewed') AS fallback
      FROM public.lead_allocation_policy p LEFT JOIN public.agents g ON g.id=p.fallback_agent_id WHERE p.id='staff_v1'`))[0];
    const metrics=(await sql.query(`SELECT
      (SELECT count(*) FROM public.lead_notifications WHERE notification_type IN ('allocation_offer','allocation_confirmation') AND status='pending')::int AS pending,
      (SELECT count(*) FROM public.lead_allocation_send_reservations WHERE state='ambiguous' OR (state='reserved' AND created_at<now()-interval '1 minute'))::int AS ambiguous,
      (SELECT count(*) FROM public.lead_allocation_offers WHERE state='offered' AND deadline<=now())::int AS overdue,
      COALESCE((SELECT extract(epoch FROM now()-min(created_at)) FROM public.lead_notifications WHERE notification_type IN ('allocation_offer','allocation_confirmation') AND status='pending'),0)::int AS oldest,
      COALESCE(sum(segments),0)::int AS segments,COALESCE(sum(estimated_cost_micros),0)::bigint AS micros
      FROM public.lead_allocation_send_reservations WHERE day=(now() AT TIME ZONE 'America/New_York')::date`))[0];
    const leads=await sql.query(`SELECT l.id,l.allocation_version AS version,l.city AS town,l.lead_type AS intent,l.score,
      COALESCE(l.source,'Unattributed') AS source,l.assigned_agent_id AS "ownerId",COALESCE(g.name,'Unassigned') AS owner,l.status AS lifecycle
      FROM public.leads l JOIN public.lead_allocation_policy p ON p.id='staff_v1' LEFT JOIN public.agents g ON g.id=l.assigned_agent_id
      WHERE p.starts_at IS NOT NULL AND l.created_at>=p.starts_at AND NOT l.is_test AND NOT l.communication_suppressed AND l.status NOT IN ('dead','converted','closed_won','closed_lost')
        AND l.duplicate_of_lead_id IS NULL
        AND (l.assigned_agent_id IS NULL OR l.assigned_agent_id=p.fallback_agent_id)
      ORDER BY l.created_at DESC LIMIT 25`);
    const offers=await sql.query(`SELECT o.reference,o.state,o.deadline,o.version,o.reason,l.city AS town,l.lead_type AS intent,l.score,
      COALESCE(l.source,'Unattributed') AS source,l.status AS lifecycle,l.assigned_agent_id AS "ownerId",COALESCE(owner.name,'Unassigned') AS owner,
      recipient.name AS recipient,COALESCE((SELECT string_agg(n.channel||': '||n.status,', ' ORDER BY n.channel,n.created_at)
        FROM public.lead_notifications n WHERE n.notification_type IN ('allocation_offer','allocation_confirmation') AND n.metadata->>'offer_id'=o.id::text),'No intent recorded') AS delivery
      FROM public.lead_allocation_offers o JOIN public.leads l ON l.id=o.lead_id
      JOIN public.agents recipient ON recipient.id=o.agent_id LEFT JOIN public.agents owner ON owner.id=l.assigned_agent_id
      ORDER BY o.created_at DESC LIMIT 25`);
    const roster=await sql.query(`SELECT g.id,g.name,e.paused,(e.approved_at IS NOT NULL AND e.revoked_at IS NULL AND g.is_active AND u.banned IS NOT TRUE
      AND u.role IN ('approved_agent','primary_lead_owner') AND u."agentId"=g.id::text) AS approved,e.towns,e.intents,
      g.current_load AS "currentLoad",(SELECT count(*)::int FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state='offered') AS outstanding,
      e.concurrent_cap AS "concurrentCap",LEAST(e.daily_cap,g.max_daily_leads) AS "dailyCap",e.weight,
      concat_ws(', ',CASE WHEN e.email_enabled AND g.notification_email THEN 'email enrolled' END,
        CASE WHEN e.sms_enabled AND g.notification_sms AND e.consent_at IS NOT NULL AND e.possession_verified_at IS NOT NULL AND e.phone_fingerprint IS NOT NULL THEN 'SMS verified' END) AS channels
      FROM public.agent_operational_enrollment e JOIN public.agents g ON g.id=e.agent_id JOIN public.lead_center_users u ON u.id=e.user_id
      ORDER BY g.name,g.id LIMIT 50`);
    return { ready:true,held:process.env.LEAD_ALLOCATION_ENABLED!=="true"||!policy?.active||!policy.approved_at||!policy.starts_at,
      metrics:{pending:Number(metrics.pending),ambiguous:Number(metrics.ambiguous),overdue:Number(metrics.overdue),oldestPendingSeconds:Number(metrics.oldest),reservedSegments:Number(metrics.segments),estimatedMicros:Number(metrics.micros)},
      policy:policy?{version:Number(policy.version),mode:String(policy.mode),offerSeconds:Number(policy.offer_seconds),startsAt:policy.starts_at as string|null,fallback:String(policy.fallback)}:null,
      leads:leads as AllocationWorkspaceState["leads"],offers:offers as AllocationWorkspaceState["offers"],roster:roster as AllocationWorkspaceState["roster"] };
  }catch{return {...empty,error:"Allocation schema/read model unavailable. No operation was attempted."};}
}
