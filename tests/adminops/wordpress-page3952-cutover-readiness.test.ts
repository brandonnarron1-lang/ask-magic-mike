import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WORDPRESS_PAGE3952_CURRENT_SHORTCODE,
  WORDPRESS_PAGE3952_CUTOVER_CONTRACT,
  WORDPRESS_PAGE3952_PROPOSED_SHORTCODE,
  WORDPRESS_PAGE3952_PUBLICATION_GATE,
  prepareWordPressPage3952Cutover,
} from "../../scripts/amm/wordpress-page3952-cutover-readiness.mjs";

const GENERATED_AT = "2026-09-01T18:00:00.000Z";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function fixtureSource() {
  return `<!-- Beaver Builder source before -->\n${WORDPRESS_PAGE3952_CURRENT_SHORTCODE}\n<!-- source after -->`;
}

function fixtureContract(source = fixtureSource()) {
  const proposed = source.replace(
    WORDPRESS_PAGE3952_CURRENT_SHORTCODE,
    WORDPRESS_PAGE3952_PROPOSED_SHORTCODE,
  );
  return {
    ...WORDPRESS_PAGE3952_CUTOVER_CONTRACT,
    sourceLength: Buffer.byteLength(source),
    sourceSha256: sha256(source),
    proposedSourceLength: Buffer.byteLength(proposed),
    proposedSourceSha256: sha256(proposed),
  };
}

describe("WordPress page 3952 exact-source cutover readiness", () => {
  it("pins the authenticated page identity and reviewed shortcode bytes", () => {
    const diskContract = JSON.parse(
      readFileSync("config/wordpress-page3952-cutover-contract.json", "utf8"),
    );
    expect(diskContract).toEqual(WORDPRESS_PAGE3952_CUTOVER_CONTRACT);
    expect(WORDPRESS_PAGE3952_CUTOVER_CONTRACT).toMatchObject({
      pageId: 3952,
      sourceLength: 411,
      sourceSha256:
        "6710a4457945d1aba0308b07def30dfa05a8935121cd02a6baa3c66611ec2bdf",
      proposedSourceLength: 564,
      proposedSourceSha256:
        "ef9f4f85f3b531644010e4b5e46121a6e12db3807c1f8c928a1945bf12bc266e",
      requiredConnectorVersion: "1.1.0",
      approvalGate: WORDPRESS_PAGE3952_PUBLICATION_GATE,
    });
    expect(WORDPRESS_PAGE3952_CURRENT_SHORTCODE).not.toContain("route=");
    expect(WORDPRESS_PAGE3952_PROPOSED_SHORTCODE).toContain(
      'route="/home-value"',
    );
    expect(WORDPRESS_PAGE3952_PROPOSED_SHORTCODE).toContain(
      'utm_content="wordpress_home_value_page"',
    );
  });

  it("builds one exact substitution but stays blocked without rollback evidence", () => {
    const source = fixtureSource();
    const contract = fixtureContract(source);
    const result = prepareWordPressPage3952Cutover(
      source,
      { generatedAt: GENERATED_AT, revisionId: 4332 },
      contract,
    );

    expect(result.manifest).toMatchObject({
      generatedAt: GENERATED_AT,
      status: "blocked_prerequisites",
      approvalRequestable: false,
      publicationAuthorized: false,
      publicationBlocked: true,
      wordpressMutationPerformed: false,
      pageMutationPerformed: false,
      changesExactlyOneShortcode: true,
      preservesReviewedLiterals: true,
      preservesCurrentPublicPhone: true,
      preservesGravityForms: true,
      preservesHtmlForms: true,
      containsPageSource: false,
      blockers: [
        "connector_version_unverified",
        "postmeta_backup_sha256_missing",
        "revision_source_sha256_unverified",
      ],
    });
    expect(result.proposedSource).toBe(
      source.replace(
        WORDPRESS_PAGE3952_CURRENT_SHORTCODE,
        WORDPRESS_PAGE3952_PROPOSED_SHORTCODE,
      ),
    );
    expect(JSON.stringify(result.manifest)).not.toContain(source);
  });

  it("becomes requestable only with Connector, postmeta, and revision evidence", () => {
    const source = fixtureSource();
    const contract = fixtureContract(source);
    const result = prepareWordPressPage3952Cutover(
      source,
      {
        generatedAt: GENERATED_AT,
        connectorVersion: "1.1.0",
        postmetaBackupSha256: "a".repeat(64),
        revisionId: 4332,
        revisionSourceSha256: contract.sourceSha256,
      },
      contract,
    );

    expect(result.manifest).toMatchObject({
      status: "ready_for_approval",
      blockers: [],
      approvalRequestable: true,
      approvalRequired: true,
      publicationAuthorized: false,
      publicationBlocked: true,
      evidence: {
        connectorVersionReady: true,
        postmetaBackupReady: true,
        revisionReady: true,
      },
    });
  });

  it("fails closed on source drift, duplicate shortcodes, or output drift", () => {
    const source = fixtureSource();
    const contract = fixtureContract(source);
    expect(
      prepareWordPressPage3952Cutover(`${source}\n<!-- drift -->`, {}, contract)
        .manifest.status,
    ).toBe("source_hash_mismatch");

    const duplicate = `${source}\n${WORDPRESS_PAGE3952_CURRENT_SHORTCODE}`;
    expect(
      prepareWordPressPage3952Cutover(
        duplicate,
        {},
        fixtureContract(duplicate),
      ).manifest.status,
    ).toBe("precondition_mismatch");

    expect(
      prepareWordPressPage3952Cutover(source, {}, {
        ...contract,
        proposedSourceSha256: "0".repeat(64),
      }).manifest.status,
    ).toBe("postcondition_mismatch");
  });

  it("recognizes the reviewed result and refuses a second application", () => {
    const source = fixtureSource();
    const contract = fixtureContract(source);
    const proposed = source.replace(
      WORDPRESS_PAGE3952_CURRENT_SHORTCODE,
      WORDPRESS_PAGE3952_PROPOSED_SHORTCODE,
    );
    const result = prepareWordPressPage3952Cutover(proposed, {}, contract);
    expect(result.manifest.status).toBe("already_cutover");
    expect(result.manifest.approvalRequestable).toBe(false);
    expect(result.manifest.publicationBlocked).toBe(true);
    expect(result.proposedSource).toBeNull();
  });

  it("keeps the verifier read-only, provider-free, and free of contact PII", () => {
    const source = [
      readFileSync(
        "scripts/amm/wordpress-page3952-cutover-readiness.mjs",
        "utf8",
      ),
      readFileSync(
        "scripts/amm/wordpress-page-source-cutover-lib.mjs",
        "utf8",
      ),
    ].join("\n");
    expect(source).toContain("readFile");
    expect(source).not.toMatch(
      /writeFile|fetch\(|DATABASE_URL|nodemailer|send\(|\bPOST\b|\bPUT\b|\bPATCH\b|\bDELETE\b/,
    );
    expect(source).not.toMatch(/252[- .]?245[- .]?4337/);
    expect(source).not.toMatch(/252[- .]?289[- .]?5194/);
    expect(source).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });
});
