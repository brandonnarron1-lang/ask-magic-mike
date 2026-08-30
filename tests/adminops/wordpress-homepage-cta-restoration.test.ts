import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WORDPRESS_HOMEPAGE_CTA_RESTORATION_GATE,
  WORDPRESS_HOMEPAGE_CTA_RESTORED_BLOCK,
  WORDPRESS_HOMEPAGE_CTA_SUPPRESSION_BLOCK,
  prepareWordPressHomepageCtaRestoration,
} from "../../scripts/amm/wordpress-homepage-cta-restoration.mjs";

const GENERATED_AT = "2026-08-29T20:42:00.000Z";
const WIDGET_RULE =
  '<style id="amm-leadops-home-suppress">.amm-widget{display:none !important;}</style>';

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function liveFixture() {
  return `<?php
/**
 * Plugin Name: Ask Magic Mike - Lead Ops & Social Share Upgrade
 * Version: 2.10.0
 */
final class AMM_Lead_Ops_Social {
    const VERSION = '2.10.0';
    public static function emit_visual_containment_css() {
${WORDPRESS_HOMEPAGE_CTA_SUPPRESSION_BLOCK}
    }
    public static function filter_homepage($html) {
        $inject = '${WIDGET_RULE}';
        return $html . $inject;
    }
}`;
}

function reviewedFixture() {
  const source = liveFixture();
  const proposed = source
    .replace(" * Version: 2.10.0", " * Version: 2.10.1")
    .replace("    const VERSION = '2.10.0';", "    const VERSION = '2.10.1';")
    .replace(
      WORDPRESS_HOMEPAGE_CTA_SUPPRESSION_BLOCK,
      WORDPRESS_HOMEPAGE_CTA_RESTORED_BLOCK,
    );
  return {
    source,
    proposed,
    options: {
      generatedAt: GENERATED_AT,
      expectedSourceSha256: sha256(source),
      expectedProposedSha256: sha256(proposed),
    },
  };
}

describe("WordPress homepage CTA restoration packet", () => {
  it("changes only the reviewed plugin version and homepage suppression block", () => {
    const fixture = reviewedFixture();
    const result = prepareWordPressHomepageCtaRestoration(
      fixture.source,
      fixture.options,
    );

    expect(result.manifest).toMatchObject({
      schemaVersion: "amm.wordpress_homepage_cta_restoration.v1",
      generatedAt: GENERATED_AT,
      mode: "offline_plugin_source_precondition",
      status: "ready_for_review",
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
      preservesFloatingWidgetSuppression: true,
      containsPluginSource: false,
    });
    expect(result.proposedSource).toBe(fixture.proposed);
    expect(result.proposedSource).not.toContain(
      ".amm-cta,.amm-cta--dark{display:none !important;}",
    );
    expect(result.proposedSource).toContain(WIDGET_RULE);
    expect(result.proposedSource).toContain(" * Version: 2.10.1");
    expect(result.proposedSource).toContain("    const VERSION = '2.10.1';");
  });

  it("fails closed when the source bytes drift after review", () => {
    const fixture = reviewedFixture();
    const result = prepareWordPressHomepageCtaRestoration(
      `${fixture.source}\n// unreviewed drift`,
      fixture.options,
    );
    expect(result.manifest.status).toBe("source_hash_mismatch");
    expect(result.manifest.publicationBlocked).toBe(true);
    expect(result.proposedSource).toBeNull();
  });

  it("fails closed when the exact suppression or widget guard is ambiguous", () => {
    const duplicate = `${liveFixture()}\n${WORDPRESS_HOMEPAGE_CTA_SUPPRESSION_BLOCK}`;
    const duplicateResult = prepareWordPressHomepageCtaRestoration(duplicate, {
      generatedAt: GENERATED_AT,
      expectedSourceSha256: sha256(duplicate),
      expectedProposedSha256: "0".repeat(64),
    });
    expect(duplicateResult.manifest.status).toBe("precondition_mismatch");
    expect(duplicateResult.proposedSource).toBeNull();

    const missingWidget = liveFixture().replace(WIDGET_RULE, "");
    const missingWidgetResult = prepareWordPressHomepageCtaRestoration(missingWidget, {
      generatedAt: GENERATED_AT,
      expectedSourceSha256: sha256(missingWidget),
      expectedProposedSha256: "0".repeat(64),
    });
    expect(missingWidgetResult.manifest.status).toBe("precondition_mismatch");
    expect(missingWidgetResult.manifest.preservesFloatingWidgetSuppression).toBe(false);
  });

  it("recognizes an exact restored source and refuses to apply twice", () => {
    const fixture = reviewedFixture();
    const result = prepareWordPressHomepageCtaRestoration(
      fixture.proposed,
      fixture.options,
    );
    expect(result.manifest.status).toBe("already_restored");
    expect(result.manifest.publicationBlocked).toBe(true);
    expect(result.proposedSource).toBeNull();
  });

  it("keeps the operational verifier read-only and provider-free", () => {
    const source = readFileSync(
      "scripts/amm/wordpress-homepage-cta-restoration.mjs",
      "utf8",
    );
    expect(source).toContain("readFile");
    expect(source).not.toMatch(/writeFile|fetch\(|DATABASE_URL|nodemailer|send\(|POST|PUT|PATCH|DELETE/);
    expect(source).not.toContain("252-245-4337");
    expect(source).not.toContain("252-289-5194");
    expect(source).not.toContain("dabnelly23@gmail.com");
  });

  it("ships one minimal review patch without a competing widget or form change", () => {
    const patch = readFileSync(
      "wordpress/patches/ask-magic-mike-lead-ops-v2.10.1-homepage-cta.patch",
      "utf8",
    );
    expect(patch).toContain("- * Version: 2.10.0");
    expect(patch).toContain("+ * Version: 2.10.1");
    expect(patch).toContain("-    const VERSION = '2.10.0';");
    expect(patch).toContain("+    const VERSION = '2.10.1';");
    expect(patch).toContain(`-${WORDPRESS_HOMEPAGE_CTA_SUPPRESSION_BLOCK.split("\n")[1]}`);
    expect(patch).toContain(
      `+${WORDPRESS_HOMEPAGE_CTA_RESTORED_BLOCK.split("\n")[1]}`,
    );
    expect(patch).not.toContain(".amm-widget{display:none !important;}");
    expect(patch).not.toMatch(/gform|canonical bridge|notification|LEADS_TABLE\s*[-+]/i);
  });
});
