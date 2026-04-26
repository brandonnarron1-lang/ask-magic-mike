import { getUsageForTenant } from "./tenant-store";

export async function createStripeCheckoutSession(params: {
  tenantSlug: string;
  successUrl: string;
  cancelUrl: string;
}) {
  // Replace with Stripe SDK in production; this placeholder documents pricing model.
  return {
    id: `cs_demo_${params.tenantSlug}`,
    url: `${params.successUrl}?checkout=demo`,
    pricing: {
      setupFee: 49900,
      monthlySubscription: 19900,
      usageEventUnit: 250,
      usageBasis: "billable_contact_event",
      disallowed: ["per-closing", "per-appointment", "buyer-agreement-triggered"],
    },
  };
}

export async function getBillingSnapshot(tenantSlug: string) {
  const usage = await getUsageForTenant(tenantSlug);
  return {
    tenantSlug,
    setupFee: "$499 one-time",
    subscription: "$199/month",
    usageRate: "$2.50 per billable contact event",
    usage,
    complianceNote:
      "Usage billing is software metering only. No referral fees, no closing-based fees, and no appointment-triggered billing.",
  };
}
