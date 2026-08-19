import { assignExperimentVariant, type WeightedVariant } from "./experiment-engine";

export type PublicExperimentVariant = WeightedVariant & {
  label: string;
  headline: string;
  description: string;
};

export type PublicExperimentDefinition = {
  key: string;
  name: string;
  surface: string;
  hypothesis: string;
  primaryMetric: "qualified_appointment_rate";
  diagnosticMetric: "durable_lead_rate";
  minimumSampleSize: number;
  minimumRelativeUpliftPercent: number;
  owner: string;
  variants: readonly PublicExperimentVariant[];
  guardrails: readonly string[];
  activationControls: readonly string[];
};

export type PublicExperimentContext = {
  experimentKey: string;
  subjectKey: string;
  variantKey: string;
};

export const HOME_VALUE_TRUST_EXPERIMENT: PublicExperimentDefinition = {
  key: "home_value_trust_promise_v1",
  name: "Home value trust promise",
  surface: "/home-value",
  hypothesis:
    "A more explicit broker-review promise will improve qualified appointment rate without weakening completion quality, accessibility, performance, or consumer trust.",
  primaryMetric: "qualified_appointment_rate",
  diagnosticMetric: "durable_lead_rate",
  minimumSampleSize: 100,
  minimumRelativeUpliftPercent: 10,
  owner: "Mike Eatmon / Our Town Properties",
  variants: [
    {
      key: "control",
      label: "Current trust promise",
      weight: 50,
      headline: "Start with the address. Get a practical local follow-up.",
      description:
        "This is a real intake, not an instant automated promise. Mike can review the property context and point you toward useful next steps.",
    },
    {
      key: "broker_review",
      label: "Broker-review promise",
      weight: 50,
      headline: "Start with the address. Get a broker-reviewed local next step.",
      description:
        "Share the property context and timing. Mike or the approved Our Town Properties team can review what you provided and follow up with practical options.",
    },
  ],
  guardrails: [
    "No decline in contactable or qualified-lead rate",
    "No increase in spam, test contamination, complaints, or suppression",
    "No accessibility or keyboard-flow regression",
    "No material mobile layout shift or performance regression",
    "No automated valuation, offer, availability, or response-time claim",
  ],
  activationControls: [
    "PUBLIC_EXPERIMENTS_ENABLED=true in the approved Production environment",
    "Canonical growth_experiments row is approval_status=approved and status=running",
    "Registry variants exactly match the reviewed code definition",
  ],
};

const PUBLIC_EXPERIMENTS = new Map([
  [HOME_VALUE_TRUST_EXPERIMENT.key, HOME_VALUE_TRUST_EXPERIMENT],
]);

export function getPublicExperimentDefinition(key: string) {
  return PUBLIC_EXPERIMENTS.get(key) ?? null;
}

export function validateExperimentDefinition(definition: PublicExperimentDefinition) {
  const reasons: string[] = [];
  const keys = new Set<string>();
  let totalWeight = 0;
  for (const variant of definition.variants) {
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(variant.key)) reasons.push(`Invalid variant key: ${variant.key}`);
    if (keys.has(variant.key)) reasons.push(`Duplicate variant key: ${variant.key}`);
    keys.add(variant.key);
    if (!Number.isFinite(variant.weight) || variant.weight <= 0) reasons.push(`Invalid weight for ${variant.key}`);
    totalWeight += variant.weight;
    if (!variant.headline.trim() || !variant.description.trim()) reasons.push(`Missing visible copy for ${variant.key}`);
  }
  if (!/^[a-z][a-z0-9_]{2,80}$/.test(definition.key)) reasons.push("Experiment key is invalid");
  if (definition.variants.length < 2) reasons.push("At least two variants are required");
  if (Math.abs(totalWeight - 100) > 0.001) reasons.push("Variant weights must total 100");
  if (definition.minimumSampleSize < 50) reasons.push("Minimum sample is below the operating floor");
  if (definition.guardrails.length < 3) reasons.push("At least three guardrails are required");
  if (definition.activationControls.length < 3) reasons.push("Three-layer activation is required");
  return { valid: reasons.length === 0, reasons, totalWeight };
}

export function simulateExperimentAllocation(
  definition: PublicExperimentDefinition,
  sampleSize = 1_000,
) {
  const counts = Object.fromEntries(definition.variants.map((variant) => [variant.key, 0])) as Record<string, number>;
  for (let index = 0; index < sampleSize; index += 1) {
    const variant = assignExperimentVariant(
      definition.key,
      `synthetic-preview-${index}`,
      [...definition.variants],
    );
    counts[variant] = (counts[variant] ?? 0) + 1;
  }
  return { sampleSize, counts };
}
