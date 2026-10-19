import "server-only";
import { createHash } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import type { PoolClient } from "pg";
import { consumerPool } from "./runtime";
import type { ConsumerPrincipal } from "./auth";
import { consumerInterestWrite, readConsumerWorkspaceWrite, type ConsumerProfile, type ConsumerWorkspaceSnapshot } from "../../../app/lib/consumerWorkspaceContract";
import type { GuestInterest } from "../../../app/lib/consumerInterests";

export class ConsumerWorkspaceError extends Error {
  constructor(public status: 401 | 403 | 409, message: string) { super(message); }
}
type Subject = { name: string; email: string; emailVerified: boolean };
async function subject(client: PoolClient, principal: ConsumerPrincipal, lock = false): Promise<Subject> {
  const result = await client.query<Subject>(`SELECT u.name,u.email,u."emailVerified" FROM public.consumer_users u JOIN public.consumer_sessions s ON s."userId"=u.id WHERE u.id=$1 AND s.id=$2 AND s."expiresAt">clock_timestamp() AND u.audience='consumer' AND NOT u.disabled${lock ? " FOR SHARE OF u,s" : ""}`, [principal.userId, principal.sessionId]);
  if (result.rows.length !== 1) throw new ConsumerWorkspaceError(401, "session_unavailable");
  return result.rows[0];
}
async function scoped(client: PoolClient, userId: string) {
  await client.query("SELECT set_config('amm.consumer_user_id',$1,true)", [userId]);
  await client.query("SET LOCAL ROLE amm_consumer_workspace_v1");
}
function snapshot(row?: { revision: number; interests: unknown; updated_at: Date }): ConsumerWorkspaceSnapshot {
  if (!row) return { version: "amm.consumer-workspace.v1", revision: 0, interests: [], updatedAt: null };
  if (!Array.isArray(row.interests) || row.interests.some(item => !item || typeof item !== "object" || Object.keys(item).some(k => !["id","label","declared","provenance"].includes(k)) || item.provenance !== "user_reported_unverified")) throw new Error("stored_workspace_invalid");
  const normalized = readConsumerWorkspaceWrite({ revision: row.revision, interests: consumerInterestWrite(row.interests as GuestInterest[]) });
  // JSONB object order is not meaning; extra fields or claimed verification are.
  const stable=(v:unknown):string=>JSON.stringify(v,(_k,value)=>value&&typeof value==="object"&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
  if(stable(normalized.interests)!==stable(row.interests))throw new Error("stored_workspace_invalid");
  return { version: "amm.consumer-workspace.v1", revision: row.revision, interests: normalized.interests, updatedAt: new Date(row.updated_at).toISOString() };
}
async function audit(client: PoolClient, principal: ConsumerPrincipal, action: string, revision?: number) {
  const hash = createHash("sha256").update(`amm:consumer-audit:v1:${principal.userId}`).digest("hex");
  await client.query("INSERT INTO public.audit_logs(actor,action,resource_type,metadata) VALUES('consumer',$1,'consumer_workspace',$2::jsonb)", [action,JSON.stringify({ subject_hash: hash, ...(revision===undefined?{}:{revision}), version:1 })]);
}
async function transaction<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await consumerPool().connect();
  try { await client.query("BEGIN");await client.query("SET LOCAL statement_timeout='5s'");const result=await operation(client);await client.query("COMMIT");return result; }
  catch(error) { await client.query("ROLLBACK");throw error; } finally { client.release(); }
}
export function readConsumerWorkspace(principal: ConsumerPrincipal) {
  return transaction(async client => {
    const user=await subject(client,principal);
    await scoped(client,principal.userId);
    const row=(await client.query("SELECT revision,interests,updated_at FROM public.consumer_workspaces WHERE user_id=$1",[principal.userId])).rows[0];
    await client.query("RESET ROLE");
    // Own minimized answer/feedback evidence only. No staff identity, draft,
    // inquiry, score or cross-account lookup is introduced by account export.
    const intelligence=process.env.R2_SOURCE_GOVERNANCE_ENABLED==="true"?{
      answers:(await client.query(`WITH own AS MATERIALIZED (
        SELECT id,revision,created_at,expires_at,reply,source_refs,public.r2_sources_valid_v1(source_refs,'public') AS current_source_valid
        FROM public.intelligence_answers WHERE consumer_user_id=$1 AND expires_at>clock_timestamp()
       ) SELECT id,revision,created_at,expires_at,CASE WHEN current_source_valid THEN reply ELSE NULL::jsonb END AS reply,
         source_refs,current_source_valid FROM own ORDER BY created_at`,[principal.userId])).rows,
      feedback:(await client.query("SELECT f.id,f.answer_id,f.answer_revision,f.kind,f.category,f.comment,f.status,f.revision,f.created_at,f.expires_at FROM public.intelligence_answer_feedback f JOIN public.intelligence_answers a ON a.id=f.answer_id AND a.revision=f.answer_revision AND a.consumer_user_id=f.consumer_user_id WHERE f.consumer_user_id=$1 AND f.expires_at>clock_timestamp() AND a.expires_at>clock_timestamp() ORDER BY f.created_at",[principal.userId])).rows,
    }:undefined;
    return { profile:{...user,audience:"consumer"} as ConsumerProfile, workspace:snapshot(row),...(intelligence?{intelligence}:{} ) };
  });
}
export function saveConsumerWorkspace(principal: ConsumerPrincipal, input: ReturnType<typeof readConsumerWorkspaceWrite>) {
  return transaction(async client => {
    await subject(client,principal,true);await scoped(client,principal.userId);
    const result=input.revision===0
      ? await client.query("INSERT INTO public.consumer_workspaces(user_id,interests) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO NOTHING RETURNING revision,interests,updated_at",[principal.userId,JSON.stringify(input.interests)])
      : await client.query("UPDATE public.consumer_workspaces SET interests=$3::jsonb,revision=revision+1,updated_at=clock_timestamp() WHERE user_id=$1 AND revision=$2 RETURNING revision,interests,updated_at",[principal.userId,input.revision,JSON.stringify(input.interests)]);
    if(result.rows.length!==1)throw new ConsumerWorkspaceError(409,"workspace_changed_read_saved_version");
    await client.query("RESET ROLE");await audit(client,principal,"consumer.workspace_saved",result.rows[0].revision);
    return snapshot(result.rows[0]);
  });
}
export async function deleteConsumerAccount(principal: ConsumerPrincipal, password: string) {
  const original=(await consumerPool().query("SELECT password FROM public.consumer_accounts WHERE \"userId\"=$1 AND \"providerId\"='credential'",[principal.userId])).rows[0]?.password;
  if(typeof original!=="string"||!await verifyPassword({hash:original,password}))throw new ConsumerWorkspaceError(403,"account_confirmation_failed");
  return transaction(async client => {
    await subject(client,principal,true);
    const current=(await client.query("SELECT password FROM public.consumer_accounts WHERE \"userId\"=$1 AND \"providerId\"='credential' FOR SHARE",[principal.userId])).rows[0]?.password;
    if(current!==original)throw new ConsumerWorkspaceError(409,"credentials_changed_sign_in_again");
    // FK cascades remove workspace, accounts and all consumer sessions. There is
    // intentionally no FK or email-based path into canonical inquiry records.
    await client.query("DELETE FROM public.consumer_users WHERE id=$1",[principal.userId]);
    await audit(client,principal,"consumer.account_deleted");
    return {deleted:true,retained:"Separate inquiries and required brokerage/audit records are not erased by account deletion."};
  });
}
