import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const WORDPRESS_LEAD_OPS_PLUGIN_FILE =
  "wp-content/plugins/ask-magic-mike-lead-ops-social-upgrade/ask-magic-mike-lead-ops-social-upgrade.php";
export const WORDPRESS_LEAD_OPS_LIVE_VERSION = "2.10.0";
export const WORDPRESS_LEAD_OPS_RESTORED_VERSION = "2.10.1";
export const WORDPRESS_LEAD_OPS_LIVE_SHA256 =
  "41de351d57e91b8ecf1d611d8b052381166effaf693319b0f9e8da32f5d8e972";
export const WORDPRESS_LEAD_OPS_RESTORED_SHA256 =
  "6b9a30de24e3fbbbac5aa49def7552afd6b2e21b7ede7beafa8ad095d9a9f44c";
export const WORDPRESS_HOMEPAGE_CTA_RESTORATION_GATE =
  "APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA VISIBILITY RESTORATION";

export const WORDPRESS_HOMEPAGE_CTA_SUPPRESSION_BLOCK = `        if ($is_home && !$is_amm) {
            // Homepage only: remove the dark Ask Magic Mike CTA block.
            echo ".amm-cta,.amm-cta--dark{display:none !important;}\\n";
        }`;

export const WORDPRESS_HOMEPAGE_CTA_RESTORED_BLOCK = `        if ($is_home && !$is_amm) {
            // Keep the existing homepage CTA in the page builder's native layout.
            // The floating widget remains suppressed separately in filter_homepage().
        }`;

const LIVE_HEADER_VERSION = " * Version: 2.10.0";
const RESTORED_HEADER_VERSION = " * Version: 2.10.1";
const LIVE_CONSTANT_VERSION = "    const VERSION = '2.10.0';";
const RESTORED_CONSTANT_VERSION = "    const VERSION = '2.10.1';";
const CTA_HIDE_RULE = ".amm-cta,.amm-cta--dark{display:none !important;}";
const WIDGET_MARKER = "amm-leadops-home-suppress";
const WIDGET_HIDE_RULE = ".amm-widget{display:none !important;}";

