import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOME_VALUE_TRUST_EXPERIMENT,
  simulateExperimentAllocation,
  validateExperimentDefinition,
} from "../../app/lib/growth/experiment-registry";
import { assignExperimentVariant } from "../../app/lib/growth/experiment-engine";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Phase 9.6 experiment command", () => {
  it("defines a complete approval-gated home-value experiment", () => {
    const validation = validateExperimentDefinition(HOME_VALUE_TRUST_EXPERIMENT);
    expect(validation).toEqual({ valid: true, reasons: [], totalWeight: 100 });
    expect(HOME_VALUE_TRUST_EXPERIMENT.primaryMetric).toBe("qualified_appointment_rate");
    expect(HOME_VALUE_TRUST_EXPERIMENT.guardrails.length).toBeGreaterThanOrEqual(3);
    expect(HOME_VALUE_TRUST_EXPERIMENT.activationControls).toHaveLength(3);
  });

  it("assigns the same anonymous subject deterministically", () => {
    const variants = [...HOME_VALUE_TRUST_EXPERIMENT.variants];
    const first = assignExperimentVariant(HOME_VALUE_TRUST_EXPERIMENT.key, "digest-123", variants);
    const second = assignExperimentVariant(HOME_VALUE_TRUST_EXPERIMENT.key, "digest-123", variants);
    expect(first).toBe(second);
  });

  it("keeps a 1,000-subject rehearsal close to the reviewed allocation", () => {
    const simulation = simulateExperimentAllocation(HOME_VALUE_TRUST_EXPERIMENT);
    expect(simulation.sampleSize).toBe(1_000);
    expect(simulation.counts.control).toBeGreaterThan(430);
    expect(simulation.counts.control).toBeLessThan(570);
    expect(simulation.counts.broker_review).toBe(1_000 - simulation.counts.control);
  });

  it("uses compliant visible copy without valuation, offer, or response guarantees", () => {
    const copy = HOME_VALUE_TRUST_EXPERIMENT.variants
      .flatMap((variant) => [variant.headline, variant.description])
      .join(" ");
    expect(copy).not.toMatch(/guaranteed|instant value|cash offer|appraisal result|respond within/i);
    expect(copy).toContain("broker-reviewed");
  });

  it("protects the command route and keeps it read-only", () => {
    const page = source("app/admin/experiments/page.tsx");
    expect(page).toContain('requireLeadCenterPermission("report:view")');
    expect(page).not.toMatch(/<form|server action|UPDATE public|INSERT INTO public/i);
    expect(page).toContain("Merge and deployment do not activate the experiment");
  });

  it("registers the public endpoint and admin route in the active manifest", () => {
    const manifest = JSON.parse(source("config/active-route-manifest.json")) as {
      expectedRoutes: string[];
      required: { admin: string[]; api: string[] };
    };
    expect(manifest.expectedRoutes).toContain("/admin/experiments");
    expect(manifest.expectedRoutes).toContain("/api/experiments/event");
    expect(manifest.required.admin).toContain("/admin/experiments");
    expect(manifest.required.api).toContain("/api/experiments/event");
  });

  it("keeps the public page unchanged when the server-side gate is inactive", () => {
    const component = source("app/components/black-diamond/HomeValueExperimentExperience.tsx");
    const repository = source("app/lib/persistence/neonPublicExperimentRepository.ts");
    expect(component).toContain("HOME_VALUE_TRUST_EXPERIMENT.variants[0]");
    expect(repository).toContain('PUBLIC_EXPERIMENTS_ENABLED !== "true"');
    expect(repository).toContain('experiment.status !== "running"');
    expect(repository).toContain('experiment.approval_status !== "approved"');
  });

  it("reads only aggregate experiment metrics and excludes test/suppressed leads", () => {
    const view = source("app/lib/persistence/neonExperimentCommandView.ts");
    expect(view).toContain("GROUP BY e.experiment_id, e.variant_key");
    expect(view).toContain("l.is_test = false");
    expect(view).toContain("l.communication_suppressed = false");
    expect(view).not.toMatch(/SELECT[^;]*(email|phone|address_raw|question_raw)/i);
  });
});
