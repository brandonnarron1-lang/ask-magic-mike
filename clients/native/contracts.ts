// Read-only public imports. Repoint this facade when main selects the native
// location/Metro watchFolders; do not copy a server module into the bundle.
export {
  PUBLIC_KNOWLEDGE_VERSION, readPublicCitations,
  type GroundedReply, type PublicCitation,
} from "../../app/lib/groundedConciergeContract";
export { experienceContract, experienceDestination, type ExperienceOfferKey } from "../../app/lib/experienceContract";
export { guestInterest, MAX_GUEST_INTERESTS, type GuestInterest } from "../../app/lib/consumerInterests";

// Public wire projections observed in R2, not imports from Node/SQL modules.
// Move these into a reviewed public contract in a later, unfrozen change.
export type SourceRef = { sourceId: string; versionId: string; revision: number };
export type AnswerRef = { answerId: string; revision: number };
export type FeedbackReceipt = {
  id: string; kind: "helpful" | "not_helpful" | "report"; category: string | null;
  status: "open" | "resolved"; revision: number; createdAt: string; expiresAt: string;
};
export const feedbackCategories = ["incorrect_claim", "stale_information", "unsupported_citation", "unsafe_private_content", "handoff_issue", "other"] as const;
export type FeedbackCategory = typeof feedbackCategories[number];
export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const isRevision = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
export const isAnswerRef = (v: unknown): v is AnswerRef & Record<string, unknown> => isRecord(v) && isUuid(v.answerId) && isRevision(v.revision);
