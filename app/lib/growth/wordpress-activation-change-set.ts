import { createHash } from "node:crypto";
import {
  resolveOwnedDemandPlacement,
  type WordPressOwnedPlacementKey,
} from "./owned-demand";
import type { OwnedDemandPlacementReadiness } from "./owned-demand-activation";

const WORDPRESS_HOSTS = new Set([
  "ourtownproperties.com",
  "www.ourtownproperties.com",
]);
const ASK_MAGIC_MIKE_HOSTS = new Set([
  "askmagicmike.com",
  "www.askmagicmike.com",
]);
const MAX_RESPONSE_BYTES = 3_000_000;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 20_000;
export const WORDPRESS_CONNECTOR_REQUIRED_VERSION = "1.1.0";
export const WORDPRESS_CONNECTOR_UPGRADE_APPROVAL_GATE =
  "APPROVE PHASE 9 WORDPRESS CONNECTOR 1.1.0 PLUGIN UPGRADE";
export const WORDPRESS_PAGE_INDEX_URL =
  "https://www.ourtownproperties.com/wp-json/wp/v2/pages?per_page=100&_fields=id,link,slug,status,modified_gmt";

export const WORDPRESS_ACTIVATION_PLACEMENT_KEYS = [
  "wordpress_homepage_ask_mike",
  "wordpress_home_value",
  "wordpress_we_buy_homes",
] as const satisfies readonly WordPressOwnedPlacementKey[];

export type WordPressActivationPlacementKey =
  (typeof WORDPRESS_ACTIVATION_PLACEMENT_KEYS)[number];

export type WordPressActivationStatus =
  | "legacy_match_ready"
  | "hidden_target"
  | "already_exact"
  | "connector_upgrade_required"
  | "page_id_unresolved"
  | "missing_target"
  | "ambiguous_target"
  | "precondition_mismatch"
  | "fetch_failed";

interface WordPressActivationTarget {
  placementKey: WordPressActivationPlacementKey;
  placementLabel: string;
  sourcePage: string;
  expectedPageId: number;
  legacyPath: string;
  legacySource: string;
  legacyMedium: string;
  legacyCampaign: string;
  proposedShortcode: string;
  approvalGate: string;
}

export interface WordPressPageIndexRow {
  id: number;
  link: string;
  slug?: string;
  status?: string;
  modified_gmt?: string;
}

export interface WordPressActivationChangeSet {
  schemaVersion: "amm.wordpress_activation_change_set.v3";
  generatedAt: string;
  mode: "read_only_public_precondition";
  placementKey: WordPressActivationPlacementKey;
  placementLabel: string;
  status: WordPressActivationStatus;
  statusDetail: string;
  publicationBlocked: boolean;
  publicationAuthorized: false;
  approvalRequired: boolean;
  sourcePage: string;
  pageId: number | null;
  expectedPageId: number;
  pageModifiedGmt: string | null;
  currentHref: string | null;
  proposedHref: string;
  proposedShortcode: string;
  rollbackHref: string | null;
  currentHrefOccurrences: number;
  askMagicMikeHrefOccurrences: number;
  rejectedLookalikeHrefOccurrences: number;
  targetVisibility: "visible_candidate" | "hidden_by_known_css" | "unknown";
  hiddenTargetOccurrences: number;
  hiddenCssSelectorOccurrences: number;
  requiredConnectorVersion: string;
  observedConnectorVersions: string[];
  connectorVersionReady: boolean;
  preconditionSha256: string;
  blockers: string[];
  publicationSteps: string[];
  approvalGate: string | null;
  pagePublicationApprovalGate: string;
  mutationPerformed: false;
  containsRawPageHtml: false;
  fetchErrorCode?: "wordpress_page_fetch_failed" | "wordpress_page_index_fetch_failed";
}

export interface WordPressActivationLoadOptions {
  timeoutMs?: number;
}

