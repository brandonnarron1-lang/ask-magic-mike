import type { OwnedDemandPublicationProofLedger } from "../persistence/neonOwnedDemandPublicationProofs";
import { WORDPRESS_ACQUISITION_GROUPS, currentWordPressChoice, matchesWordPressEvidencePage } from "./wordpress-placement-catalog";

export const ACQUISITION_PLACEMENTS = WORDPRESS_ACQUISITION_GROUPS;
export type AcquisitionPlacement = (typeof ACQUISITION_PLACEMENTS)[number]["key"];
export type AcquisitionFilters = { window?: string | string[]; placement?: string | string[]; from?: string | string[]; to?: string | string[] };
export type AcquisitionWindow = {
  mode: "7" | "30" | "baseline" | "range"; placement: AcquisitionPlacement | "all";
  from: string; to: string; label: string; baseline?: { observedAt: string; recordedAt: string };
};
export const MAX_ACQUISITION_RANGE_MS = 31 * 86_400_000;

/** Explicit offset required: ambiguous/missing DST local times are not guessed. */
export function acquisitionTimestamp(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!m) return null;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  if (year < 2020 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || (second || 0) > 59) return null;
  if (m[8] !== "Z") {
    const [h, n] = m[8].slice(1).split(":").map(Number);
    if (h > 14 || n > 59 || (h === 14 && n !== 0)) return null;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function acquisitionBaselines(ledger: OwnedDemandPublicationProofLedger, now: Date) {
  // Retained PostgreSQL timestamps can have microseconds. Validate those
  // without rewriting stored observation/record times or widening form input.
  const retainedTime = (value: string) => acquisitionTimestamp(value.replace(/(\.\d{3})\d{1,3}(?=Z|[+-]\d{2}:\d{2}$)/, "$1"));
  return Object.fromEntries(ACQUISITION_PLACEMENTS.map(placement => {
    // A capped ledger cannot establish the earliest retained observation.
    const proofs = ledger.configured && ledger.schemaReady && !ledger.error && ledger.proofs.length < 250
      ? ledger.proofs.filter(p => p.channelKey === "ourtown_wordpress" && p.placementKey === placement.key &&
        p.platformState === "live" && ["public_url", "screenshot_reference"].includes(p.proofType) &&
        p.source === "ourtownproperties" && p.medium === "owned_media" && p.campaignKey === "amm_owned_demand_2026" && p.content === placement.key &&
        retainedTime(p.observedAt) && retainedTime(p.createdAt) && Date.parse(p.observedAt) <= now.getTime() &&
        currentWordPressChoice(placement.key, p.trackedUrl) &&
        (p.proofType !== "public_url" || matchesWordPressEvidencePage(placement.key, p.evidenceUrl)))
        .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || Date.parse(a.createdAt) - Date.parse(b.createdAt)) : [];
    const observed = placement.destinations.map(path => proofs.find(p => currentWordPressChoice(placement.key, p.trackedUrl)?.destination === new URL(path, "https://www.askmagicmike.com").toString()));
    if (observed.some(p => !p)) return [placement.key, null];
    // A group becomes observed only once EVERY required choice has evidence.
    // No row multiplication enters the unchanged tag-level aggregate SQL.
    const complete = observed.filter(p => Boolean(p));
    const lastObserved = complete.reduce((latest, p) => Date.parse(p!.observedAt) > Date.parse(latest!.observedAt) ? p : latest);
    const lastRecorded = complete.reduce((latest, p) => Date.parse(p!.createdAt) > Date.parse(latest!.createdAt) ? p : latest);
    return [placement.key, { observedAt: lastObserved!.observedAt, recordedAt: lastRecorded!.createdAt }];
  })) as Record<AcquisitionPlacement, { observedAt: string; recordedAt: string } | null>;
}

export function parseAcquisitionWindow(filters: AcquisitionFilters, ledger: OwnedDemandPublicationProofLedger, now = new Date()): { ok: true; value: AcquisitionWindow } | { ok: false; error: string } {
  if (Object.values(filters).some(v => Array.isArray(v))) return { ok: false, error: "Use one value per acquisition filter." };
  const mode = filters.window ?? "30";
  const placement = filters.placement ?? "all";
  if (!["7", "30", "baseline", "range"].includes(mode as string) || (placement !== "all" && !ACQUISITION_PLACEMENTS.some(p => p.key === placement))) return { ok: false, error: "Choose a supported window and placement." };
  let from: string; let to = now.toISOString();
  let baseline: AcquisitionWindow["baseline"];
  if (mode === "range") {
    from = acquisitionTimestamp(String(filters.from ?? "")) ?? "";
    to = acquisitionTimestamp(String(filters.to ?? "")) ?? "";
  } else if (mode === "baseline") {
    baseline = placement !== "all" ? acquisitionBaselines(ledger, now)[placement as AcquisitionPlacement] ?? undefined : undefined;
    if (!baseline) return { ok: false, error: "Choose one placement with an existing verified live-observation proof. No publication time is inferred from a commit or page modification." };
    from = new Date(baseline.observedAt).toISOString();
  } else {
    from = new Date(now.getTime() - Number(mode) * 86_400_000).toISOString();
  }
  if (!from || !to || Date.parse(from) >= Date.parse(to) || Date.parse(to) > now.getTime() || Date.parse(to) - Date.parse(from) > MAX_ACQUISITION_RANGE_MS) return { ok: false, error: "Use an increasing, non-future range of at most 31 elapsed days, with explicit UTC offsets. Older baselines require a 7/30-day window instead." };
  return { ok: true, value: { mode: mode as AcquisitionWindow["mode"], placement: placement as AcquisitionWindow["placement"], from, to,
    label: mode === "baseline" ? "Since first verified live observation for this tracking tag" : mode === "range" ? "Explicit acceptance window" : `Last ${mode} elapsed days`, ...(baseline ? { baseline } : {}) } };
}
