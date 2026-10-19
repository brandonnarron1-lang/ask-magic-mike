import { createHash } from "node:crypto";
import { z } from "zod";
import { WORKER_VERSION, type WorkerQuery } from "./bounded-workers";
import { approvedPublicSources } from "./public-knowledge";

export const feedbackCategories = ["incorrect_claim", "stale_information", "unsupported_citation", "unsafe_private_content", "handoff_issue", "other"] as const;
export const feedbackSubmissionSchema = z.object({
  answerId: z.string().uuid(), revision: z.number().int().positive(), requestId: z.string().uuid(),
  kind: z.enum(["helpful", "not_helpful", "report"]), category: z.enum(feedbackCategories).nullable().default(null),
  comment: z.string().max(2000).default(""),
}).strict().superRefine((value, context) => {
  if (value.kind === "report" ? !value.category : value.category !== null || value.comment !== "") {
    context.addIssue({ code: "custom", message: "Only reports accept a category and optional comment" });
  }
});
export const feedbackReviewSchema = z.object({
  feedbackId: z.string().uuid(), expectedRevision: z.number().int().positive(), requestId: z.string().uuid(),
  action: z.enum(["classify", "resolve", "reopen", "regression_draft"]),
  category: z.enum(feedbackCategories).nullable().default(null),
}).strict().superRefine((value, context) => {
  if ((value.action === "classify") !== (value.category !== null)) {
    context.addIssue({ code: "custom", message: "Classification alone requires a category" });
  }
});
export type FeedbackViewer = { ownerScope: string; consumerUserId: string | null; consumerSessionId: string | null };
export type FeedbackReceipt = { id: string; kind: "helpful" | "not_helpful" | "report"; category: string | null;
  status: "open" | "resolved"; revision: number; createdAt: string; expiresAt: string };
export type FeedbackQueueItem = FeedbackReceipt & { answerRevision: number; comment: string | null;
  sourceValid: boolean; regressionDraftId: string | null; regressionDraft?: string | null };
export type FeedbackResult = { ok: boolean; error?: string; replayed?: boolean; feedback?: FeedbackReceipt;
  regressionDraftId?: string | null; regressionDraft?: string | null };

/** Best-effort minimization, not an anonymity promise. Never log or send the raw value to AI. */
export function minimizeFeedbackComment(value: string): string {
  const normalized = Array.from(value.normalize("NFKC"), character => {
    const code = character.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159) ? " " : character;
  }).join("");
  return normalized
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/\b\d{3}[- .]\d{2}[- .]\d{4}\b/g, "[identifier removed]")
    .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, "[number removed]")
    .replace(/\b(?:sk-|Bearer\s+)[A-Za-z0-9_-]{8,}/gi, "[credential removed]")
    .replace(/\s+/g, " ").trim().slice(0, 2000);
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function submitAnswerFeedback(sql: WorkerQuery, viewer: FeedbackViewer, raw: unknown): Promise<FeedbackResult> {
  const input = feedbackSubmissionSchema.parse(raw);
  // Hash the exact validated payload BEFORE redaction: two distinct private values are not a replay.
  const hash = digest([input.answerId, input.revision, input.kind, input.category, input.comment]);
  const rows = await sql.query("SELECT public.submit_r2_feedback_v1($1::uuid,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10) AS result", [
    input.answerId, input.revision, viewer.ownerScope, viewer.consumerUserId, viewer.consumerSessionId,
    input.requestId, hash, input.kind, input.category, minimizeFeedbackComment(input.comment),
  ]);
  return (rows[0]?.result as FeedbackResult) ?? { ok: false, error: "feedback_unavailable" };
}

export async function readOwnAnswerFeedback(sql: WorkerQuery, viewer: FeedbackViewer, answerId: string, revision: number) {
  const rows = await sql.query("SELECT public.read_r2_feedback_v1($1::uuid,$2,$3,$4,$5) AS feedback", [answerId, revision,
    viewer.ownerScope, viewer.consumerUserId, viewer.consumerSessionId]);
  return rows[0]?.feedback as FeedbackReceipt[] | null;
}

export async function listFeedbackQueue(sql: WorkerQuery, actor: string) {
  const rows = await sql.query("SELECT public.list_r2_feedback_v1($1) AS feedback", [actor]);
  return rows[0]?.feedback as FeedbackQueueItem[] | null;
}

export async function reviewAnswerFeedback(sql: WorkerQuery, actor: string, raw: unknown): Promise<FeedbackResult> {
  const input = feedbackReviewSchema.parse(raw);
  // Only a synthetic fixed template reaches the existing bounded job service. No comment, reply or viewer scope.
  const contract = input.action === "regression_draft" ? {
    version: WORKER_VERSION, tenant: "ask-magic-mike", actor, role: "quality_operations", eventId: input.requestId,
    entityId: "synthetic-feedback-regression", entityVersion: "1", sourceVersions: {},
    deadline: new Date(Date.now() + 3600000).toISOString(), risk: "read_draft_review", approval: "human_required",
    budget: { steps: 1, tokens: 0, costUsd: 0 }, input: { question: "SYNTHETIC regression-case draft; human review required. No customer text.",
      offer: "buyer", source: approvedPublicSources[0], checkpoint: null },
  } : null;
  const rows = await sql.query("SELECT public.review_r2_feedback_v1($1::uuid,$2,$3::uuid,$4,$5,$6,$7,$8::jsonb) AS result", [
    input.feedbackId, input.expectedRevision, input.requestId, digest([input.feedbackId, input.expectedRevision, input.action, input.category]),
    actor, input.action, input.category, JSON.stringify(contract),
  ]);
  return (rows[0]?.result as FeedbackResult) ?? { ok: false, error: "feedback_unavailable" };
}
