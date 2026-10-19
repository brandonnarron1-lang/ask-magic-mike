/** Public, additive chat projection. Never a lead, consent or action authority. */
export const PUBLIC_KNOWLEDGE_VERSION = "amm.public-knowledge.v1";

export type PublicCitation = {
  id: string;
  title: string;
  url: string;
  version: string;
  asOf: string;
};

export type GroundedReply = {
  message: string;
  mode: "approved_source" | "source_unavailable" | "review_required";
  citations: PublicCitation[];
  limitation: string;
};

// Responses are still untrusted at the client boundary. Do not render arbitrary
// provider links or HTML, even if a later adapter returns a malformed DTO.
export function readPublicCitations(value: unknown): PublicCitation[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (["id", "title", "url", "version", "asOf"].some((key) => typeof row[key] !== "string")) return [];
    const citation = row as PublicCitation;
    if (citation.url !== "https://www.askmagicmike.com/api/experience/v1"
      || citation.title.length > 100 || citation.version.length > 160
      || !Number.isFinite(Date.parse(citation.asOf))) return [];
    return [citation];
  });
}
