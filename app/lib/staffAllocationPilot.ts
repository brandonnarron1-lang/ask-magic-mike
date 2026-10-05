import { createHash } from "node:crypto";
import type { AllocationQuery } from "./leadAllocation";
import { assertDatabaseMutationAllowed } from "../../src/lib/preview-security";
import { smsEncodingEstimate } from "../../src/lib/messaging/sms-policy";

export function staffPilotMutationGate() {
  const venue = assertDatabaseMutationAllowed();
  if (!venue.ok) return venue;
  return process.env.LEAD_ALLOCATION_STAFF_PILOT_ENABLED === "true"
    ? { ok: true as const }
    : { ok: false as const, statusCode: 409, error: "staff_pilot_activation_held" };
}
export async function pilotOfferAllowed(sql: AllocationQuery, offerId: string, userId: string) {
  if (!staffPilotMutationGate().ok) return false;
  return Boolean((await sql.query(`SELECT true AS allowed FROM public.lead_allocation_offers o
    JOIN public.agent_operational_enrollment e ON e.agent_id=o.agent_id
    JOIN LATERAL public.staff_allocation_pilot_v1(o.lead_id) p ON p.id=o.pilot_id
    WHERE o.id=$1::uuid AND e.user_id=$2 AND o.agent_id=ANY(p.allowed_agents)`, [offerId, userId]))[0]?.allowed);
}

/** Fixed server templates, never raw inbound text or consumer contact data. */
export function renderStaffCommandReply(action: string, state: string) {
  const safeState = ["offered", "accepted", "passed", "expired", "cancelled", "blocked"].includes(state) ? state : "blocked";
  const messages: Record<string, string> = {
    help: "Our Town / Ask Magic Mike staff pilot: CLAIM, PASS or STATUS plus your offer code. PAUSE holds offers; RESUME does not restore consent after STOP. STOP opts out.",
    status: `Our Town / Ask Magic Mike staff pilot: requested status snapshot ${safeState}. Check the authenticated Lead Center for current details.`,
    verify: "Our Town / Ask Magic Mike: approved mobile possession verified. Review your staff channel preferences in the Lead Center. No consumer permission was granted.",
    pause: "Our Town / Ask Magic Mike: staff offers paused. STOP revokes SMS consent; RESUME cannot undo STOP.",
    resume: "Our Town / Ask Magic Mike: pause removed. Offers still require approved scope, consent, verified mobile and budget. STOP opts out.",
    claim: `Our Town / Ask Magic Mike staff pilot: claim ${safeState}. Delivery is not first human contact. Review the Lead Center.`,
    pass: `Our Town / Ask Magic Mike staff pilot: offer ${safeState}. Custodial review remains in the Lead Center.`,
  };
  const text = messages[action];
  return text ? { text, ...smsEncodingEstimate(text) } : null;
}

export async function queueStaffCommandReply(sql: AllocationQuery, input: {
  agentId: string; userId: string; sid: string; fingerprint: string; body: string;
  action: string; state?: string; providerOptOutType?: string;
}) {
  if (!staffPilotMutationGate().ok || input.action === "stop" || input.providerOptOutType === "START")
    return { replyQueued: false };
  const receipt = `twilio:${input.sid}:staff`;
  // Mutating commands own a canonical receipt; HELP/STATUS get a signed-body
  // hash. No extra receipt or send on provider Advanced Opt-Out responses.
  const existing = (await sql.query("SELECT request_hash,actor_user_id FROM public.lead_allocation_command_receipts WHERE receipt_key=$1", [receipt]))[0];
  if (existing && existing.actor_user_id !== input.userId) return { replyQueued: false };
  const hash = (!["help", "status"].includes(input.action) ? existing?.request_hash : null)
    || createHash("sha256").update(`${input.fingerprint}:${input.body.trim().toUpperCase()}`).digest("hex");
  const rows = await sql.query("SELECT public.queue_staff_allocation_reply_v1($1::uuid,$2,$3,$4,$5,$6,$7::boolean) AS result",
    [input.agentId, input.userId, receipt, hash, input.action, input.state || "ok", Boolean(input.providerOptOutType)]);
  return (rows[0]?.result || { replyQueued: false }) as { replyQueued: boolean; reason?: string; replayed?: boolean };
}
