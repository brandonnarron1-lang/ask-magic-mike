import { createHash } from "node:crypto";
import { z } from "zod";
import { experienceContract } from "../../../app/lib/experienceContract";
import { answerFromApprovedSources, approvedPublicPassages, approvedPublicSources, publicSourceSchema, sourceRetrievable } from "./public-knowledge";
import { reviewedLaunchWorkItem } from "../content/reviewed-launch-work-item";
import {validateSourceSnapshot,sourceRefsValid,observeRegisteredSource,snapshotSchema} from "./source-lifecycle";

export const WORKER_VERSION = "amm.r2.workers.v1";
export const workerRoles = ["source_steward", "research_assistant", "concierge_handoff", "marketing_producer", "quality_operations"] as const;
const sourceVersions = Object.fromEntries(approvedPublicPassages.map(p => [p.id, p.version]));
export const workerJobSchema = z.object({
  version: z.literal(WORKER_VERSION), tenant: z.literal("ask-magic-mike"), actor: z.string().min(1).max(150),
  role: z.enum(workerRoles), eventId: z.string().uuid(), entityId: z.string().min(1).max(100), entityVersion: z.string().min(1).max(100),
  sourceVersions: z.record(z.string().max(180)), deadline: z.string().datetime({ offset: true }),
  risk: z.literal("read_draft_review"), approval: z.literal("human_required"),
  budget: z.object({ steps: z.number().int().min(1).max(8), tokens: z.literal(0), costUsd: z.literal(0) }).strict(),
  input: z.object({ question: z.string().max(2000), offer: z.enum(["homeValue", "buyer", "compare"]),
    source: publicSourceSchema, checkpoint: z.string().max(180).nullable(), contextFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    sourceAuthorization:z.array(z.object({sourceId:z.string(),versionId:z.string().uuid(),revision:z.number().int().positive()}).strict()).min(1).max(3).optional(),
    sourceRefresh:z.object({expectedRevision:z.number().int().positive(),freshnessHours:z.number().int().min(1).max(720)}).strict().optional() }).strict(),
}).strict();
export type WorkerJob = z.infer<typeof workerJobSchema>;
export const workerResultSchema = z.object({
  version: z.literal(WORKER_VERSION), role: z.enum(workerRoles), state: z.enum(["review_required", "quarantined", "blocked"]),
  text: z.string().min(1).max(5000), evidence: z.array(z.string().max(220)).max(10),
  missing: z.array(z.string().max(150)).max(10), steps: z.number().int().min(0).max(8),
  sourceCheckpoint: z.string().max(180).nullable(), effects: z.literal("draft_only_no_send"),
  sourceRefresh:z.object({snapshot:snapshotSchema,contentHash:z.string().regex(/^[a-f0-9]{64}$/),identityHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().optional(),
}).strict();
export type WorkerResult = z.infer<typeof workerResultSchema>;
export type WorkerQuery = { query: (query: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>> };
export type WorkerPrincipal = { tenant: "ask-magic-mike"; actor: string; permittedRoles: readonly WorkerJob["role"][]; permittedLeadIds: readonly string[] };
export type WorkerLead = { id: string; version: string; owner: string | null; intent: string;
  propertyReference: string | null; missing: string[]; permissions: string[]; isTest: boolean; suppressed: boolean; contactBlocked?: boolean };

/** Existing jobs store, not a second queue. Caller must derive principal and
 * lead scope from current server authorization, never a request's role claim. */
export async function enqueueWorker(sql: WorkerQuery, principal: WorkerPrincipal, raw: unknown, leadId: string | null = null) {
  const job = workerJobSchema.parse(raw);
  if (job.actor !== principal.actor || job.tenant !== principal.tenant || !principal.permittedRoles.includes(job.role)
    || (leadId !== null && (!principal.permittedLeadIds.includes(leadId) || job.entityId !== leadId))
    || (job.role === "concierge_handoff" && !leadId)) throw new Error("worker_scope_denied");
  const key = `r2:${createHash("sha256").update(JSON.stringify([job.tenant, job.actor, job.role, job.eventId])).digest("hex")}`;
  const rows = await sql.query("SELECT public.enqueue_r2_worker_v1($1,$2::uuid,$3,$4::jsonb) AS result", [key, leadId, principal.actor, JSON.stringify(job)]);
  const result = rows[0]?.result as { ok?: boolean; error?: string; id?: string; replay?: boolean } | undefined;
  if (!result?.ok) throw new Error(result?.error || "worker_enqueue_failed");
  return result;
}

/** No arbitrary network address, redirects, model tools, customer lookup or
 * recurring schedule. The one owned public contract is fetched conditionally.
 * Changed content is quarantined, never promoted to approved business facts. */
export async function executeWorker(raw: unknown, context: {
  now: Date; principal: WorkerPrincipal; fetchSource?: typeof fetch; lead?: WorkerLead;
}): Promise<WorkerResult> {
  const job = workerJobSchema.parse(raw);
  const result = (state: WorkerResult["state"], text: string, extra: Partial<WorkerResult> = {}) => workerResultSchema.parse({
    version: WORKER_VERSION, role: job.role, state, text, evidence: [], missing: [], steps: 1,
    sourceCheckpoint: job.input.checkpoint, effects: "draft_only_no_send", ...extra,
  });
  const deadline = Date.parse(job.deadline), current = context.now.getTime();
  if (!Number.isFinite(current) || deadline <= current || deadline - current > 7 * 86_400_000
    || job.actor !== context.principal.actor || job.tenant !== context.principal.tenant
    || !context.principal.permittedRoles.includes(job.role)) return result("blocked", "Current actor, scope or deadline is not valid.");
  if (JSON.stringify(Object.entries(job.sourceVersions).sort()) !== JSON.stringify(Object.entries(sourceVersions).sort())) return result("quarantined", "Source passage version changed; review required.");
  if(job.input.sourceRefresh){
    const refresh=job.input.sourceRefresh;
    if(job.role!=="source_steward"||job.entityId!==job.input.source.id||job.entityVersion!==String(refresh.expectedRevision)
      ||!validateSourceSnapshot({source:{...job.input.source,fetchedAt:context.now.toISOString()},passages:approvedPublicPassages},context.now).valid
      ||!context.fetchSource||job.budget.steps<2)return result("blocked","A registered Source Steward revision fence, transport and two steps are required.");
    try{
      const observation=await observeRegisteredSource(job.entityId,refresh.freshnessHours,context.fetchSource);
      return result(observation.snapshot.observation!.matchedPinnedContent?"review_required":"quarantined",
        observation.snapshot.observation!.reason,{steps:2,sourceRefresh:observation,
          evidence:[job.input.source.url,`sha256:${observation.snapshot.observation!.rawContentHash}`]});
    }catch(error){return result("blocked",error instanceof Error&&error.message==="source_too_large"?"source_too_large":"source_fetch_unavailable",{steps:2});}
  }
  if (!(job.input.sourceAuthorization?validateSourceSnapshot({source:job.input.source,passages:approvedPublicPassages},context.now).valid:approvedPublicSources.some(s => JSON.stringify(s) === JSON.stringify(job.input.source)))
    || !sourceRetrievable(job.input.source, context.now)) return result("quarantined", "Source rights, version or freshness needs review.");
  if (job.role === "source_steward") {
    if (!context.fetchSource || job.budget.steps < 2) return result("blocked", "An authorized source transport and two steps are required.");
    try {
      const response = await context.fetchSource(job.input.source.url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(5000),
        headers: job.input.checkpoint ? { "If-None-Match": job.input.checkpoint } : {} });
      // A 304 alone does not establish that this checkpoint was ever approved.
      const checkpoint = `"${createHash("sha256").update(JSON.stringify(experienceContract)).digest("hex")}"`;
      if (response.status === 304) return result(job.input.checkpoint === checkpoint ? "review_required" : "quarantined", "Conditional source response; reviewed snapshot remains the authority.", { steps: 2 });
      if (response.status === 404 || response.status === 410) return result("quarantined", "Source removed: stop retrieval; request reviewed registry tombstone.", { steps: 2 });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return result("blocked", "Source transport unavailable; no automatic retry or freshness extension.", { steps: 2 });
      const reader = response.body?.getReader(); if (!reader) throw new Error("source_body_missing");
      const chunks: Uint8Array[] = []; let bytes = 0;
      try { while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.length;
        if (bytes > 32_000) throw new Error("source_too_large"); chunks.push(part.value); } }
      finally { await reader.cancel(); }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (JSON.stringify(body) !== JSON.stringify(experienceContract)) return result("quarantined", "Source schema/content changed; a human must review the delta before use.", { steps: 2 });
      return result("review_required", "Owned contract matched the reviewed snapshot. Refresh observation is not automatic registry approval.", { steps: 2, sourceCheckpoint: checkpoint, evidence: [job.input.source.url, context.now.toISOString()] });
    } catch { return result("blocked", "Source fetch failed safely; retry is bounded by the durable job attempt/deadline.", { steps: 2 }); }
  }
  if (job.role === "concierge_handoff") {
    const lead = context.lead;
    if (!lead || !z.string().uuid().safeParse(lead.id).success || lead.id !== job.entityId || lead.version !== job.entityVersion) return result("blocked", "The authorized inquiry version is missing or changed.");
    return result("review_required", ["Review saved inquiry; no contact or task has been executed.", `Intent: ${lead.intent}.`,
      `Property reference: ${lead.propertyReference || "Not recorded"} (user-reported, not verified).`,
      `Canonical owner: ${lead.owner || "Not assigned"}.`, `Contact permissions: ${lead.permissions.join(", ") || "Not established"}.`,
      `Approved service source as of ${job.input.source.fetchedAt}; freshness limit ${job.input.source.freshnessHours} hours. This is not property verification.`,
      lead.isTest || lead.suppressed || lead.contactBlocked ? "DO NOT CONTACT: test, suppressed or closed record." : "Fresh permission review is required before any contact.",
      `Proposed next task: review missing context before ${job.deadline}; not scheduled.`,
      `/admin/leads/${lead.id}`].join("\n"), { evidence: [job.input.source.url], missing: lead.missing });
  }
  const answer = answerFromApprovedSources(job.input.question, { now: context.now,
    ...(job.input.sourceAuthorization?{sources:[job.input.source],passages:approvedPublicPassages}:{}) });
  if (job.role === "research_assistant") return result(answer.mode === "approved_source" ? "review_required" : "blocked", answer.message,
    { evidence: answer.citations.map(c => `${c.url}#${c.id}@${c.version}`), missing: ["Licensed property/comparable data not established"] });
  if (job.role === "marketing_producer") {
    // Public-knowledge AI rights do NOT imply marketing rights. Use the separate
    // already-approved launch template/asset instead; never repurpose its text.
    if (job.input.offer === "compare") return result("blocked", "No compare-option template is approved in this launch kit; separate review is required.");
    const work = reviewedLaunchWorkItem(job.input.offer === "buyer" ? "buyer" : "seller", "facebook");
    return result("review_required", `${work.caption}\n${work.link}\nAsset: ${work.asset}\nDRAFT ONLY — human review and separate publication authority required.`,
      { evidence: [`${work.source}@${work.sourceHash}`, `asset:sha256:${work.assetHash}`] });
  }
  return result("review_required", "Contract check: public offer destinations are canonical; freshness/rights checked. Delivery and task anomalies were NOT inspected; no operational health claim or repair.",
    { evidence: Object.values(experienceContract.offers).map(o => `https://www.askmagicmike.com${o.destination}`), missing: ["Authorized operational evidence for task/delivery anomalies"] });
}

export function currentWorkerSourceVersions() { return { ...sourceVersions }; }

/** Runs one claimed job. No live endpoint/cron installation is introduced.
 * Result and a lead action-review request (when relevant) commit together. */
export async function runOneWorker(sql: WorkerQuery, workerId: string, context: Parameters<typeof executeWorker>[1], targetJobId?: string) {
  const targetedRefresh=!!targetJobId&&context.principal.permittedRoles.includes("source_steward")&&!context.principal.permittedRoles.includes("concierge_handoff");
  if (targetJobId && !targetedRefresh&&!context.principal.permittedRoles.includes("concierge_handoff")) throw new Error("worker_scope_denied");
  const rows = targetJobId
    ? targetedRefresh?await sql.query("SELECT public.claim_r2_worker_v1($1,$2,$3::text[],$4::uuid) AS job",[workerId,context.principal.actor,["source_steward"],targetJobId])
      :await sql.query("SELECT public.claim_r2_handoff_v1($1::uuid,$2,$3) AS job", [targetJobId, workerId, context.principal.actor])
    : await sql.query("SELECT public.claim_r2_worker_v1($1,$2,$3::text[]) AS job", [workerId, context.principal.actor, [...context.principal.permittedRoles]]);
  const row = rows[0]?.job as { id: string; lead_id: string | null; r2_lease_token: string; r2_contract: unknown; requested_by: string } | null;
  if (!row) return { processed: 0 };
  if (row.lead_id && (!context.principal.permittedLeadIds.includes(row.lead_id) || context.lead?.id !== row.lead_id)) throw new Error("worker_current_lead_scope_denied");
  const contract=workerJobSchema.parse(row.r2_contract);
  if(contract.input.sourceRefresh){
    const fence=(await sql.query("SELECT public.r2_source_refresh_fence_v1($1::uuid,$2::uuid) AS valid",[row.id,row.r2_lease_token]))[0]?.valid;
    if(fence!==true){
      await sql.query("SELECT public.complete_r2_worker_v1($1::uuid,$2::uuid,$3::jsonb)",[row.id,row.r2_lease_token,JSON.stringify({version:WORKER_VERSION,role:contract.role,state:"blocked",text:"source_revision_changed",effects:"draft_only_no_send",steps:0})]);
      throw Error("source_revision_changed");
    }
  }else if(contract.input.sourceAuthorization&&!await sourceRefsValid(sql,contract.input.sourceAuthorization)
    ||!contract.input.sourceRefresh&&!contract.input.sourceAuthorization&&(await sql.query("SELECT EXISTS(SELECT 1 FROM public.intelligence_sources) AS governed"))[0]?.governed===true){
    await sql.query("SELECT public.complete_r2_worker_v1($1::uuid,$2::uuid,$3::jsonb)",[row.id,row.r2_lease_token,JSON.stringify({version:WORKER_VERSION,role:contract.role,state:"blocked",text:"Source invalid; no retrieval or model invocation",effects:"draft_only_no_send",steps:0})]);
    throw Error("worker_source_invalid");
  }
  const output = await executeWorker(row.r2_contract, context);
  const completed = await sql.query("SELECT public.complete_r2_worker_v1($1::uuid,$2::uuid,$3::jsonb) AS result", [row.id, row.r2_lease_token, JSON.stringify(output)]);
  const receipt = completed[0]?.result as { ok?: boolean; error?: string } | undefined;
  if (!receipt?.ok) throw new Error(receipt?.error || "worker_completion_rejected");
  return { processed: 1, id: row.id, output };
}