export function toOwnedDemandPlacementReadiness(
  changeSet: WordPressActivationChangeSet,
): OwnedDemandPlacementReadiness {
  const activationEligible = changeSet.connectorVersionReady
    && changeSet.targetVisibility === "visible_candidate" && (
    changeSet.status === "legacy_match_ready" || changeSet.status === "already_exact"
  );
  const detail = changeSet.blockers[0] || changeSet.statusDetail;
  const nextAction = changeSet.status === "already_exact"
    ? "Verify the exact visible tracked link in WordPress, then record native publication proof. No href edit is needed."
    : changeSet.status === "connector_upgrade_required"
      ? "Back up the exact live Connector 1.0.0 source and options, obtain the plugin-upgrade gate, install the reviewed 1.1.0 candidate, verify legacy links remain unchanged, then regenerate this manifest before editing any page."
    : activationEligible
      ? "Use the live readiness manifest, create a verified page-source rollback, obtain the exact WordPress publication gate, replace only the reviewed shortcode instance, and record native proof after public verification."
      : undefined;
  return {
    channelKey: "ourtown_wordpress",
    placementKey: changeSet.placementKey,
    activationEligible,
    status: changeSet.status,
    detail,
    nextAction,
  };
}

const TARGETS: Record<WordPressActivationPlacementKey, WordPressActivationTarget> = {
  wordpress_homepage_ask_mike: {
    placementKey: "wordpress_homepage_ask_mike",
    placementLabel: "Homepage Ask Magic Mike CTA",
    sourcePage: "https://www.ourtownproperties.com/",
    expectedPageId: 149,
    legacyPath: "/value",
    legacySource: "ourtownproperties",
    legacyMedium: "homepage_cta",
    legacyCampaign: "website_widget",
    proposedShortcode: '[ask_magic_mike_cta route="/ask" source="homepage_cta" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_homepage_ask_mike" button_text="Ask Magic Mike"]',
    approvalGate: "APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION",
  },
  wordpress_home_value: {
    placementKey: "wordpress_home_value",
    placementLabel: "Established home-value page CTA",
    sourcePage: "https://www.ourtownproperties.com/how-much-is-your-home-worth/",
    expectedPageId: 3952,
    legacyPath: "/value",
    legacySource: "ourtownproperties",
    legacyMedium: "home_value_page",
    legacyCampaign: "website_widget",
    proposedShortcode: '[ask_magic_mike_cta route="/home-value" source="home_value_page" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_home_value_page" button_text="Ask Magic Mike"]',
    approvalGate: "APPROVE PHASE 9 HOME VALUE CTA WORDPRESS PUBLICATION",
  },
  wordpress_we_buy_homes: {
    placementKey: "wordpress_we_buy_homes",
    placementLabel: "We Buy Homes CTA",
    sourcePage: "https://www.ourtownproperties.com/we-buy-homes/",
    expectedPageId: 3631,
    legacyPath: "/value",
    legacySource: "ourtownproperties",
    legacyMedium: "seller_page_cta",
    legacyCampaign: "website_widget",
    proposedShortcode: '[ask_magic_mike_cta route="/sell" source="seller_page_cta" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_we_buy_homes" button_text="Ask Magic Mike"]',
    approvalGate: "APPROVE PHASE 9 WE BUY HOMES CTA WORDPRESS PUBLICATION",
  },
};

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/&#([0-9]+);?/g, (match, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/&([a-z]+);/gi, (match, name: string) =>
      HTML_ENTITIES[name.toLowerCase()] ?? match,
    );
}

function normalizeExactHttpsUrl(value: string, hosts: Set<string>, label: string) {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    !hosts.has(parsed.hostname.toLowerCase())
  ) {
    throw new Error(`${label} is outside the exact approved HTTPS hosts`);
  }
  parsed.hash = "";
  return parsed;
}

export function normalizeWordPressActivationUrl(value: string) {
  return normalizeExactHttpsUrl(value, WORDPRESS_HOSTS, "WordPress activation URL").toString();
}

