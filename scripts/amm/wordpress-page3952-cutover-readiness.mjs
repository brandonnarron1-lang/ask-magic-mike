#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const page3952CutoverContract = {
  schemaVersion: "amm.wordpress_page_source_cutover_contract.v1",
  placementKey: "wordpress_home_value",
  pageId: 3952,
  sourceUrl:
    "https://www.ourtownproperties.com/how-much-is-your-home-worth/",
  sourceLength: 411,
  sourceSha256:
    "6710a4457945d1aba0308b07def30dfa05a8935121cd02a6baa3c66611ec2bdf",
  currentShortcode:
    '[ask_magic_mike_cta source="home_value_page" button_text="Ask Magic Mike"]',
  proposedShortcode:
    '[ask_magic_mike_cta route="/home-value" source="home_value_page" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_home_value_page" button_text="Ask Magic Mike"]',
  proposedSourceLength: 564,
  proposedSourceSha256:
    "ef9f4f85f3b531644010e4b5e46121a6e12db3807c1f8c928a1945bf12bc266e",
  requiredConnectorVersion: "1.1.0",
  approvalGate: "APPROVE PHASE 9 HOME VALUE CTA WORDPRESS PUBLICATION",
  requiresPostmetaBackup: true,
  requiresRevision: true,
  requiresRevisionSourceHash: true,
};
Object.freeze(page3952CutoverContract);
export const WORDPRESS_PAGE3952_CUTOVER_CONTRACT = page3952CutoverContract;
export const WORDPRESS_PAGE3952_PUBLICATION_GATE =
  WORDPRESS_PAGE3952_CUTOVER_CONTRACT.approvalGate;
export const WORDPRESS_PAGE3952_CURRENT_SHORTCODE =
  WORDPRESS_PAGE3952_CUTOVER_CONTRACT.currentShortcode;
export const WORDPRESS_PAGE3952_PROPOSED_SHORTCODE =
  WORDPRESS_PAGE3952_CUTOVER_CONTRACT.proposedShortcode;

