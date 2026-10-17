import { createHash } from "node:crypto";
import { z } from "zod";
import sources from "../../../config/public-knowledge-sources.v1.json";
import { experienceContract } from "../../../app/lib/experienceContract";
import type { GroundedReply } from "../../../app/lib/groundedConciergeContract";
import { detectPromptInjection } from "../ai/guardrails";

const timestamp = z.string().datetime({ offset: true });
export const publicSourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  owner: z.string().min(1).max(200), provider: z.string().min(1).max(200),
  url: z.literal("https://www.askmagicmike.com/api/experience/v1"),
  licenseScope: z.string().min(1).max(300), grantReference: z.string().min(1).max(300),
  audience: z.literal("public"),
  permissions: z.object({ display: z.boolean(), ai: z.boolean(), marketing: z.boolean(), embedding: z.boolean(), training: z.boolean() }).strict(),
  geography: z.array(z.string().max(200)).min(1).max(10),
  fieldMapping: z.object({ passage: z.string().max(150), destination: z.string().max(150) }).strict(),
  effectiveAt: timestamp, upstreamModifiedAt: timestamp.nullable(), fetchedAt: timestamp,
  freshnessHours: z.number().int().min(1).max(720),
  status: z.enum(["active", "revoked", "deleted", "quarantined"]),
  revocation: z.string().min(1).max(300), refresh: z.string().min(1).max(300),
}).strict();
export type PublicSource = z.infer<typeof publicSourceSchema>;
export const approvedPublicSources = sources.sources.map((row) => publicSourceSchema.parse(row));

export type KnowledgePassage = { id: string; sourceId: string; version: string; text: string; intent: "buyer" | "homeValue" | "compare" };
export const approvedPublicPassages: KnowledgePassage[] = Object.entries(experienceContract.offers).map(([key, offer]) => ({
  id: `offer-${key}`, sourceId: "ourtown-experience", intent: key as KnowledgePassage["intent"],
  version: `${experienceContract.version}:${createHash("sha256").update(JSON.stringify(offer)).digest("hex")}`,
  text: `${offer.required}. ${offer.claim}. ${offer.evidence}.`,
}));

export function sourceRetrievable(source: PublicSource, now: Date) {
  const parsed = publicSourceSchema.safeParse(source);
  if (!parsed.success || !Number.isFinite(now.getTime())) return false;
  const s = parsed.data;
  const fetched = Date.parse(s.fetchedAt);
  return s.status === "active" && s.permissions.display === true && s.permissions.ai === true
    && Date.parse(s.effectiveAt) <= now.getTime() && fetched <= now.getTime()
    && (s.upstreamModifiedAt === null || Date.parse(s.upstreamModifiedAt) <= fetched)
    && now.getTime() - fetched <= s.freshnessHours * 3_600_000;
}

/** No arbitrary URL fetch, vector service, lead lookup, storage or model call.
 * Only exact approved passages can become answer text. Conversation text is
 * never added to this registry. The existing adapter remains a separate gate.
 */
export function answerFromApprovedSources(question: string, options: {
  now?: Date; sources?: PublicSource[]; passages?: KnowledgePassage[];
} = {}): GroundedReply {
  const limitation = "AI assistant for Our Town Properties, not Mike personally. Educational starting point only; no verified listing, valuation, offer, financing or appointment.";
  const reply = (message: string, mode: GroundedReply["mode"] = "review_required"): GroundedReply => ({ message, mode, citations: [], limitation });
  if (question.length > 2_000 || !question.trim()) return reply("Please enter a real estate question of 2,000 characters or fewer.");
  if (detectPromptInjection(question).blocked || /\b(system prompt|api.?key|password|secret|other (user|customer)|private (record|note)|ignore.{0,30}instructions)\b/i.test(question)) {
    return reply("I cannot disclose private records or follow instructions that change access or contact permissions. You can ask about the public buying or selling process.");
  }
  if (/\b(race|religion|ethnic|protected class|white people|black people|families only|safe neighborhood|crime-free)\b/i.test(question)) {
    return reply("I cannot steer housing choices using protected characteristics or make unsupported neighborhood claims. You can specify objective needs such as budget, property features and travel distance.");
  }
  if (/\b(mls|comp(s|arables)?|price|worth|valuation|available|availability|mortgage|approval|interest rate|market stats|median|sold for|tax|school boundary)\b/i.test(question)) {
    // An offer contract establishes how to request review, not property facts.
    return reply("I do not have verified property, MLS, pricing, financing or current market evidence for that question. Review your question below if you want to request a local human review; nothing has been submitted or scheduled.");
  }
  const intent = /\b(compare|as.is|cash offer|selling options)\b/i.test(question) ? "compare"
    : /\b(buy|buyer|buying|search|financing)\b/i.test(question) ? "buyer"
      : /\b(sell|seller|selling|home value|prepar|list|listing)\b/i.test(question) ? "homeValue" : null;
  if (!intent) return reply("I can explain the approved buying-plan, home-value review and compare-selling-options paths. For other questions, review your question below and deliberately request local follow-up.");
  const now = options.now ?? new Date();
  const registry = options.sources ?? approvedPublicSources;
  const passages = (options.passages ?? approvedPublicPassages).filter((p) => p.intent === intent);
  const eligible = passages.filter((p) => {
    const matching = registry.filter((s) => s.id === p.sourceId);
    // Duplicate identities or conflicting passage versions are quarantined,
    // not silently resolved by whichever record happened to arrive last.
    return matching.length === 1 && sourceRetrievable(matching[0], now);
  });
  if (eligible.length !== 1) return reply("Current approved guidance is unavailable, stale or conflicting. You can still use the existing public forms for a human review. Nothing has been submitted.", "source_unavailable");
  const passage = eligible[0];
  // Refresh adapters cannot substitute free-form remote prose for reviewed
  // business promises. A new passage requires a separately reviewed snapshot.
  if (!approvedPublicPassages.some((p) => p.id === passage.id && p.version === passage.version && p.text === passage.text && p.sourceId === passage.sourceId && p.intent === passage.intent)) {
    return reply("This source update needs review before it can be used in an answer.", "source_unavailable");
  }
  const source = registry.find((s) => s.id === passage.sourceId)!;
  return {
    message: passage.text, mode: "approved_source", limitation,
    citations: [{ id: passage.id, title: "Our Town: approved service and intake requirements", url: source.url, version: passage.version, asOf: source.fetchedAt }],
  };
}
