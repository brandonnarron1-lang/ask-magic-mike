import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const plugin = readFileSync(
  resolve(process.cwd(), "wordpress/ask-magic-mike-canonical-bridge/ask-magic-mike-canonical-bridge.php"),
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

  it("denies all communication permissions for legacy forms without canonical consent", () => {
    expect(plugin).toContain("'consent_email' => false");
    expect(plugin).toContain("'consent_call' => false");
    expect(plugin).toContain("'consent_sms' => false");
  });

  it("uses deterministic Gravity Forms idempotency and bounded retries", () => {
    expect(plugin).toContain("'gf:' . $form_id . ':' . $entry_id");
    expect(plugin).toContain("private const MAX_ATTEMPTS = 3");
    expect(plugin).toContain("wp_schedule_single_event");
  });
});
