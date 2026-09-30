import type { VerifiedPublicExperimentLeadContext } from "./experiment-registry";
import {
  recordPublicExperimentEvent,
  type PublicExperimentEventResult,
} from "../persistence/neonPublicExperimentRepository";

export type LeadExperimentConversionOutcome =
  | { attempted: false; reason: "no_context" | "test_lead" }
  | { attempted: true; result: PublicExperimentEventResult };

/**
 * Convert a browser exposure only after the canonical lead transaction has
 * returned its durable lead ID. Test leads and context-free leads remain
 * outside the public experiment ledger.
 */
export async function recordLeadExperimentConversion(input: {
  context: VerifiedPublicExperimentLeadContext | null;
  leadId: string;
  isTest: boolean;
}): Promise<LeadExperimentConversionOutcome> {
  if (!input.context) return { attempted: false, reason: "no_context" };
  if (input.isTest) return { attempted: false, reason: "test_lead" };

  return {
    attempted: true,
    result: await recordPublicExperimentEvent({
      experimentKey: input.context.experimentKey,
      subjectKey: input.context.subjectKey,
      variantKey: input.context.variantKey,
      surface: input.context.surface,
      eventName: "lead_created",
      leadId: input.leadId,
    }),
  };
}