function normalizeAskMagicMikeUrl(value: string, sourcePage: string) {
  const resolved = new URL(decodeHtmlEntities(value), sourcePage);
  return normalizeExactHttpsUrl(
    resolved.toString(),
    ASK_MAGIC_MIKE_HOSTS,
    "Ask Magic Mike activation URL",
  );
}

function comparableUrl(parsed: URL) {
  const copy = new URL(parsed.toString());
  copy.hash = "";
  const entries = [...copy.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
  );
  copy.search = "";
  for (const [key, value] of entries) copy.searchParams.append(key, value);
  return copy.toString();
}

function attributeValue(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  if (quoted) return decodeHtmlEntities(quoted[2]).trim();
  const unquoted = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*([^\\s>]+)`, "i"));
  return unquoted ? decodeHtmlEntities(unquoted[1]).trim() : "";
}

interface AskMagicMikeHrefEvidence {
  url: URL;
  ctaContainerClasses: string[];
  connectorVersions: string[];
}

const VOID_HTML_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const KNOWN_CTA_CONTAINER_CLASSES = new Set(["amm-cta", "amm-cta--dark"]);
const KNOWN_CONNECTOR_MARKER_CLASSES = new Set([
  "amm-cta",
  "amm-embed",
  "amm-floating-cta",
]);

function classTokens(tag: string) {
  return attributeValue(tag, "class")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function connectorVersion(tag: string) {
  const value = attributeValue(tag, "data-amm-connector-version");
  return /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(value) && value.length <= 32
    ? value
    : "";
}

function hiddenCtaCssEvidence(html: string) {
  const hiddenClasses = new Set<string>();
  let hiddenCssSelectorOccurrences = 0;
  for (const styleMatch of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    const css = styleMatch[1].replace(/\/\*[\s\S]*?\*\//g, "");
    for (const ruleMatch of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/\bdisplay\s*:\s*none\s*!\s*important\b/i.test(ruleMatch[2])) continue;
      for (const rawSelector of ruleMatch[1].split(",")) {
        const selector = rawSelector.trim().replace(/\s+/g, " ");
        for (const className of KNOWN_CTA_CONTAINER_CLASSES) {
          const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (new RegExp(`^(?:(?:html|body)\\s+)?\\.${escapedClass}$`, "i").test(selector)) {
            hiddenClasses.add(className);
            hiddenCssSelectorOccurrences += 1;
          }
        }
      }
    }
  }
  return { hiddenClasses, hiddenCssSelectorOccurrences };
}

function extractAskMagicMikeHrefs(html: string, sourcePage: string) {
  const hrefs: AskMagicMikeHrefEvidence[] = [];
  let rejectedLookalikeHrefOccurrences = 0;
  const stack: Array<{
    tagName: string;
    classes: string[];
    connectorVersion: string;
  }> = [];
  for (const match of String(html).matchAll(/<\/?[a-z][^>]*>/gi)) {
    const tag = match[0];
    const closing = /^<\//.test(tag);
    const tagName = tag.match(/^<\/?\s*([a-z][a-z0-9:-]*)/i)?.[1]?.toLowerCase();
    if (!tagName) continue;

    if (closing) {
      const openIndex = stack.map((entry) => entry.tagName).lastIndexOf(tagName);
      if (openIndex >= 0) stack.splice(openIndex);
      continue;
    }

    const classes = classTokens(tag);
    const tagConnectorVersion = connectorVersion(tag);
    if (tagName === "a") {
      const rawHref = attributeValue(tag, "href");
      if (rawHref) {
        try {
          const url = normalizeAskMagicMikeUrl(rawHref, sourcePage);
          const ctaContainerClasses = [...new Set([
            ...stack.flatMap((entry) => entry.classes),
            ...classes,
          ].filter((className) => KNOWN_CTA_CONTAINER_CLASSES.has(className)))];
          const connectorVersions = [...new Set([
            ...stack
              .filter((entry) => entry.classes.some((className) =>
                KNOWN_CONNECTOR_MARKER_CLASSES.has(className),
              ))
              .map((entry) => entry.connectorVersion),
            classes.some((className) => KNOWN_CONNECTOR_MARKER_CLASSES.has(className))
              ? tagConnectorVersion
              : "",
          ].filter(Boolean))].sort();
          hrefs.push({ url, ctaContainerClasses, connectorVersions });
        } catch {
          if (/askmagicmike/i.test(rawHref)) rejectedLookalikeHrefOccurrences += 1;
        }
      }
    }

    if (!VOID_HTML_ELEMENTS.has(tagName) && !/\/\s*>$/.test(tag)) {
      stack.push({
        tagName,
        classes,
        connectorVersion: tagConnectorVersion,
      });
    }
  }
  return { hrefs, rejectedLookalikeHrefOccurrences };
}

function matchesLegacyHref(url: URL, target: WordPressActivationTarget) {
  const keys = [...url.searchParams.keys()].sort();
  return (
    url.pathname === target.legacyPath &&
    JSON.stringify(keys) === JSON.stringify(["utm_campaign", "utm_medium", "utm_source"]) &&
    url.searchParams.get("utm_source") === target.legacySource &&
    url.searchParams.get("utm_medium") === target.legacyMedium &&
    url.searchParams.get("utm_campaign") === target.legacyCampaign
  );
}

function normalizedPageUrl(value: string) {
  const parsed = normalizeExactHttpsUrl(value, WORDPRESS_HOSTS, "WordPress page index URL");
  parsed.search = "";
  return parsed.toString();
}

export function safeWordPressPageRows(rows: readonly unknown[]): WordPressPageIndexRow[] {
  const safeRows: WordPressPageIndexRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const candidate = row as Record<string, unknown>;
    if (
      !Number.isInteger(candidate.id) ||
      Number(candidate.id) <= 0 ||
      typeof candidate.link !== "string" ||
      candidate.link.length > 2_048 ||
      candidate.status !== "publish"
    ) {
      continue;
    }
    const modified = typeof candidate.modified_gmt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(candidate.modified_gmt)
      ? candidate.modified_gmt
      : undefined;
    safeRows.push({
      id: Number(candidate.id),
      link: candidate.link,
      status: candidate.status === "publish" ? "publish" : undefined,
      slug: typeof candidate.slug === "string" && candidate.slug.length <= 240
        ? candidate.slug
        : undefined,
      modified_gmt: modified,
    });
  }
  return safeRows;
}

function hashPrecondition(input: {
  placementKey: WordPressActivationPlacementKey;
  status: WordPressActivationStatus;
  sourcePage: string;
  pageId: number | null;
  pageModifiedGmt: string | null;
  currentHref: string | null;
  proposedHref: string;
  currentHrefOccurrences: number;
  askMagicMikeHrefOccurrences: number;
  rejectedLookalikeHrefOccurrences: number;
  targetVisibility: WordPressActivationChangeSet["targetVisibility"];
  hiddenTargetOccurrences: number;
  hiddenCssSelectorOccurrences: number;
  observedConnectorVersions: string[];
  connectorVersionReady: boolean;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function basePublicationSteps(
  target: WordPressActivationTarget,
  currentHref: string | null,
  targetVisibility: WordPressActivationChangeSet["targetVisibility"] = "unknown",
  connectorVersionReady = false,
) {
  if (targetVisibility === "hidden_by_known_css") {
    return [
      `Create and verify a recoverable WordPress revision or page backup for page ID ${target.expectedPageId}.`,
      "Do not publish an href-only change while the exact target remains suppressed by public CSS.",
      "Select one visible existing placement or prepare a separately reviewed desktop/mobile restoration of this exact CTA component.",
      "Regenerate this manifest and require a visible_candidate target with the expected page ID, rollback href, and SHA-256 precondition.",
      "Publish only after a new exact placement-specific approval gate is issued and received.",
      currentHref
        ? "If later acceptance fails, restore the verified page revision and rollbackHref, then recheck the public page."
        : "Do not publish because no exact rollback href is available.",
    ];
  }
  if (!connectorVersionReady) {
    return [
      "Do not edit a WordPress page while the reviewed Connector version marker is missing.",
      "Re-read the live Connector PHP source and require the recorded 1.0.0 SHA-256 precondition.",
      "Export the active Connector directory and saved options as a recoverable plugin rollback.",
      `Obtain the exact ${WORDPRESS_CONNECTOR_UPGRADE_APPROVAL_GATE} gate and install only the reviewed ${WORDPRESS_CONNECTOR_REQUIRED_VERSION} candidate.`,
      "Verify existing shortcode destinations and layout remain unchanged, then require the public 1.1.0 version marker.",
      "Regenerate this manifest before preparing any page-source edit or requesting a page publication gate.",
    ];
  }
  return [
    `Create and verify a recoverable WordPress revision or page backup for page ID ${target.expectedPageId}.`,
    "Regenerate this manifest immediately before editing and require the same SHA-256 precondition.",
    `Verify the editor source contains the one reviewed current shortcode, then replace only that ${target.placementLabel} shortcode instance; do not replace the page, form, menu, theme, or plugin.`,
    `Require the replacement shortcode to equal: ${target.proposedShortcode}`,
    "Publish only after the exact approval gate below is received.",
    "Verify the public source page, tracked destination, canonical tags, layout, mobile behavior, and analytics event without submitting a lead.",
    currentHref
      ? "If acceptance fails, restore rollbackHref and verify the prior public link."
      : "Do not publish because no exact rollback href is available.",
  ];
}

function statusDetail(status: WordPressActivationStatus) {
  const details: Record<WordPressActivationStatus, string> = {
    legacy_match_ready: "One exact legacy href and one exact published WordPress page record match the allowlisted placement.",
    hidden_target: "The exact href exists, but a known public CSS rule suppresses its Ask Magic Mike CTA container.",
    already_exact: "The public placement already uses the canonical tracked href; no WordPress edit is needed.",
    connector_upgrade_required: "The rendered placement does not expose the exact reviewed Connector version marker, so a page edit is not yet safe.",
    page_id_unresolved: "The exact public href was found, but the published WordPress page record could not be resolved uniquely.",
    missing_target: "No exact legacy or canonical href matched this named placement.",
    ambiguous_target: "More than one matching href or page record exists, so the target is not safe to edit automatically.",
    precondition_mismatch: "The public page resolved to a different WordPress page ID than the reviewed target.",
    fetch_failed: "The public WordPress page or page index could not be read safely.",
  };
  return details[status];
}

export function isWordPressActivationPlacementKey(
  value: string,
): value is WordPressActivationPlacementKey {
  return (WORDPRESS_ACTIVATION_PLACEMENT_KEYS as readonly string[]).includes(value);
}

export function wordpressActivationManifestHref(placementKey: WordPressActivationPlacementKey) {
  return `/api/admin/distribution/wordpress-change-set/${placementKey}`;
}

export function buildWordPressActivationChangeSet(input: {
  placementKey: WordPressActivationPlacementKey;
  html: string;
  pageRows: readonly unknown[];
  generatedAt?: string;
}): WordPressActivationChangeSet {
  const target = TARGETS[input.placementKey];
  const placement = resolveOwnedDemandPlacement("ourtown_wordpress", input.placementKey);
  if (!placement) throw new Error("Approved owned-demand placement is unavailable");

  const proposed = normalizeAskMagicMikeUrl(placement.trackedUrl, target.sourcePage);
  const proposedComparable = comparableUrl(proposed);
  const { hrefs, rejectedLookalikeHrefOccurrences } = extractAskMagicMikeHrefs(
    input.html,
    target.sourcePage,
  );
  const { hiddenClasses, hiddenCssSelectorOccurrences } = hiddenCtaCssEvidence(input.html);
  const legacyMatches = hrefs.filter((href) => matchesLegacyHref(href.url, target));
  const proposedMatches = hrefs.filter((href) => comparableUrl(href.url) === proposedComparable);
  const currentMatches = legacyMatches.length ? legacyMatches : proposedMatches;
  const currentHref = currentMatches.length ? currentMatches[0].url.toString() : null;
  const observedConnectorVersions = [...new Set(
    currentMatches.flatMap((href) => href.connectorVersions),
  )].sort();
  const connectorVersionReady =
    currentMatches.length === 1
    && observedConnectorVersions.length === 1
    && observedConnectorVersions[0] === WORDPRESS_CONNECTOR_REQUIRED_VERSION;
  const hiddenTargetOccurrences = currentMatches.filter((href) =>
    href.ctaContainerClasses.some((className) => hiddenClasses.has(className))
  ).length;
  const targetVisibility: WordPressActivationChangeSet["targetVisibility"] =
    currentMatches.length === 0
      ? "unknown"
      : hiddenTargetOccurrences > 0
        ? "hidden_by_known_css"
        : "visible_candidate";

  const rows = safeWordPressPageRows(input.pageRows).filter((row) => {
    try {
      return normalizedPageUrl(row.link) === normalizedPageUrl(target.sourcePage);
    } catch {
      return false;
    }
  });
  const pageRow = rows.length === 1 ? rows[0] : null;

  let status: WordPressActivationStatus;
  const blockers: string[] = [];
  if (
    rejectedLookalikeHrefOccurrences > 0 ||
    rows.length > 1 ||
    legacyMatches.length > 1 ||
    proposedMatches.length > 1 ||
    (legacyMatches.length && proposedMatches.length)
  ) {
    status = "ambiguous_target";
    blockers.push("Resolve rejected lookalike/insecure links, duplicate page records, or duplicate matching hrefs before preparing any edit.");
  } else if (!pageRow) {
    status = "page_id_unresolved";
    blockers.push("Resolve one exact published WordPress page record before preparing any edit.");
  } else if (pageRow.id !== target.expectedPageId) {
    status = "precondition_mismatch";
    blockers.push(`Expected WordPress page ID ${target.expectedPageId}, but the public index resolved a different ID.`);
  } else if (hiddenTargetOccurrences > 0) {
    status = "hidden_target";
    blockers.push(
      "The exact target is inside an Ask Magic Mike CTA container suppressed by a public display:none !important rule; replacing only its href would not activate a visible owned-demand path.",
    );
  } else if (currentMatches.length === 1 && !connectorVersionReady) {
    status = "connector_upgrade_required";
    blockers.push(
      `The exact rendered placement does not expose data-amm-connector-version="${WORDPRESS_CONNECTOR_REQUIRED_VERSION}"; upgrade and verify the Connector before any page-source edit.`,
    );
  } else if (proposedMatches.length === 1 && legacyMatches.length === 0) {
    status = "already_exact";
  } else if (legacyMatches.length === 1 && proposedMatches.length === 0) {
    status = "legacy_match_ready";
  } else {
    status = "missing_target";
    blockers.push("Locate and review the named CTA manually; do not guess from another link or page.");
  }

  const pageId = pageRow?.id ?? null;
  const pageModifiedGmt = pageRow?.modified_gmt || null;
  const proposedHref = proposed.toString();
  const approvalGate = status === "connector_upgrade_required"
    ? WORDPRESS_CONNECTOR_UPGRADE_APPROVAL_GATE
    : status === "legacy_match_ready"
      ? target.approvalGate
      : null;
  const preconditionSha256 = hashPrecondition({
    placementKey: target.placementKey,
    status,
    sourcePage: target.sourcePage,
    pageId,
    pageModifiedGmt,
    currentHref,
    proposedHref,
    currentHrefOccurrences: currentMatches.length,
    askMagicMikeHrefOccurrences: hrefs.length,
    rejectedLookalikeHrefOccurrences,
    targetVisibility,
    hiddenTargetOccurrences,
    hiddenCssSelectorOccurrences,
    observedConnectorVersions,
    connectorVersionReady,
  });

  return {
    schemaVersion: "amm.wordpress_activation_change_set.v3",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "read_only_public_precondition",
    placementKey: target.placementKey,
    placementLabel: target.placementLabel,
    status,
    statusDetail: statusDetail(status),
    publicationBlocked: status !== "legacy_match_ready",
    publicationAuthorized: false,
    approvalRequired: approvalGate !== null,
    sourcePage: target.sourcePage,
    pageId,
    expectedPageId: target.expectedPageId,
    pageModifiedGmt,
    currentHref,
    proposedHref,
    proposedShortcode: target.proposedShortcode,
    rollbackHref: currentHref,
    currentHrefOccurrences: currentMatches.length,
    askMagicMikeHrefOccurrences: hrefs.length,
    rejectedLookalikeHrefOccurrences,
    targetVisibility,
    hiddenTargetOccurrences,
    hiddenCssSelectorOccurrences,
    requiredConnectorVersion: WORDPRESS_CONNECTOR_REQUIRED_VERSION,
    observedConnectorVersions,
    connectorVersionReady,
    preconditionSha256,
    blockers,
    publicationSteps: basePublicationSteps(
      target,
      currentHref,
      targetVisibility,
      connectorVersionReady,
    ),
    approvalGate,
    pagePublicationApprovalGate: target.approvalGate,
    mutationPerformed: false,
    containsRawPageHtml: false,
  };
}

function buildFetchFailureChangeSet(
  placementKey: WordPressActivationPlacementKey,
  fetchErrorCode: NonNullable<WordPressActivationChangeSet["fetchErrorCode"]>,
  generatedAt = new Date().toISOString(),
): WordPressActivationChangeSet {
  const target = TARGETS[placementKey];
  const placement = resolveOwnedDemandPlacement("ourtown_wordpress", placementKey);
  if (!placement) throw new Error("Approved owned-demand placement is unavailable");
  const proposedHref = normalizeAskMagicMikeUrl(placement.trackedUrl, target.sourcePage).toString();
  const preconditionSha256 = hashPrecondition({
    placementKey,
    status: "fetch_failed",
    sourcePage: target.sourcePage,
    pageId: null,
    pageModifiedGmt: null,
    currentHref: null,
    proposedHref,
    currentHrefOccurrences: 0,
    askMagicMikeHrefOccurrences: 0,
    rejectedLookalikeHrefOccurrences: 0,
    targetVisibility: "unknown",
    hiddenTargetOccurrences: 0,
    hiddenCssSelectorOccurrences: 0,
    observedConnectorVersions: [],
    connectorVersionReady: false,
  });
  return {
    schemaVersion: "amm.wordpress_activation_change_set.v3",
    generatedAt,
    mode: "read_only_public_precondition",
    placementKey,
    placementLabel: target.placementLabel,
    status: "fetch_failed",
    statusDetail: statusDetail("fetch_failed"),
    publicationBlocked: true,
    publicationAuthorized: false,
    approvalRequired: false,
    sourcePage: target.sourcePage,
    pageId: null,
    expectedPageId: target.expectedPageId,
    pageModifiedGmt: null,
    currentHref: null,
    proposedHref,
    proposedShortcode: target.proposedShortcode,
    rollbackHref: null,
    currentHrefOccurrences: 0,
    askMagicMikeHrefOccurrences: 0,
    rejectedLookalikeHrefOccurrences: 0,
    targetVisibility: "unknown",
    hiddenTargetOccurrences: 0,
    hiddenCssSelectorOccurrences: 0,
    requiredConnectorVersion: WORDPRESS_CONNECTOR_REQUIRED_VERSION,
    observedConnectorVersions: [],
    connectorVersionReady: false,
    preconditionSha256,
    blockers: ["Restore safe public read access and regenerate the manifest before any WordPress edit."],
    publicationSteps: basePublicationSteps(target, null),
    approvalGate: null,
    pagePublicationApprovalGate: target.approvalGate,
    mutationPerformed: false,
    containsRawPageHtml: false,
    fetchErrorCode,
  };
}

async function readResponseTextWithLimit(response: Response) {
  if (!response.body) throw new Error("upstream_response_missing_body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel("upstream_response_too_large");
        throw new Error("upstream_response_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes).toString("utf8");
}

export async function fetchAllowlistedWordPressText(
  url: string,
  expectedContentType: "html" | "json",
  timeoutMs = FETCH_TIMEOUT_MS,
) {
  const boundedTimeoutMs = Number.isFinite(timeoutMs)
    ? Math.min(FETCH_TIMEOUT_MS, Math.max(250, Math.floor(timeoutMs)))
    : FETCH_TIMEOUT_MS;
  let currentUrl = normalizeWordPressActivationUrl(url);
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: { "user-agent": "AskMagicMike-WordPress-Activation-Audit/1.0" },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(boundedTimeoutMs),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error("unsafe_redirect");
      currentUrl = normalizeWordPressActivationUrl(new URL(location, currentUrl).toString());
      continue;
    }
    if (!response.ok) throw new Error("upstream_http_error");
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (
      (expectedContentType === "html" && !contentType.includes("text/html")) ||
      (expectedContentType === "json" && !contentType.includes("application/json"))
    ) {
      throw new Error("unexpected_content_type");
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error("upstream_response_too_large");
    return readResponseTextWithLimit(response);
  }
  throw new Error("redirect_limit_exceeded");
}

export async function loadWordPressActivationChangeSets(
  placementKeys: readonly WordPressActivationPlacementKey[] = WORDPRESS_ACTIVATION_PLACEMENT_KEYS,
  options: WordPressActivationLoadOptions = {},
): Promise<WordPressActivationChangeSet[]> {
  if (placementKeys.length === 0) return [];

  const [indexResult, ...pageResults] = await Promise.allSettled([
    fetchAllowlistedWordPressText(
      WORDPRESS_PAGE_INDEX_URL,
      "json",
      options.timeoutMs,
    ),
    ...placementKeys.map((placementKey) => (
      fetchAllowlistedWordPressText(
        TARGETS[placementKey].sourcePage,
        "html",
        options.timeoutMs,
      )
    )),
  ]);

  let parsedRows: unknown = null;
  if (indexResult?.status === "fulfilled") {
    try {
      parsedRows = JSON.parse(indexResult.value);
    } catch {
      parsedRows = null;
    }
  }

  return placementKeys.map((placementKey, index) => {
    const pageResult = pageResults[index];
    if (!pageResult || pageResult.status === "rejected") {
      return buildFetchFailureChangeSet(placementKey, "wordpress_page_fetch_failed");
    }
    if (!Array.isArray(parsedRows)) {
      return buildFetchFailureChangeSet(placementKey, "wordpress_page_index_fetch_failed");
    }
    try {
      return buildWordPressActivationChangeSet({
        placementKey,
        html: pageResult.value,
        pageRows: parsedRows,
      });
    } catch {
      return buildFetchFailureChangeSet(placementKey, "wordpress_page_index_fetch_failed");
    }
  });
}

export async function loadWordPressActivationChangeSet(
  placementKey: WordPressActivationPlacementKey,
) {
  const [changeSet] = await loadWordPressActivationChangeSets([placementKey]);
  return changeSet || buildFetchFailureChangeSet(
    placementKey,
    "wordpress_page_fetch_failed",
  );
}
