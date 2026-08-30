import { createHash } from "node:crypto";
import {
  fetchAllowlistedWordPressText,
  normalizeWordPressActivationUrl,
  safeWordPressPageRows,
  WORDPRESS_PAGE_INDEX_URL,
  type WordPressPageIndexRow,
} from "./wordpress-activation-change-set";

export const WORDPRESS_SELLER_INTENT_DECISION_KEY =
  "wordpress_seller_intent_decision" as const;

const ASK_MAGIC_MIKE_HOSTS = new Set([
  "askmagicmike.com",
  "www.askmagicmike.com",
]);

const SURFACE_DEFINITIONS = [
  {
    key: "we_buy_homes",
    label: "We Buy Homes",
    sourcePage: "https://www.ourtownproperties.com/we-buy-homes/",
    expectedPageId: 3631,
  },
  {
    key: "we_buy_houses",
    label: "We Buy Houses",
    sourcePage: "https://www.ourtownproperties.com/we-buy-houses/",
    expectedPageId: 4364,
  },
] as const;

export type WordPressSellerIntentSurfaceKey =
  (typeof SURFACE_DEFINITIONS)[number]["key"];

export type WordPressSellerIntentDecisionStatus =
  | "decision_required"
  | "reconciliation_required"
  | "fetch_failed";

export interface WordPressSellerIntentSurfaceEvidence {
  key: WordPressSellerIntentSurfaceKey;
  label: string;
  sourcePage: string;
  expectedPageId: number;
  pageId: number | null;
  pageIdMatches: boolean;
  pageModifiedGmt: string | null;
  canonicalHref: string | null;
  canonicalOccurrences: number;
  selfCanonical: boolean;
  metaNoindex: boolean;
  indexableCandidate: boolean;
  askMagicMikeHrefOccurrences: number;
  rejectedAskMagicMikeHrefOccurrences: number;
  nativeLeadFormOccurrences: number;
  gravityFormIds: number[];
  captureSystems: string[];
  captureSystemCount: number;
}

export interface WordPressSellerIntentDecisionManifest {
  schemaVersion: "amm.wordpress_seller_intent_decision.v1";
  manifestKey: typeof WORDPRESS_SELLER_INTENT_DECISION_KEY;
  generatedAt: string;
  mode: "read_only_canonical_decision";
  status: WordPressSellerIntentDecisionStatus;
  statusDetail: string;
  publicationBlocked: true;
  publicationAuthorized: false;
  publicationGateIssued: false;
  decisionRequired: true;
  proposedCanonicalFunnel: "https://www.askmagicmike.com/sell";
  trackedPublicationHref: null;
  trackingStatus: "withheld_until_canonical_page_and_placement_key_are_approved";
  surfaces: WordPressSellerIntentSurfaceEvidence[];
  blockers: string[];
  requiredDecision: {
    canonicalSourcePage: null;
    captureOwner: null;
    duplicatePageDisposition: null;
    placementKey: null;
  };
  decisionSteps: string[];
  evidenceSha256: string;
  mutationPerformed: false;
  wordpressMutationPerformed: false;
  databaseMutationPerformed: false;
  leadSubmitted: false;
  notificationSent: false;
  containsRawPageHtml: false;
  fetchErrorCodes?: string[];
}

function readAttribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  if (quoted) return quoted[2].trim();
  const unquoted = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*([^\\s>]+)`, "i"));
  return unquoted ? unquoted[1].trim() : "";
}

function normalizePageUrl(value: string) {
  const parsed = new URL(normalizeWordPressActivationUrl(value));
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function canonicalEvidence(html: string, sourcePage: string) {
  const hrefs: string[] = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = readAttribute(match[0], "rel").toLowerCase().split(/\s+/);
    if (!rel.includes("canonical")) continue;
    const href = readAttribute(match[0], "href");
    if (!href) continue;
    try {
      hrefs.push(normalizePageUrl(new URL(href, sourcePage).toString()));
    } catch {
      // Invalid, foreign, or insecure canonical tags stay represented by the
      // occurrence count while the usable canonical remains null.
    }
  }
  return {
    canonicalOccurrences: hrefs.length,
    canonicalHref: hrefs.length === 1 ? hrefs[0] : null,
  };
}

function hasMetaNoindex(html: string) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (readAttribute(match[0], "name").toLowerCase() !== "robots") continue;
    const directives = readAttribute(match[0], "content").toLowerCase().split(/[\s,]+/);
    if (directives.includes("noindex") || directives.includes("none")) return true;
  }
  return false;
}

function askMagicMikeLinkEvidence(html: string, sourcePage: string) {
  let askMagicMikeHrefOccurrences = 0;
  let rejectedAskMagicMikeHrefOccurrences = 0;
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = readAttribute(match[0], "href");
    if (!href) continue;
    try {
      const parsed = new URL(href, sourcePage);
      if (
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        !parsed.port &&
        ASK_MAGIC_MIKE_HOSTS.has(parsed.hostname.toLowerCase())
      ) {
        askMagicMikeHrefOccurrences += 1;
      } else if (/askmagicmike/i.test(href)) {
        rejectedAskMagicMikeHrefOccurrences += 1;
      }
    } catch {
      if (/askmagicmike/i.test(href)) rejectedAskMagicMikeHrefOccurrences += 1;
    }
  }
  return { askMagicMikeHrefOccurrences, rejectedAskMagicMikeHrefOccurrences };
}

function leadCaptureEvidence(html: string) {
  let nativeLeadFormOccurrences = 0;
  for (const match of html.matchAll(/<form\b[^>]*>/gi)) {
    const identity = `${readAttribute(match[0], "id")} ${readAttribute(match[0], "class")}`;
    if (/\bamm-lead-form\b/i.test(identity)) nativeLeadFormOccurrences += 1;
  }

  const gravityFormIds = [...new Set(
    [...html.matchAll(/\bgform_(?:wrapper_)?([0-9]+)\b/gi)]
      .map((match) => Number.parseInt(match[1], 10))
      .filter((value) => Number.isInteger(value) && value > 0),
  )].sort((left, right) => left - right);

  return { nativeLeadFormOccurrences, gravityFormIds };
}

function matchingPageRow(
  rows: readonly WordPressPageIndexRow[],
  sourcePage: string,
) {
  const matches = rows.filter((row) => {
    try {
      return normalizePageUrl(row.link) === normalizePageUrl(sourcePage);
    } catch {
      return false;
    }
  });
  return matches.length === 1 ? matches[0] : null;
}

function buildSurfaceEvidence(input: {
  definition: (typeof SURFACE_DEFINITIONS)[number];
  html: string;
  pageRows: readonly WordPressPageIndexRow[];
}): WordPressSellerIntentSurfaceEvidence {
  const { definition } = input;
  const pageRow = matchingPageRow(input.pageRows, definition.sourcePage);
  const canonical = canonicalEvidence(input.html, definition.sourcePage);
  const links = askMagicMikeLinkEvidence(input.html, definition.sourcePage);
  const capture = leadCaptureEvidence(input.html);
  const selfCanonical = canonical.canonicalHref === normalizePageUrl(definition.sourcePage);
  const pageIdMatches = pageRow?.id === definition.expectedPageId;
  const metaNoindex = hasMetaNoindex(input.html);
  const captureSystems = [
    ...(capture.nativeLeadFormOccurrences ? ["legacy_native_amm_form"] : []),
    ...capture.gravityFormIds.map((id) => `gravity_form_${id}`),
    ...(links.askMagicMikeHrefOccurrences ? ["canonical_app_link"] : []),
  ];

  return {
    key: definition.key,
    label: definition.label,
    sourcePage: definition.sourcePage,
    expectedPageId: definition.expectedPageId,
    pageId: pageRow?.id ?? null,
    pageIdMatches,
    pageModifiedGmt: pageRow?.modified_gmt ?? null,
    canonicalHref: canonical.canonicalHref,
    canonicalOccurrences: canonical.canonicalOccurrences,
    selfCanonical,
    metaNoindex,
    indexableCandidate: pageIdMatches && selfCanonical && !metaNoindex,
    ...links,
    ...capture,
    captureSystems,
    captureSystemCount: captureSystems.length,
  };
}

function decisionHash(input: {
  status: WordPressSellerIntentDecisionStatus;
  surfaces: readonly WordPressSellerIntentSurfaceEvidence[];
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function decisionSteps() {
  return [
    "Compare Search Console performance, indexed URLs, inbound links, and Regency-managed page intent for the two exact source pages.",
    "Select one canonical public seller page and one canonical capture owner; do not keep parallel native, Gravity Forms, and Ask Magic Mike lead paths.",
    "Define the duplicate page disposition and redirect/canonical plan without changing valid indexed routes prematurely.",
    "Approve one stable placement key before generating a tracked /sell href or extending the publication-proof ledger.",
    "Create verified WordPress page and database backups before a separately approved publication change.",
    "After publication, verify SEO metadata, desktop/mobile behavior, attribution, one durable test lead, and rollback without sending a consumer acknowledgment.",
  ];
}

function baseManifest(input: {
  generatedAt: string;
  status: WordPressSellerIntentDecisionStatus;
  statusDetail: string;
  surfaces: WordPressSellerIntentSurfaceEvidence[];
  blockers: string[];
  fetchErrorCodes?: string[];
}): WordPressSellerIntentDecisionManifest {
  return {
    schemaVersion: "amm.wordpress_seller_intent_decision.v1",
    manifestKey: WORDPRESS_SELLER_INTENT_DECISION_KEY,
    generatedAt: input.generatedAt,
    mode: "read_only_canonical_decision",
    status: input.status,
    statusDetail: input.statusDetail,
    publicationBlocked: true,
    publicationAuthorized: false,
    publicationGateIssued: false,
    decisionRequired: true,
    proposedCanonicalFunnel: "https://www.askmagicmike.com/sell",
    trackedPublicationHref: null,
    trackingStatus: "withheld_until_canonical_page_and_placement_key_are_approved",
    surfaces: input.surfaces,
    blockers: input.blockers,
    requiredDecision: {
      canonicalSourcePage: null,
      captureOwner: null,
      duplicatePageDisposition: null,
      placementKey: null,
    },
    decisionSteps: decisionSteps(),
    evidenceSha256: decisionHash({ status: input.status, surfaces: input.surfaces }),
    mutationPerformed: false,
    wordpressMutationPerformed: false,
    databaseMutationPerformed: false,
    leadSubmitted: false,
    notificationSent: false,
    containsRawPageHtml: false,
    ...(input.fetchErrorCodes?.length ? { fetchErrorCodes: input.fetchErrorCodes } : {}),
  };
}

export function buildWordPressSellerIntentDecisionManifest(input: {
  pageHtml: Record<WordPressSellerIntentSurfaceKey, string>;
  pageRows: readonly unknown[];
  generatedAt?: string;
}): WordPressSellerIntentDecisionManifest {
  const pageRows = safeWordPressPageRows(input.pageRows);
  const surfaces = SURFACE_DEFINITIONS.map((definition) => buildSurfaceEvidence({
    definition,
    html: input.pageHtml[definition.key],
    pageRows,
  }));
  const byKey = Object.fromEntries(surfaces.map((surface) => [surface.key, surface])) as
    Record<WordPressSellerIntentSurfaceKey, WordPressSellerIntentSurfaceEvidence>;
  const reviewedStateMatches = surfaces.every((surface) =>
    surface.pageIdMatches &&
    surface.selfCanonical &&
    !surface.metaNoindex &&
    surface.rejectedAskMagicMikeHrefOccurrences === 0,
  ) &&
    byKey.we_buy_houses.nativeLeadFormOccurrences === 1 &&
    byKey.we_buy_houses.gravityFormIds.includes(7) &&
    byKey.we_buy_houses.askMagicMikeHrefOccurrences === 0 &&
    byKey.we_buy_homes.askMagicMikeHrefOccurrences === 1;

  const blockers = [
    "Two published seller-intent pages are self-canonical and indexable candidates; code cannot safely choose which SEO asset to retain.",
    "The We Buy Houses page exposes both a legacy native AMM form and Gravity Form 7 while omitting the canonical Ask Magic Mike funnel link.",
    "No tracked publication href is issued until the canonical page, capture owner, duplicate-page disposition, and stable placement key are explicitly approved.",
  ];
  if (!reviewedStateMatches) {
    blockers.unshift(
      "The public seller surfaces drifted from the reviewed structural precondition; regenerate evidence and reconcile the exact page IDs, canonical metadata, links, and capture systems.",
    );
  }

  return baseManifest({
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: reviewedStateMatches ? "decision_required" : "reconciliation_required",
    statusDetail: reviewedStateMatches
      ? "The reviewed duplicate-page and duplicate-capture condition is present; an owner/SEO decision is required before any publication plan can be generated."
      : "One or more reviewed structural facts changed; no publication decision is safe until the public surfaces are reconciled.",
    surfaces,
    blockers,
  });
}

function buildFetchFailureManifest(fetchErrorCodes: string[]) {
  return baseManifest({
    generatedAt: new Date().toISOString(),
    status: "fetch_failed",
    statusDetail: "One or more allowlisted public WordPress reads failed; no canonical-page decision or publication plan is safe.",
    surfaces: [],
    blockers: [
      "Restore safe public read access and regenerate this decision packet before changing either seller page, form, canonical tag, or redirect.",
    ],
    fetchErrorCodes,
  });
}

export async function loadWordPressSellerIntentDecisionManifest() {
  const results = await Promise.allSettled([
    ...SURFACE_DEFINITIONS.map((definition) =>
      fetchAllowlistedWordPressText(definition.sourcePage, "html"),
    ),
    fetchAllowlistedWordPressText(WORDPRESS_PAGE_INDEX_URL, "json"),
  ]);
  const fetchErrorCodes = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [index === SURFACE_DEFINITIONS.length
          ? "wordpress_page_index_fetch_failed"
          : `${SURFACE_DEFINITIONS[index].key}_fetch_failed`]
      : [],
  );
  if (fetchErrorCodes.length) return buildFetchFailureManifest(fetchErrorCodes);

  const settled = results as PromiseFulfilledResult<string>[];
  let pageRows: unknown;
  try {
    pageRows = JSON.parse(settled[SURFACE_DEFINITIONS.length].value);
  } catch {
    return buildFetchFailureManifest(["wordpress_page_index_parse_failed"]);
  }
  if (!Array.isArray(pageRows)) {
    return buildFetchFailureManifest(["wordpress_page_index_parse_failed"]);
  }

  try {
    return buildWordPressSellerIntentDecisionManifest({
      pageHtml: {
        we_buy_homes: settled[0].value,
        we_buy_houses: settled[1].value,
      },
      pageRows,
    });
  } catch {
    return buildFetchFailureManifest(["wordpress_seller_intent_evidence_parse_failed"]);
  }
}

export function wordpressSellerIntentDecisionManifestHref() {
  return `/api/admin/distribution/wordpress-change-set/${WORDPRESS_SELLER_INTENT_DECISION_KEY}`;
}