export function sha256Text(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function countExact(source, needle) {
  if (!needle) return 0;
  return source.split(needle).length - 1;
}

function sourceFacts(source) {
  return {
    liveHeaderVersionOccurrences: countExact(source, LIVE_HEADER_VERSION),
    restoredHeaderVersionOccurrences: countExact(source, RESTORED_HEADER_VERSION),
    liveConstantVersionOccurrences: countExact(source, LIVE_CONSTANT_VERSION),
    restoredConstantVersionOccurrences: countExact(source, RESTORED_CONSTANT_VERSION),
    suppressionBlockOccurrences: countExact(
      source,
      WORDPRESS_HOMEPAGE_CTA_SUPPRESSION_BLOCK,
    ),
    restoredBlockOccurrences: countExact(
      source,
      WORDPRESS_HOMEPAGE_CTA_RESTORED_BLOCK,
    ),
    ctaHideRuleOccurrences: countExact(source, CTA_HIDE_RULE),
    widgetMarkerOccurrences: countExact(source, WIDGET_MARKER),
    widgetHideRuleOccurrences: countExact(source, WIDGET_HIDE_RULE),
  };
}

function preconditionsReady(facts) {
  return (
    facts.liveHeaderVersionOccurrences === 1 &&
    facts.restoredHeaderVersionOccurrences === 0 &&
    facts.liveConstantVersionOccurrences === 1 &&
    facts.restoredConstantVersionOccurrences === 0 &&
    facts.suppressionBlockOccurrences === 1 &&
    facts.restoredBlockOccurrences === 0 &&
    facts.ctaHideRuleOccurrences === 1 &&
    facts.widgetMarkerOccurrences === 1 &&
    facts.widgetHideRuleOccurrences === 1
  );
}

function postconditionsReady(facts) {
  return (
    facts.liveHeaderVersionOccurrences === 0 &&
    facts.restoredHeaderVersionOccurrences === 1 &&
    facts.liveConstantVersionOccurrences === 0 &&
    facts.restoredConstantVersionOccurrences === 1 &&
    facts.suppressionBlockOccurrences === 0 &&
    facts.restoredBlockOccurrences === 1 &&
    facts.ctaHideRuleOccurrences === 0 &&
    facts.widgetMarkerOccurrences === 1 &&
    facts.widgetHideRuleOccurrences === 1
  );
}

function replaceExactlyOnce(source, current, replacement, label) {
  if (countExact(source, current) !== 1) {
    throw new Error(`wordpress_homepage_cta_${label}_precondition_failed`);
  }
  return source.replace(current, replacement);
}

function manifestBase({
  generatedAt,
  sourceSha256,
  proposedSha256,
  sourceFacts,
  proposedFacts,
  status,
  blockers,
}) {
  const effectiveFacts = proposedFacts ?? sourceFacts;
  return {
    schemaVersion: "amm.wordpress_homepage_cta_restoration.v1",
    generatedAt,
    mode: "offline_plugin_source_precondition",
    status,
    pluginFile: WORDPRESS_LEAD_OPS_PLUGIN_FILE,
    liveVersion: WORDPRESS_LEAD_OPS_LIVE_VERSION,
    restoredVersion: WORDPRESS_LEAD_OPS_RESTORED_VERSION,
    sourceSha256,
    expectedSourceSha256: WORDPRESS_LEAD_OPS_LIVE_SHA256,
    proposedSha256,
    expectedProposedSha256: WORDPRESS_LEAD_OPS_RESTORED_SHA256,
    sourceFacts,
    proposedFacts,
    blockers,
    approvalGate: WORDPRESS_HOMEPAGE_CTA_RESTORATION_GATE,
    approvalRequired: true,
    publicationAuthorized: false,
    publicationBlocked: true,
    wordpressMutationPerformed: false,
    cachePurgePerformed: false,
    pageMutationPerformed: false,
    formMutationPerformed: false,
    notificationMutationPerformed: false,
    databaseMutationPerformed: false,
    preservesExistingHomepageHref: true,
    preservesCurrentPublicPhone: true,
    preservesGravityForm3: true,
    preservesCanonicalBridge: true,
    preservesFloatingWidgetSuppression:
      effectiveFacts.widgetHideRuleOccurrences === 1,
    containsPluginSource: false,
  };
}

export function prepareWordPressHomepageCtaRestoration(source, options = {}) {
  const normalizedSource = String(source ?? "");
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const expectedSourceSha256 =
    options.expectedSourceSha256 ?? WORDPRESS_LEAD_OPS_LIVE_SHA256;
  const expectedProposedSha256 =
    options.expectedProposedSha256 ?? WORDPRESS_LEAD_OPS_RESTORED_SHA256;
  const sourceSha256 = sha256Text(normalizedSource);
  const facts = sourceFacts(normalizedSource);

  if (sourceSha256 === expectedProposedSha256 && postconditionsReady(facts)) {
    return {
      manifest: {
        ...manifestBase({
          generatedAt,
          sourceSha256,
          proposedSha256: sourceSha256,
          sourceFacts: facts,
          proposedFacts: facts,
          status: "already_restored",
          blockers: [
            "The reviewed restoration is already present. Do not apply it twice.",
          ],
        }),
        expectedSourceSha256,
        expectedProposedSha256,
      },
      proposedSource: null,
    };
  }

  if (sourceSha256 !== expectedSourceSha256) {
    return {
      manifest: {
        ...manifestBase({
          generatedAt,
          sourceSha256,
          proposedSha256: null,
          sourceFacts: facts,
          proposedFacts: null,
          status: "source_hash_mismatch",
          blockers: [
            "The plugin bytes changed after review. Re-audit the live source and issue a new patch.",
          ],
        }),
        expectedSourceSha256,
        expectedProposedSha256,
      },
      proposedSource: null,
    };
  }

  if (!preconditionsReady(facts)) {
    return {
      manifest: {
        ...manifestBase({
          generatedAt,
          sourceSha256,
          proposedSha256: null,
          sourceFacts: facts,
          proposedFacts: null,
          status: "precondition_mismatch",
          blockers: [
            "The exact version, CTA suppression block, or floating-widget guard is not present once.",
          ],
        }),
        expectedSourceSha256,
        expectedProposedSha256,
      },
      proposedSource: null,
    };
  }

  let proposedSource = replaceExactlyOnce(
    normalizedSource,
    LIVE_HEADER_VERSION,
    RESTORED_HEADER_VERSION,
    "header_version",
  );
  proposedSource = replaceExactlyOnce(
    proposedSource,
    LIVE_CONSTANT_VERSION,
    RESTORED_CONSTANT_VERSION,
    "constant_version",
  );
  proposedSource = replaceExactlyOnce(
    proposedSource,
    WORDPRESS_HOMEPAGE_CTA_SUPPRESSION_BLOCK,
    WORDPRESS_HOMEPAGE_CTA_RESTORED_BLOCK,
    "suppression_block",
  );

  const proposedSha256 = sha256Text(proposedSource);
  const proposedFacts = sourceFacts(proposedSource);
  if (proposedSha256 !== expectedProposedSha256 || !postconditionsReady(proposedFacts)) {
    return {
      manifest: {
        ...manifestBase({
          generatedAt,
          sourceSha256,
          proposedSha256,
          sourceFacts: facts,
          proposedFacts,
          status: "postcondition_mismatch",
          blockers: [
            "The proposed bytes do not match the reviewed result or do not preserve widget suppression.",
          ],
        }),
        expectedSourceSha256,
        expectedProposedSha256,
      },
      proposedSource: null,
    };
  }

  return {
    manifest: {
      ...manifestBase({
        generatedAt,
        sourceSha256,
        proposedSha256,
        sourceFacts: facts,
        proposedFacts,
        status: "ready_for_review",
        blockers: [
          "WordPress publication approval is still required immediately before the plugin save.",
        ],
      }),
      expectedSourceSha256,
      expectedProposedSha256,
    },
    proposedSource,
  };
}

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const sourcePath = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : "";
  if (!sourcePath) {
    throw new Error("usage: node scripts/amm/wordpress-homepage-cta-restoration.mjs --source <plugin.php>");
  }
  const source = await readFile(sourcePath, "utf8");
  const result = prepareWordPressHomepageCtaRestoration(source);
  process.stdout.write(`${JSON.stringify(result.manifest, null, 2)}\n`);
  if (!["ready_for_review", "already_restored"].includes(result.manifest.status)) {
    process.exitCode = 2;
  }
}

if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
