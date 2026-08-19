export interface WeightedVariant {
  key: string;
  weight: number;
}

export interface ExperimentVariantResult {
  key: string;
  exposures: number;
  conversions: number;
  guardrailBreaches?: number;
}

export interface ExperimentDecision {
  status: "continue" | "promote" | "stop" | "inconclusive";
  winner: string | null;
  rationale: string;
  sampleReady: boolean;
  upliftPercent: number | null;
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function assignExperimentVariant(
  experimentKey: string,
  subjectKey: string,
  variants: WeightedVariant[],
) {
  const valid = variants.filter((variant) => variant.key.trim() && variant.weight > 0);
  if (valid.length < 2) throw new Error("At least two positively weighted variants are required");
  const totalWeight = valid.reduce((sum, variant) => sum + variant.weight, 0);
  const bucket = fnv1a(`${experimentKey}:${subjectKey}`) / 0xffffffff * totalWeight;
  let cursor = 0;
  for (const variant of valid) {
    cursor += variant.weight;
    if (bucket <= cursor) return variant.key;
  }
  return valid[valid.length - 1].key;
}

export function evaluateExperiment(input: {
  variants: ExperimentVariantResult[];
  minimumSampleSize: number;
  minimumRelativeUpliftPercent?: number;
}): ExperimentDecision {
  const variants = input.variants.filter((variant) => variant.exposures >= 0 && variant.conversions >= 0);
  if (variants.length < 2) {
    return {
      status: "inconclusive",
      winner: null,
      rationale: "At least two valid variants are required.",
      sampleReady: false,
      upliftPercent: null,
    };
  }
  if (variants.some((variant) => (variant.guardrailBreaches ?? 0) > 0)) {
    return {
      status: "stop",
      winner: null,
      rationale: "A declared guardrail was breached; operator review is required before any restart.",
      sampleReady: false,
      upliftPercent: null,
    };
  }
  const sampleReady = variants.every((variant) => variant.exposures >= input.minimumSampleSize);
  if (!sampleReady) {
    return {
      status: "continue",
      winner: null,
      rationale: "Minimum sample has not been reached for every variant.",
      sampleReady: false,
      upliftPercent: null,
    };
  }
  const ranked = [...variants].sort((a, b) =>
    (safeDivide(b.conversions, b.exposures) ?? 0) - (safeDivide(a.conversions, a.exposures) ?? 0),
  );
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const winnerRate = safeDivide(winner.conversions, winner.exposures) ?? 0;
  const runnerUpRate = safeDivide(runnerUp.conversions, runnerUp.exposures) ?? 0;
  const uplift = runnerUpRate > 0 ? (winnerRate - runnerUpRate) / runnerUpRate * 100 : null;
  const threshold = input.minimumRelativeUpliftPercent ?? 10;
  if (uplift == null || uplift < threshold) {
    return {
      status: "inconclusive",
      winner: null,
      rationale: "The observed difference is below the configured practical-uplift threshold. This is not a statistical-significance claim.",
      sampleReady: true,
      upliftPercent: uplift == null ? null : round(uplift, 1),
    };
  }
  return {
    status: "promote",
    winner: winner.key,
    rationale: `Variant ${winner.key} cleared the minimum sample and practical-uplift threshold. Human approval is still required before rollout.`,
    sampleReady: true,
    upliftPercent: round(uplift, 1),
  };
}
