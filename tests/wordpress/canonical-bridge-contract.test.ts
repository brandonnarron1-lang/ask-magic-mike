import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const plugin = readFileSync(
  resolve(process.cwd(), "wordpress/ask-magic-mike-canonical-bridge/ask-magic-mike-canonical-bridge.php"),
  "utf8",
);
const consentGate = readFileSync(
  resolve(
    process.cwd(),
    "wordpress/ask-magic-mike-canonical-bridge/assets/amm-consent-gate.js",
  ),
  "utf8",
);

describe("WordPress canonical bridge contract", () => {
  it("uses the post-save Gravity Forms hook and an explicit 1-7 allowlist", () => {
    expect(plugin).toContain("gform_after_submission");
    for (const formId of [1, 2, 3, 4, 5, 6, 7]) {
      expect(plugin).toContain(`${formId} => array(`);
    }
  });

  it("signs the exact JSON body and never sends WordPress email", () => {
    expect(plugin).toContain("hash_hmac('sha256'");
    expect(plugin).toContain("X-AMM-WP-Signature");
    expect(plugin).not.toContain("wp_mail(");
  });

  it("defaults to no forwarding unless the explicit constant is true", () => {
    expect(plugin).toContain("AMM_CANONICAL_BRIDGE_ENABLED");
    expect(plugin).toContain("AMM_CANONICAL_BRIDGE_ENABLED === true");
    expect(plugin).toContain("shadow_observed");
  });

  it("requires an explicit audited per-form allowlist even when globally enabled", () => {
    expect(plugin).toContain("Version: 1.3.0");
    expect(plugin).toContain("AMM_CANONICAL_BRIDGE_FORM_IDS");
    expect(plugin).toContain("WORDPRESS_BRIDGE_FORM_IDS");
    expect(plugin).toContain("enabledForForm");
    expect(plugin).toContain("shadow_not_allowlisted");
    expect(plugin).toContain("Configuration blocked — no forms allowlisted");
    expect(plugin).toContain("Signing secret:");
  });

  it("denies all communication permissions for legacy forms without canonical consent", () => {
    expect(plugin).toContain("'consent_email' => false");
    expect(plugin).toContain("'consent_call' => false");
    expect(plugin).toContain("'consent_sms' => false");
  });

  it("blocks Form 7 unless exact per-channel Gravity consent is pinned", () => {
    expect(plugin).toContain("CONSENT_REQUIRED_FORM_IDS = array(7)");
    expect(plugin).toContain("CONSENT_REQUIRED_CHANNELS = array(7 => array('email'))");
    expect(plugin).toContain("AMM_CANONICAL_BRIDGE_CONSENT_CONTRACTS");
    expect(plugin).toContain("WORDPRESS_BRIDGE_CONSENT_CONTRACTS");
    expect(plugin).toContain("consent_contract_blocked");
    expect(plugin).toContain("consent_language_hash_mismatch");
    expect(plugin).toContain("consent_timestamp_missing");
    expect(plugin).toContain("date_created");
    expect(plugin).toContain("$field_id . '.1'");
    expect(plugin).toContain("hash_equals");
  });

  it("allows lead PII to leave WordPress only for the canonical HTTPS endpoint", () => {
    expect(plugin).toContain("CANONICAL_LEAD_ENDPOINT = 'https://www.askmagicmike.com/api/leads'");
    expect(plugin).toContain("Canonical lead endpoint is not approved.");
    expect(plugin).toContain("hash_equals(self::CANONICAL_LEAD_ENDPOINT, $configured)");
    expect(plugin).toContain("wp_remote_post($endpoint");
    expect(plugin).not.toMatch(/nellyselly/i);
  });

  it("uses deterministic Gravity Forms idempotency and bounded retries", () => {
    expect(plugin).toContain("'gf:' . $form_id . ':' . $entry_id");
    expect(plugin).toContain("private const MAX_ATTEMPTS = 3");
    expect(plugin).toContain("wp_schedule_single_event");
  });

  it("keeps measurement independently disabled unless explicitly enabled", () => {
    expect(plugin).toContain("AMM_GOOGLE_MEASUREMENT_ENABLED");
    expect(plugin).toContain("AMM_GOOGLE_MEASUREMENT_ENABLED === true");
    expect(plugin).toContain("add_action('wp_head'");
    expect(plugin).toContain("'render_measurement_gate'), 0");
    expect(plugin).toContain('data-amm-consent-gate="basic-v1"');
    expect(plugin).toContain("GTM-KZMCSLTJ");
    expect(plugin).toContain("vv_cookieconsent_status");
    expect(plugin).toContain("Disabled — no Google measurement loader");
  });

  it("ships a fixed Basic Consent loader with no legacy noscript bypass", () => {
    expect(consentGate).toContain('EXPECTED_CONTAINER = "GTM-KZMCSLTJ"');
    expect(consentGate).toContain('EXPLICIT_ALLOW = "allow"');
    expect(consentGate).toContain("document.cookie");
    expect(consentGate).toContain("window.dataLayer");
    expect(consentGate).toContain('ad_storage: "denied"');
    expect(consentGate).toContain('ad_user_data: "denied"');
    expect(consentGate).toContain('ad_personalization: "denied"');
    expect(consentGate).toContain('analytics_storage: "granted"');
    expect(consentGate).toContain('"ads_data_redaction", true');
    expect(consentGate).toContain('"url_passthrough", false');
    expect(plugin).not.toContain("googletagmanager.com/ns.html");
  });
});
