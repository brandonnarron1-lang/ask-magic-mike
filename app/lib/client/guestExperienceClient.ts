import { readExperience } from "./experienceClient";
import { PUBLIC_KNOWLEDGE_VERSION, readPublicCitations, type GroundedReply } from "../groundedConciergeContract";
import { guestInterest, MAX_GUEST_INTERESTS, type GuestInterest } from "../consumerInterests";

/** Shared web/native public transport only. No staff sessions, account-token
 * workaround, background submission, credential storage or write queue. Native
 * authentication remains held until its actual supported audience flow exists. */
export function createGuestExperienceClient(transport: typeof fetch, origin = "https://www.askmagicmike.com") {
  if (origin !== "https://www.askmagicmike.com") throw new Error("canonical_public_origin_required");
  const scoped: typeof fetch = (input, init) => {
    if (typeof input !== "string" || !["/api/experience/v1", "/api/chat/message"].includes(input)) throw new Error("public_client_path_denied");
    return transport(`${origin}${input}`, { ...init, credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
  };
  return {
    contract: (signal?: AbortSignal) => readExperience(scoped, signal),
    async ask(question: string, signal?: AbortSignal): Promise<GroundedReply> {
      if (!question.trim() || question.length > 2000) throw new Error("question_invalid");
      const response = await scoped("/api/chat/message", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({ message: question, knowledge_version: PUBLIC_KNOWLEDGE_VERSION }), signal });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("guidance_unavailable");
      const raw: unknown = await response.json();
      if (!raw || typeof raw !== "object") throw new Error("guidance_invalid");
      const dto = raw as Record<string, unknown>;
      if (typeof dto.message !== "string" || dto.message.length > 5000 || typeof dto.limitation !== "string" || dto.limitation.length > 1000
        || !["approved_source", "source_unavailable", "review_required"].includes(String(dto.mode))) throw new Error("guidance_invalid");
      const citations = readPublicCitations(dto.citations);
      if (dto.mode === "approved_source" && (!Array.isArray(dto.citations) || citations.length !== dto.citations.length || !citations.length)) throw new Error("guidance_citation_invalid");
      return { message: dto.message, limitation: dto.limitation, mode: dto.mode as GroundedReply["mode"], citations };
    },
  };
}

export type GuestClientState = { version: "amm.guest-client.v1"; interests: GuestInterest[]; plan: string; submission: "NOT_SUBMITTED" };
export const emptyGuestClientState = (): GuestClientState => ({ version: "amm.guest-client.v1", interests: [], plan: "", submission: "NOT_SUBMITTED" });
export function saveGuestDraft(state: GuestClientState, input: { id: string; kind: "property" | "search"; value: string; budget: string }): GuestClientState {
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("draft_identity_invalid");
  const item = guestInterest(input, input.id);
  const interests = [...state.interests.filter(row => row.id !== item.id), item];
  if (interests.length > MAX_GUEST_INTERESTS) throw new Error("draft_limit_reached");
  return { ...state, interests, submission: "NOT_SUBMITTED" };
}
