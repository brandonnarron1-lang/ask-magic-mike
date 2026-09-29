import { describe, expect, it } from "vitest";
import { assignExperimentVariant } from "../../app/lib/growth/experiment-engine";
import {
  HOME_VALUE_TRUST_EXPERIMENT,
  publicExperimentLeadFields,
  resolvePublicExperimentLeadContext,
} from "../../app/lib/growth/experiment-registry";

const SUBJECT_KEY = "b".repeat(64);
const VARIANT_KEY = assignExperimentVariant(
  HOME_VALUE_TRUST_EXPERIMENT.key,
  SUBJECT_KEY,
  [...HOME_VALUE_TRUST_EXPERIMENT.variants],
);
const OTHER_VARIANT = VARIANT_KEY === "control" ? "broker_review" : "control";

function validContext() {
  return {
    experimentKey: HOME_VALUE_TRUST_EXPERIMENT.key,
    subjectKey: SUBJECT_KEY,
    variantKey: VARIANT_KEY,
  };
}

function validLeadFields() {
  return {
    funnel_type: "home_value",
    lead_source_surface: "home_value_page",
    experiment_key: HOME_VALUE_TRUST_EXPERIMENT.key,
    experiment_subject_key: SUBJECT_KEY,
    experiment_variant_key: VARIANT_KEY,
    experiment_surface: HOME_VALUE_TRUST_EXPERIMENT.surface,
  };
}

describe("public experiment lead context", () => {
  it("serializes only a known deterministic non-PII context", () => {
    expect(publicExperimentLeadFields(validContext())).toEqual({
      experiment_key: HOME_VALUE_TRUST_EXPERIMENT.key,
      experiment_subject_key: SUBJECT_KEY,
      experiment_variant_key: VARIANT_KEY,
      experiment_surface: HOME_VALUE_TRUST_EXPERIMENT.surface,
    });
  });

  it.each([
    null,
    { ...validContext(), subjectKey: "invalid" },
    { ...validContext(), variantKey: OTHER_VARIANT },
    { ...validContext(), experimentKey: "unknown_experiment_v1" },
  ])("does not serialize absent, malformed, substituted, or unknown context %#", (context) => {
    expect(publicExperimentLeadFields(context)).toBeNull();
  });

  it("allows a lead when no public experiment context is present", () => {
    expect(resolvePublicExperimentLeadContext({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
    })).toEqual({ ok: true, context: null });
  });

  it("revalidates the exact experiment, subject, variant, and surface", () => {
    expect(resolvePublicExperimentLeadContext(validLeadFields())).toEqual({
      ok: true,
      context: {
        ...validContext(),
        surface: HOME_VALUE_TRUST_EXPERIMENT.surface,
      },
    });
  });

  it.each([
    { ...validLeadFields(), experiment_variant_key: OTHER_VARIANT },
    { ...validLeadFields(), experiment_subject_key: "invalid" },
    { ...validLeadFields(), experiment_key: "unknown_experiment_v1" },
    { ...validLeadFields(), experiment_surface: "/ask" },
    { ...validLeadFields(), lead_source_surface: "seller_page" },
    { ...validLeadFields(), funnel_type: "widget" },
    { ...validLeadFields(), experiment_variant_key: undefined },
  ])("rejects partial, substituted, unknown, or cross-surface lead context %#", (input) => {
    expect(resolvePublicExperimentLeadContext(input)).toEqual({
      ok: false,
      code: "invalid_experiment_context",
    });
  });
});
