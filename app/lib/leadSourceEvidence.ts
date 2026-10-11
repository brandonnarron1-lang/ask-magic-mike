/** Read-only evidence for ONE retained inquiry. Never infer capture from a
 * campaign name, copy canonical attribution onto repeats, or backfill history. */
export type SourceFact = Readonly<{
  value: string | null;
  provenance: "retained_intake_field" | "client_reported" | "not_recorded" | "not_established";
}>;
export type TouchEvidence = Readonly<{
  source: SourceFact;
  medium: SourceFact;
  campaign: SourceFact;
  content: SourceFact;
  placement: SourceFact;
}>;
export type LeadSourceEvidence = Readonly<{
  inquiry: TouchEvidence;
  firstTouch: TouchEvidence;
  latestTouch: TouchEvidence;
  captureSurface: SourceFact;
  selectedFunnel: SourceFact;
  selectedTab: SourceFact;
  transportAdapter: SourceFact;
  notification: Readonly<{ recordedIntentsInLoadedWindow: number | null; receipt: "not_established" }>;
}>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function fact(value: unknown, provenance: SourceFact["provenance"]): SourceFact {
  const text = typeof value === "string" ? value.trim() : "";
  return { value: text || null, provenance: text ? provenance : "not_recorded" };
}
function touch(value: unknown): TouchEvidence {
  const row = record(value);
  return {
    source: fact(row.source, "client_reported"),
    medium: fact(row.medium, "client_reported"),
    campaign: fact(row.campaign, "client_reported"),
    content: fact(row.content, "client_reported"),
    placement: fact(row.placement || row.placement_id, "client_reported"),
  };
}
const surfaces = new Set(["home_value_page", "buyer_page", "renter_page", "seller_page", "ask_page", "widget", "open_house"]);

export function projectLeadSourceEvidence(
  row: Record<string, unknown>,
  notificationRows?: readonly Record<string, unknown>[],
): LeadSourceEvidence {
  const attribution = record(row.attribution);
  // source_detail's first component is retained by the canonical handler.
  // Do not use generic row.source (an acquisition channel) as a surface.
  const detailSurface = typeof row.source_detail === "string" ? row.source_detail.split(" / ")[0] : null;
  const candidate = row.lead_source_surface || detailSurface;
  const captureSurface = typeof candidate === "string" && surfaces.has(candidate) ? candidate : null;
  return {
    inquiry: touch(attribution),
    firstTouch: touch(attribution.first_touch),
    latestTouch: touch(attribution.last_touch),
    captureSurface: fact(captureSurface, "retained_intake_field"),
    selectedFunnel: fact(row.funnel_type || row.lead_type, "retained_intake_field"),
    // These fields do not establish a tab selection or a signed transport.
    selectedTab: fact(null, "not_recorded"),
    transportAdapter: { value: null, provenance: "not_established" },
    notification: { recordedIntentsInLoadedWindow: notificationRows ? notificationRows.length : null, receipt: "not_established" },
  };
}
