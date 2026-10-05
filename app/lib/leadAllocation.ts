import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
import { assertDatabaseMutationAllowed, isPreviewDataDisabled } from "../../src/lib/preview-security";
import { normalizeAdminLeadRow } from "./persistence/supabase/adminLeadView";
import { presentLead, type LeadOfferSnapshot } from "./leadPresentation";
import { checkRateLimit, durableRateLimitRequired } from "../../src/lib/security/rate-limit";
import { normalizeUsSmsRecipient } from "./leadNotificationProvider";

export type AllocationQuery = { query(sql: string, params?: unknown[]): Promise<Array<Record<string, unknown>>> };
export { ALLOCATION_CONSENT_VERSION,ALLOCATION_CONSENT_TEXT } from "./leadAllocationConsent";
export function allocationQuery(): AllocationQuery | null {
  // Disabled/unattested Preview must not read a possibly Production-scoped URL.
  if (isPreviewDataDisabled()) return null;
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}
export function allocationMutationGate() {
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return mutation;
  if (process.env.LEAD_ALLOCATION_ENABLED !== "true") return { ok: false as const, statusCode: 409, error: "allocation_activation_held" };
  return { ok: true as const };
}
function commandSecret() {
  const secret = process.env.LEAD_ALLOCATION_COMMAND_SECRET;
  if (!secret || secret.length < 32) throw new Error("allocation_command_secret_unconfigured");
  return secret;
}
export function staffPhoneFingerprint(phone: string) {
  const normalized=normalizeUsSmsRecipient(phone);
  if (!normalized||!/^\+1[2-9]\d{9}$/.test(normalized)) throw new Error("invalid_staff_destination");
  return createHmac("sha256", commandSecret()).update(`amm:staff-phone:v1:${normalized}`).digest("hex");
}
/** Pseudorandom, scoped to this agent/offer/version. Never in GET authority or
 * public artwork. Rotation invalidates outstanding codes and bindings. */
export function allocationCommandCode(offer: Pick<LeadOfferSnapshot, "id" | "version" | "agentId">) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = createHmac("sha256", commandSecret()).update(`amm:offer:v1:${offer.id}:${offer.version}:${offer.agentId}`).digest();
  return Array.from(bytes.subarray(0, 8), byte => alphabet[byte % alphabet.length]).join("");
}
export function parseStaffCommand(body: string) {
  const normalized = body.trim().toUpperCase();
  const scoped = /^(CLAIM|PASS|STATUS|VERIFY) ([A-HJ-NP-Z2-9]{8})$/.exec(normalized);
  if (scoped) return { action: scoped[1].toLowerCase() as "claim" | "pass" | "status" | "verify", code: scoped[2] };
  if (/^(PAUSE|RESUME|HELP|STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/.test(normalized)) return { action: ["STOPALL","UNSUBSCRIBE","CANCEL","END","QUIT"].includes(normalized) ? "stop" : normalized.toLowerCase(), code: null };
  return null;
}
export function commandRequestHash(offerId: string, version: number, actor: string, action: string) {
  return createHash("sha256").update(`${offerId}:${version}:${actor}:${action}`).digest("hex");
}

export async function loadAllocationOffer(sql: AllocationQuery, id: string, principal: LeadCenterPrincipal) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await sql.query(`SELECT o.*, l.*, o.id AS offer_id, o.state AS offer_state,o.version AS offer_version,o.agent_id AS offer_agent_id,o.reference AS offer_reference,
    e.user_id AS intended_user,e.paused AS recipient_paused,p.active AS policy_active,p.version AS current_policy_version FROM public.lead_allocation_offers o
    JOIN public.leads l ON l.id=o.lead_id JOIN public.agent_operational_enrollment e ON e.agent_id=o.agent_id
    JOIN public.lead_center_users u ON u.id=e.user_id CROSS JOIN public.lead_allocation_policy p
    WHERE p.id='staff_v1' AND o.id=$1::uuid AND e.user_id=$2 AND u.banned IS NOT TRUE AND u.role IN ('approved_agent','primary_lead_owner') AND u."agentId"=o.agent_id::text AND e.revoked_at IS NULL`, [id, principal.userId]);
  const row = rows[0]; if (!row) return null;
  const deadline = String(row.deadline);
  const state = row.offer_state === "offered" && new Date(deadline).getTime() <= Date.now() ? "expired" : row.offer_state === "offered" && row.recipient_paused === true ? "paused" : row.offer_state === "offered" && (row.policy_active !== true || Number(row.current_policy_version)!==Number(row.policy_version)) ? "blocked" : row.offer_state === "cancelled" ? "claimed_elsewhere" : row.offer_state === "passed" ? "blocked" : String(row.offer_state);
  const offer: LeadOfferSnapshot = { id, version: Number(row.offer_version), agentId: String(row.offer_agent_id), reference: String(row.offer_reference), deadline, state: state as LeadOfferSnapshot["state"] };
  const lead = normalizeAdminLeadRow({ ...row, id: row.lead_id });
  return presentLead({ lead, principal, tier: row.offer_state === "accepted" ? "assigned" : "pre_claim", offer });
}
export async function resolveAllocationOffer(sql: AllocationQuery, input: { offerId: string; version: number; userId: string; action: "claim" | "pass"; receipt: string }) {
  const rows = await sql.query("SELECT public.resolve_lead_allocation_offer_v1($1::uuid,$2::bigint,$3,$4,$5,$6) AS result", [input.offerId, input.version, input.userId, input.action, input.receipt, commandRequestHash(input.offerId,input.version,input.userId,input.action)]);
  return rows[0]?.result as { ok: boolean; error?: string; state?: string; replayed?: boolean };
}

