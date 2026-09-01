import { createHash } from "node:crypto";

function issue(code, detail) {
  return { code, detail };
}

export function normalizeConsentLanguage(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function consentLanguageSha256(value) {
  return createHash("sha256").update(normalizeConsentLanguage(value)).digest("hex");
}

function versionParts(value) {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(String(value || "").trim());
  return match ? match.slice(1).map((part) => Number(part || 0)) : null;
}

export function isVersionAtLeast(actual, minimum) {
  const actualParts = versionParts(actual);
  const minimumParts = versionParts(minimum);
  if (!actualParts || !minimumParts) return false;
  for (let index = 0; index < 3; index += 1) {
    if (actualParts[index] !== minimumParts[index]) {
      return actualParts[index] > minimumParts[index];
    }
  }
  return true;
}

export function evaluateWordPressFormCutover(snapshot, contract) {
  const issues = [];
  if (snapshot?.form_id !== contract?.form_id) {
    issues.push(issue("form_identity_mismatch", `Expected Form ${contract?.form_id ?? "unknown"}.`));
  }

  const fields = Array.isArray(snapshot?.fields) ? snapshot.fields : [];
  const fieldsById = new Map(fields.map((field) => [Number(field.id), field]));
  for (const expected of contract?.required_fields || []) {
    const actual = fieldsById.get(Number(expected.id));
    if (!actual || actual.type !== expected.type || Boolean(actual.required) !== Boolean(expected.required)) {
      issues.push(issue(
        "required_field_contract_mismatch",
        `Field ${expected.id} must remain ${expected.type} with required=${Boolean(expected.required)}.`,
      ));
    }
  }

  if (!snapshot?.spam?.captcha_present || !snapshot?.spam?.honeypot_enabled) {
    issues.push(issue("spam_controls_incomplete", "CAPTCHA and the Gravity Forms honeypot must both remain enabled."));
  }
  if (snapshot?.spam?.honeypot_action !== "abort_without_entry") {
    issues.push(issue("honeypot_action_not_fail_closed", "Honeypot detections must not create a lead entry."));
  }

  const consentContract = contract?.consent_contract || {};
  if (consentContract.approval_status !== "approved") {
    issues.push(issue("consent_copy_approval_required", "Brokerage/BIC approval of exact versioned copy is not recorded."));
  } else if (
    !/^[a-z0-9][a-z0-9_.:-]{0,119}$/i.test(String(consentContract.language_version || "")) ||
    /^pending(?:_|$)/i.test(String(consentContract.language_version || ""))
  ) {
    issues.push(issue("consent_language_version_invalid", "Approved consent copy requires a stable non-pending language version."));
  }
  for (const [channel, expected] of Object.entries(consentContract.channels || {})) {
    const fieldId = Number(expected.field_id || 0);
    const field = fieldsById.get(fieldId);
    if (!fieldId || !field || field.type !== "consent") {
      issues.push(issue("consent_field_missing", `${channel} consent must use its exact approved Gravity Forms Consent field.`));
      continue;
    }
    if (field.visibility !== "visible" || field.admin_only === true) {
      issues.push(issue("consent_field_not_public", `${channel} consent must be visible to the submitting consumer.`));
    }
    if (Boolean(field.required) !== Boolean(expected.required)) {
      issues.push(issue("consent_required_state_mismatch", `${channel} consent required state does not match the approved contract.`));
    }
    const expectedHash = String(expected.language_sha256 || "").toLowerCase();
    const actualHash = consentLanguageSha256(`${field.checkbox_label || ""} ${field.description || ""}`);
    if (!/^[a-f0-9]{64}$/.test(expectedHash) || actualHash !== expectedHash) {
      issues.push(issue("consent_language_hash_mismatch", `${channel} consent copy does not match the approved SHA-256 contract.`));
    }
  }

  const activeNotifications = (snapshot?.notifications || []).filter((notification) => notification.active);
  if (activeNotifications.length > Number(contract?.final_state?.max_active_native_notifications ?? 0)) {
    issues.push(issue("legacy_notification_still_active", "The legacy Gravity Forms alert must be inactive after canonical delivery acceptance."));
  }
  if ((snapshot?.constant_contact?.feeds || []).length > 0) {
    issues.push(issue("parallel_marketing_feed_present", "Direct Constant Contact enrollment is outside the canonical lead contract."));
  }

  if (snapshot?.privacy?.retention_policy === "retain_indefinitely") {
    issues.push(issue("indefinite_wordpress_retention", "A bounded or explicitly approved WordPress audit-copy retention policy is required."));
  }
  if (contract?.final_state?.prevent_wordpress_ip_storage && !snapshot?.privacy?.prevent_ip_storage) {
    issues.push(issue("raw_wordpress_ip_storage_enabled", "Form 7 must stop retaining raw IP addresses before final cutover."));
  }
  if (contract?.final_state?.wordpress_export_erase_enabled && !snapshot?.privacy?.export_erase_enabled) {
    issues.push(issue("wordpress_privacy_tools_disabled", "WordPress export/erase integration must be enabled for the retained audit copy."));
  }

  if (!snapshot?.bridge?.canonical_allowlisted) {
    issues.push(issue("form_not_canonical_allowlisted", "Form 7 is not in the canonical bridge allowlist."));
  }
  if (!isVersionAtLeast(
    snapshot?.bridge?.live_plugin_version,
    contract?.final_state?.minimum_bridge_version,
  )) {
    issues.push(issue("bridge_version_too_old", "The live bridge lacks the consent-contract runtime."));
  }
  if (contract?.protected_entry_ids?.some((entryId) => !(snapshot?.protected_entry_ids || []).includes(entryId))) {
    issues.push(issue("protected_legacy_entry_missing", "Protected genuine legacy entries must remain explicitly excluded from import and QA."));
  }

  return {
    status: issues.length === 0 ? "GO" : "HOLD",
    form_id: contract?.form_id ?? null,
    issues,
    checks: {
      fields_observed: fields.length,
      consent_channels_required: Object.keys(consentContract.channels || {}),
      active_native_notifications: activeNotifications.length,
      constant_contact_feeds: (snapshot?.constant_contact?.feeds || []).length,
      canonical_allowlisted: Boolean(snapshot?.bridge?.canonical_allowlisted),
    },
  };
}
