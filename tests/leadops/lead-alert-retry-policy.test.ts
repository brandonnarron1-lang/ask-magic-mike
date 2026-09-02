import { describe, expect, it } from "vitest";
import {
  consumerAcknowledgmentPermitted,
  suppressAutomatedTestRetry,
} from "../../app/lib/leadAlertService";
import type { LeadPayload } from "../../app/lib/leadPayload";

function payload(overrides: Partial<LeadPayload> = {}): LeadPayload {
  return {
    funnel_type: "home_value",
    lead_source_surface: "home_value_page",
    email: "consumer@example.test",
    consent_email: true,
    is_test: false,
    attribution: {},
    status: "new",
    assigned_agent_id: null,
    ...overrides,
  };
}

describe("lead-alert retry policy", () => {
  it("permits an acknowledgment only with email consent and no suppression", () => {
    expect(consumerAcknowledgmentPermitted({ payload: payload() })).toBe(true);
    expect(consumerAcknowledgmentPermitted({ payload: payload({ consent_email: false }) })).toBe(false);
    expect(consumerAcknowledgmentPermitted({ payload: payload({ email: undefined }) })).toBe(false);
    expect(consumerAcknowledgmentPermitted({ payload: payload({ is_test: true }) })).toBe(false);
    expect(consumerAcknowledgmentPermitted({ payload: payload(), communicationSuppressed: true })).toBe(false);
    expect(consumerAcknowledgmentPermitted({ payload: payload(), emailSuppressed: true })).toBe(false);
  });

  it("suppresses every automated QA retry while leaving live records eligible", () => {
    expect(suppressAutomatedTestRetry({ payload: payload({ is_test: true }) })).toBe(true);
    expect(suppressAutomatedTestRetry({ payload: payload({ is_test: false }) })).toBe(false);
  });
});