function sha256Text(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function byteLength(value) {
  return Buffer.byteLength(String(value ?? ""), "utf8");
}

function countExact(source, needle) {
  return needle ? source.split(needle).length - 1 : 0;
}

function countMatches(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function sourceFacts(source, contract) {
  return {
    byteLength: byteLength(source),
    sha256: sha256Text(source),
    currentShortcodeOccurrences: countExact(source, contract.currentShortcode),
    proposedShortcodeOccurrences: countExact(source, contract.proposedShortcode),
    shortcodeOccurrences: countMatches(source, /\[[a-z][^\]\r\n]*\]/gi),
    phoneOccurrences: countMatches(
      source,
      /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    ),
    gravityFormOccurrences: countMatches(source, /gravityform|gform_/gi),
    htmlFormOccurrences: countMatches(source, /<form\b/gi),
  };
}

function sourcePreconditionsReady(facts, contract) {
  return (
    facts.byteLength === contract.sourceLength &&
    facts.sha256 === contract.sourceSha256 &&
    facts.currentShortcodeOccurrences === 1 &&
    facts.proposedShortcodeOccurrences === 0 &&
    facts.shortcodeOccurrences === 1
  );
}

function proposedPostconditionsReady(sourceFactsBefore, proposedFacts, contract) {
  return (
    proposedFacts.byteLength === contract.proposedSourceLength &&
    proposedFacts.sha256 === contract.proposedSourceSha256 &&
    proposedFacts.currentShortcodeOccurrences === 0 &&
    proposedFacts.proposedShortcodeOccurrences === 1 &&
    proposedFacts.shortcodeOccurrences === 1 &&
    proposedFacts.phoneOccurrences === sourceFactsBefore.phoneOccurrences &&
    proposedFacts.gravityFormOccurrences === sourceFactsBefore.gravityFormOccurrences &&
    proposedFacts.htmlFormOccurrences === sourceFactsBefore.htmlFormOccurrences
  );
}

function normalizeEvidence(options, contract) {
  const connectorVersion = String(options.connectorVersion ?? "").trim();
  const postmetaBackupSha256 = String(options.postmetaBackupSha256 ?? "")
    .trim()
    .toLowerCase();
  const revisionId = Number(options.revisionId);
  const revisionSourceSha256 = String(options.revisionSourceSha256 ?? "")
    .trim()
    .toLowerCase();
  const revisionIdReady = Number.isSafeInteger(revisionId) && revisionId > 0;
  const revisionSourceReady = revisionSourceSha256 === contract.sourceSha256;
  return {
    connectorVersion,
    connectorVersionReady: connectorVersion === contract.requiredConnectorVersion,
    postmetaBackupSha256,
    postmetaBackupReady: /^[a-f0-9]{64}$/.test(postmetaBackupSha256),
    revisionId:
      revisionIdReady ? revisionId : null,
    revisionSourceSha256,
    revisionSourceReady,
    revisionReady: revisionIdReady && revisionSourceReady,
  };
}

function prerequisiteBlockers(evidence) {
  const blockers = [];
  if (!evidence.connectorVersionReady) {
    blockers.push("connector_version_unverified");
  }
  if (!evidence.postmetaBackupReady) {
    blockers.push("postmeta_backup_sha256_missing");
  }
  if (evidence.revisionId === null) {
    blockers.push("revision_id_missing");
  } else if (!evidence.revisionSourceReady) {
    blockers.push("revision_source_sha256_unverified");
  }
  return blockers;
}

function manifestBase({
  contract,
  generatedAt,
  status,
  blockers,
  sourceFactsBefore,
  proposedFacts,
  evidence,
}) {
  return {
    schemaVersion: contract.schemaVersion,
    generatedAt,
    mode: "offline_exact_page_source_precondition",
    status,
    placementKey: contract.placementKey,
    pageId: contract.pageId,
    sourceUrl: contract.sourceUrl,
    sourceFacts: sourceFactsBefore,
    proposedFacts,
    requiredConnectorVersion: contract.requiredConnectorVersion,
    evidence,
    blockers,
    approvalGate: contract.approvalGate,
    approvalRequired: true,
    approvalRequestable: status === "ready_for_approval",
    publicationAuthorized: false,
    publicationBlocked: true,
    wordpressMutationPerformed: false,
    cachePurgePerformed: false,
    pageMutationPerformed: false,
    formMutationPerformed: false,
    notificationMutationPerformed: false,
    databaseMutationPerformed: false,
    changesExactlyOneShortcode:
      proposedFacts?.currentShortcodeOccurrences === 0 &&
      proposedFacts?.proposedShortcodeOccurrences === 1,
    preservesCurrentPublicPhone:
      proposedFacts?.phoneOccurrences === sourceFactsBefore.phoneOccurrences,
    preservesGravityForms:
      proposedFacts?.gravityFormOccurrences ===
      sourceFactsBefore.gravityFormOccurrences,
    preservesHtmlForms:
      proposedFacts?.htmlFormOccurrences === sourceFactsBefore.htmlFormOccurrences,
    containsPageSource: false,
  };
}

export function prepareWordPressPage3952Cutover(
  source,
  options = {},
  contract = WORDPRESS_PAGE3952_CUTOVER_CONTRACT,
) {
  const normalizedSource = String(source ?? "");
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const evidence = normalizeEvidence(options, contract);
  const facts = sourceFacts(normalizedSource, contract);

  if (
    facts.sha256 === contract.proposedSourceSha256 &&
    facts.byteLength === contract.proposedSourceLength &&
    facts.currentShortcodeOccurrences === 0 &&
    facts.proposedShortcodeOccurrences === 1 &&
    facts.shortcodeOccurrences === 1
  ) {
    return {
      manifest: manifestBase({
        contract,
        generatedAt,
        status: "already_cutover",
        blockers: ["reviewed_shortcode_already_present_do_not_apply_twice"],
        sourceFactsBefore: facts,
        proposedFacts: facts,
        evidence,
      }),
      proposedSource: null,
    };
  }

  if (
    facts.sha256 !== contract.sourceSha256 ||
    facts.byteLength !== contract.sourceLength
  ) {
    return {
      manifest: manifestBase({
        contract,
        generatedAt,
        status: "source_hash_mismatch",
        blockers: ["page_source_changed_after_authenticated_review"],
        sourceFactsBefore: facts,
        proposedFacts: null,
        evidence,
      }),
      proposedSource: null,
    };
  }

  if (!sourcePreconditionsReady(facts, contract)) {
    return {
      manifest: manifestBase({
        contract,
        generatedAt,
        status: "precondition_mismatch",
        blockers: ["reviewed_shortcode_is_missing_or_ambiguous"],
        sourceFactsBefore: facts,
        proposedFacts: null,
        evidence,
      }),
      proposedSource: null,
    };
  }

  const shortcodeIndex = normalizedSource.indexOf(contract.currentShortcode);
  const proposedSource = `${normalizedSource.slice(0, shortcodeIndex)}${
    contract.proposedShortcode
  }${normalizedSource.slice(shortcodeIndex + contract.currentShortcode.length)}`;
  const proposedFacts = sourceFacts(proposedSource, contract);

  if (!proposedPostconditionsReady(facts, proposedFacts, contract)) {
    return {
      manifest: manifestBase({
        contract,
        generatedAt,
        status: "postcondition_mismatch",
        blockers: ["proposed_page_source_does_not_match_reviewed_bytes"],
        sourceFactsBefore: facts,
        proposedFacts,
        evidence,
      }),
      proposedSource: null,
    };
  }

  const blockers = prerequisiteBlockers(evidence);
  const status = blockers.length === 0
    ? "ready_for_approval"
    : "blocked_prerequisites";

  return {
    manifest: manifestBase({
      contract,
      generatedAt,
      status,
      blockers,
      sourceFactsBefore: facts,
      proposedFacts,
      evidence,
    }),
    proposedSource,
  };
}

function argumentValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

async function main() {
  const sourcePath = argumentValue("--source");
  if (!sourcePath) {
    throw new Error(
      "usage: node scripts/amm/wordpress-page3952-cutover-readiness.mjs --source <page-source.txt> [--connector-version 1.1.0] [--postmeta-sha256 <digest>] [--revision-id <id>] [--revision-source-sha256 <digest>]",
    );
  }
  const source = await readFile(sourcePath, "utf8");
  const result = prepareWordPressPage3952Cutover(source, {
    connectorVersion: argumentValue("--connector-version"),
    postmetaBackupSha256: argumentValue("--postmeta-sha256"),
    revisionId: argumentValue("--revision-id"),
    revisionSourceSha256: argumentValue("--revision-source-sha256"),
  });
  process.stdout.write(`${JSON.stringify(result.manifest, null, 2)}\n`);
  if (!["ready_for_approval", "already_cutover"].includes(result.manifest.status)) {
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
