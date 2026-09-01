import { describe, expect, it } from "vitest";

import {
  buildGrowthCapabilityLedger,
  GROWTH_CAPABILITY_STATES,
  growthCapabilityStateLabel,
} from "../../app/lib/growth/capability-ledger";

describe("Growth capability authority ledger", () => {
  it("keeps an unsealed review vehicle distinct from release authority", () => {
    const ledger = buildGrowthCapabilityLedger({ currentTailInProduction: false });

    expect(ledger.generatedFor).toBe("preview_or_local");
    expect(ledger.counts).toEqual({
      production_live: 6,
      release_candidate: 0,
      operator_gate: 2,
      host_gate: 1,
      external_dependency: 2,
      prohibited: 1,
    });
    expect(ledger.items.find((item) => item.key === "ordered_release_train")).toMatchObject({
      state: "production_live",
    });
    expect(ledger.items.find((item) => item.key === "ordered_release_train")?.approvalGate).toBeUndefined();
    expect(ledger.items.find((item) => item.key === "ordered_release_train")?.summary).toContain("PR 246");
    expect(ledger.items.find((item) => item.key === "ordered_release_train")?.summary).toContain("PR 247");
    expect(ledger.items.find((item) => item.key === "ordered_release_train")?.summary).toContain("unsealed");
    expect(JSON.stringify(ledger)).not.toContain("PR 210 remains the first pending");
  });

  it("marks only the application-bound candidates live in the canonical Production runtime", () => {
    const ledger = buildGrowthCapabilityLedger({ currentTailInProduction: true });

    expect(ledger.generatedFor).toBe("production");
    expect(ledger.counts.production_live).toBe(6);
    expect(ledger.counts.release_candidate).toBe(0);
    expect(ledger.items.find((item) => item.key === "ordered_release_train")?.approvalGate).toBeUndefined();
    expect(ledger.items.find((item) => item.key === "revival_and_review_planner")?.state).toBe("production_live");
    expect(ledger.items.find((item) => item.key === "organic_search_experiment_briefs")?.state).toBe("production_live");
    expect(ledger.items.find((item) => item.key === "wordpress_consent_and_owned_traffic")?.state).toBe("operator_gate");
    expect(ledger.items.find((item) => item.key === "facebook_preview_recovery")?.state).toBe("host_gate");
  });

  it("never promotes external providers or unrestricted autonomy", () => {
    const ledger = buildGrowthCapabilityLedger({ currentTailInProduction: true });

    expect(ledger.items.find((item) => item.key === "property_listing_alerts")?.state).toBe("external_dependency");
    expect(ledger.items.find((item) => item.key === "portal_and_ad_feedback")?.state).toBe("external_dependency");
    const autonomy = ledger.items.find((item) => item.key === "autonomous_external_actions");
    expect(autonomy?.state).toBe("prohibited");
    expect(autonomy?.summary).toContain("intentionally outside system authority");
    expect(autonomy?.nextAction).toContain("Keep these actions prohibited");
  });

  it("uses unique keys, complete evidence, internal links, and explicit state labels", () => {
    const ledger = buildGrowthCapabilityLedger({ currentTailInProduction: false });
    const keys = ledger.items.map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(ledger.items.every((item) => item.label && item.summary && item.nextAction)).toBe(true);
    expect(ledger.items.every((item) => item.evidence.length >= 3)).toBe(true);
    expect(ledger.items.every((item) => item.href.startsWith("/admin/"))).toBe(true);
    expect(GROWTH_CAPABILITY_STATES.map(growthCapabilityStateLabel)).toEqual([
      "Production live",
      "Reviewed candidate",
      "Operator approval required",
      "Hosting action required",
      "External dependency",
      "Intentionally prohibited",
    ]);
  });

  it("retains only current or future gates and records the completed host test", () => {
    const ledger = buildGrowthCapabilityLedger({ currentTailInProduction: false });
    const gates = ledger.items.flatMap((item) => item.approvalGate ? [item.approvalGate] : []);
    const facebookRecovery = ledger.items.find((item) => item.key === "facebook_preview_recovery");

    expect(gates).toEqual([
      "APPROVE PHASE 9 OUR TOWN BASIC CONSENT BRIDGE 1.2.0 INSTALLATION, LEGACY GTM REMOVAL, AND CONTROLLED RUNTIME QA",
    ]);
    expect(facebookRecovery?.approvalGate).toBeUndefined();
    expect(facebookRecovery?.summary).toContain("byte-identical backup was restored");
    expect(facebookRecovery?.nextAction).toContain("root/WHM hosting administrator");
    expect(JSON.stringify(ledger)).not.toContain("DURABLE RATE-LIMIT READINESS SECRET ENTRY");
    expect(JSON.stringify(ledger)).not.toContain("HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION");
    expect(JSON.stringify(ledger)).not.toContain("NARROW OTP FACEBOOK CRAWLER APACHE OVERRIDE TEST");
    expect(JSON.stringify(ledger)).not.toContain("CUMULATIVE GROWTH MIGRATIONS, PR 238");
    expect(JSON.stringify(ledger)).not.toContain("APPROVE ALL");
  });
});
