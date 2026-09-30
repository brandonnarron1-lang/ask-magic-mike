import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  consentLanguageSha256,
  evaluateWordPressFormCutover,
  isVersionAtLeast,
} from "../../scripts/amm/wordpress-form-cutover-lib.mjs";

const live = JSON.parse(readFileSync(resolve(
  process.cwd(),
  "docs/phase9/form7-live-snapshot-2026-09-01.json",
), "utf8"));
const contract = JSON.parse(readFileSync(resolve(
  process.cwd(),
  "wordpress/ask-magic-mike-canonical-bridge/form-contracts/form-7-property-alert-v1.json",
), "utf8"));

describe("WordPress Form 7 cutover readiness", () => {
  it("holds the audited live form for exact actionable reasons", () => {
    const report = evaluateWordPressFormCutover(live, contract);
    expect(report.status).toBe("HOLD");
    expect(report.issues.map((row) => row.code)).toEqual(expect.arrayContaining([
      "consent_copy_approval_required",
      "consent_field_missing",
      "legacy_notification_still_active",
      "indefinite_wordpress_retention",
      "raw_wordpress_ip_storage_enabled",
      "wordpress_privacy_tools_disabled",
      "form_not_canonical_allowlisted",
      "bridge_version_too_old",
    ]));
    expect(JSON.stringify(report)).not.toContain("recipient_value");
  });

  it("returns GO only for an exact consent-safe canonical state", () => {
    const language = "I expressly request property alerts by email and can unsubscribe at any time.";
    const ready = structuredClone(live);
    ready.fields.push({
      id: 10,
      type: "consent",
      label: "Property alert email consent",
      checkbox_label: language,
      description: "",
      required: true,
      visibility: "visible",
      admin_only: false,
    });
    ready.notifications[0].active = false;
    ready.privacy = {
      prevent_ip_storage: true,
      retention_policy: "delete_automatically",
      retention_days: 365,
      export_erase_enabled: true,
      identification_field_id: 2,
    };
    ready.bridge = {
      live_plugin_version: "1.3.0",
      major_minor_version: 1.3,
      canonical_allowlisted: true,
      mode: "enabled_for_forms_3_and_7",
    };

    const approved = structuredClone(contract);
    approved.consent_contract.approval_status = "approved";
    approved.consent_contract.language_version = "otp_form7_property_alert_email_v1";
    approved.consent_contract.channels.email = {
      field_id: 10,
      required: true,
      language_sha256: consentLanguageSha256(language),
    };

    expect(evaluateWordPressFormCutover(ready, approved)).toMatchObject({
      status: "GO",
      issues: [],
      checks: {
        active_native_notifications: 0,
        canonical_allowlisted: true,
      },
    });
  });

  it("compares bridge versions by components instead of decimals", () => {
    expect(isVersionAtLeast("1.3.0", "1.3.0")).toBe(true);
    expect(isVersionAtLeast("1.10.0", "1.3.0")).toBe(true);
    expect(isVersionAtLeast("1.2.99", "1.3.0")).toBe(false);
    expect(isVersionAtLeast("invalid", "1.3.0")).toBe(false);
  });
});