/** Verified Twilio handler calls this AFTER signature/account/destination
 * checks. No arbitrary public phone or principal can invoke the operation. */
export async function processEnrolledStaffCommand(sql: AllocationQuery, input: { from: string; body: string; sid: string }) {
  const fingerprint = staffPhoneFingerprint(input.from);
  const matches = await sql.query(`SELECT e.*,g.notification_phone,u.role,u.banned,u."agentId" AS user_agent_id FROM public.agent_operational_enrollment e
    JOIN public.agents g ON g.id=e.agent_id JOIN public.lead_center_users u ON u.id=e.user_id
    WHERE e.phone_fingerprint=$1 AND e.approved_at IS NOT NULL AND e.revoked_at IS NULL`, [fingerprint]);
  if (matches.length !== 1) return { handled: false };
  const staff = matches[0];
  const shared=await sql.query("SELECT count(*)::int AS matches FROM public.agents WHERE is_active AND regexp_replace(notification_phone,'[^0-9]','','g') IN ($1,$2)",[input.from.replace(/\D/g,""),input.from.replace(/^\+1/,"")]);
  if(Number(shared[0]?.matches)!==1)return {handled:true,ok:false,error:"shared_staff_destination"};
  if (staff.banned === true || !["primary_lead_owner", "approved_agent"].includes(String(staff.role)) || staff.user_agent_id !== staff.agent_id || staffPhoneFingerprint(String(staff.notification_phone)) !== fingerprint) return { handled: true, ok: false, error: "staff_binding_revoked" };
  const command = parseStaffCommand(input.body);
  if (!command) return { handled: true, ok: false, error: "unknown_command_no_reply" };
  const limit=await checkRateLimit(`staff-command:${fingerprint}`,10,60_000);
  // Opt-out must not be rejected by challenge or command throttles.
  if(command.action!=="stop"&&(!limit.allowed||(durableRateLimitRequired()&&!limit.durable)))return {handled:true,ok:false,error:"staff_command_rate_limit"};
  if(command.action==="verify") {
    const hash=createHash("sha256").update(command.code!).digest("hex");
    const rows=await sql.query("SELECT public.verify_staff_allocation_possession_v1($1::uuid,$2,$3,$4,$5) AS result",[staff.agent_id,staff.user_id,fingerprint,hash,`twilio:${input.sid}:staff`]);
    return {handled:true,...(rows[0]?.result as object),action:"verify",replyQueued:false};
  }
  if(command.action!=="stop"&&!staff.possession_verified_at)return {handled:true,ok:false,error:"staff_possession_unverified"};
  // STOP is processed even with outbound dispatch off. RESUME does not grant
  // consent, renew possession or clear revocation/consumer suppression.
  if (["pause","resume","stop"].includes(command.action)) {
    const hash = createHash("sha256").update(`${fingerprint}:${command.action}`).digest("hex");
    const rows = await sql.query(`WITH receipt AS (INSERT INTO public.lead_allocation_command_receipts(receipt_key,actor_user_id,request_hash,result)
      VALUES($1,$2,$3,jsonb_build_object('ok',true,'action',$4::text)) ON CONFLICT DO NOTHING RETURNING receipt_key),
      changed AS (UPDATE public.agent_operational_enrollment SET paused=($4<>'resume'),
        revoked_at=CASE WHEN $4='stop' THEN now() ELSE revoked_at END,updated_at=now()
        WHERE agent_id=$5::uuid AND EXISTS(SELECT 1 FROM receipt) RETURNING agent_id),
      audit AS (INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) SELECT $2,'allocation.staff_'||$4,'agent',agent_id,jsonb_build_object('receipt',$1) FROM changed RETURNING id)
      SELECT request_hash,result FROM public.lead_allocation_command_receipts WHERE receipt_key=$1 UNION ALL SELECT $3,jsonb_build_object('ok',true,'action',$4) FROM receipt`, [`twilio:${input.sid}:staff`,String(staff.user_id),hash,command.action,staff.agent_id]);
    if (rows[0]?.request_hash !== hash) return { handled: true, ok: false, error: "command_receipt_conflict" };
    return { handled: true, ok: true, action: command.action };
  }
  if (command.action === "help") return { handled: true, ok: true, action: "help", replyQueued: false };
  if (staff.consent_at == null || !staff.sms_enabled) return { handled: true, ok: false, error: "staff_sms_not_enrolled" };
  const rows = await sql.query("SELECT id,version,agent_id,deadline,state FROM public.lead_allocation_offers WHERE agent_id=$1::uuid AND deadline>now()-interval '15 minutes' ORDER BY created_at DESC LIMIT 20", [staff.agent_id]);
  const offer = rows.find(row => { const expected=allocationCommandCode({ id:String(row.id),version:Number(row.version),agentId:String(row.agent_id) }); return command.code && timingSafeEqual(Buffer.from(expected),Buffer.from(command.code)); });
  if (!offer) return { handled:true,ok:false,error:"invalid_or_stale_offer_code" };
  if (command.action === "status") return { handled:true,ok:true,state:offer.state==="offered"&&new Date(String(offer.deadline)).getTime()<=Date.now()?"expired":offer.state,replyQueued:false };
  const gate=allocationMutationGate(); if (!gate.ok) return {handled:true,ok:false,error:gate.error};
  const result=await resolveAllocationOffer(sql,{offerId:String(offer.id),version:Number(offer.version),userId:String(staff.user_id),action:command.action as "claim"|"pass",receipt:`twilio:${input.sid}:staff`});
  return {handled:true,...result};
}
export function createPossessionChallenge() { const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const value=Array.from(randomBytes(8),b=>alphabet[b%alphabet.length]).join(""); return { value, hash:createHash("sha256").update(value).digest("hex") }; }
