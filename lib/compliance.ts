const blockedPatterns = [
  /what should i offer/i,
  /what is this home worth/i,
  /write an offer/i,
  /negotiat(e|ion)/i,
  /should i waive/i,
  /explain agency/i,
  /legal advice/i,
  /contract terms/i,
];

export function runComplianceGuardrail(message: string) {
  const matched = blockedPatterns.find((pattern) => pattern.test(message));
  if (!matched) {
    return { blocked: false, reason: null };
  }

  return {
    blocked: true,
    reason:
      "This request appears transaction-specific or legal in nature. Ask B-Nelly can only provide general educational info and will route you to a licensed broker.",
  };
}

export const complianceFooterCopy =
  "Ask B-Nelly is a software platform for general real estate education, lead intake, and routing. It is not a real estate brokerage and does not provide legal advice, valuation, negotiation strategy, agency explanation, or transaction-specific guidance.";
