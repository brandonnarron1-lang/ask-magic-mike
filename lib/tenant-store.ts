import { AIRun, ContactEvent, Conversation, RoutingLog, Tenant } from "./types";

const now = new Date().toISOString();

const tenants: Tenant[] = [
  {
    id: "tnt_ask_magic_mike",
    slug: "ask-magic-mike",
    status: "active",
    companyName: "Ask Magic Mike",
    marketAreas: ["Charlotte, NC", "Lake Norman, NC"],
    promptInstructions:
      "You are a broker-branded educational assistant. Offer general real-estate education only. Never provide valuation, negotiation strategy, legal advice, agency explanation, or transaction-specific recommendations.",
    brand: {
      primaryColor: "#0f172a",
      accentColor: "#f97316",
      assistantName: "Magic Mike Assistant",
      brokerName: "Brandon Nelly",
      brokerLicense: "NC-000000",
      disclaimer:
        "Ask B-Nelly is software for educational information and lead routing. It is not a brokerage and does not provide transaction-specific advice.",
      buyerAgreementUrl: "https://example.com/buyer-agreement",
    },
    routing: {
      destinationEmail: "broker@askmagicmike.example",
      webhookUrl: "https://example-crm.local/webhooks/lead",
      webhookSecret: "demo-secret",
    },
    stripeCustomerId: "cus_demo_123",
    stripeSubscriptionId: "sub_demo_123",
    createdAt: now,
  },
];

const conversations: Conversation[] = [];
const contactEvents: ContactEvent[] = [];
const routingLogs: RoutingLog[] = [];
const aiRuns: AIRun[] = [];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function listTenants() {
  return tenants;
}

export async function getTenantBySlug(slug: string) {
  return tenants.find((tenant) => tenant.slug === slug) ?? null;
}

export async function upsertTenant(input: Tenant) {
  const existing = tenants.findIndex((tenant) => tenant.slug === input.slug);
  if (existing === -1) {
    tenants.push(input);
    return input;
  }
  tenants[existing] = input;
  return input;
}

export async function saveConversation(input: Omit<Conversation, "id" | "createdAt">) {
  const row: Conversation = {
    ...input,
    id: uid("conv"),
    createdAt: new Date().toISOString(),
  };
  conversations.unshift(row);
  return row;
}

export async function listConversationsByTenant(tenantSlug: string) {
  return conversations.filter((conversation) => conversation.tenantSlug === tenantSlug);
}

export async function saveContactEvent(input: Omit<ContactEvent, "id" | "routingStatus">) {
  const row: ContactEvent = {
    ...input,
    id: uid("contact"),
    routingStatus: "queued",
  };
  contactEvents.unshift(row);
  return row;
}

export async function listContactEventsByTenant(tenantSlug: string) {
  return contactEvents.filter((event) => event.tenantSlug === tenantSlug);
}

export async function updateContactRoutingStatus(contactEventId: string, status: ContactEvent["routingStatus"]) {
  const found = contactEvents.find((event) => event.id === contactEventId);
  if (found) found.routingStatus = status;
}

export async function saveRoutingLog(input: Omit<RoutingLog, "id" | "createdAt">) {
  const row: RoutingLog = {
    ...input,
    id: uid("route"),
    createdAt: new Date().toISOString(),
  };
  routingLogs.unshift(row);
  return row;
}

export async function listRoutingLogsByTenant(tenantSlug: string) {
  return routingLogs.filter((log) => log.tenantSlug === tenantSlug);
}

export async function saveAIRun(input: Omit<AIRun, "id" | "createdAt">) {
  const row: AIRun = {
    ...input,
    id: uid("ai"),
    createdAt: new Date().toISOString(),
  };
  aiRuns.unshift(row);
  return row;
}

export async function listAIRunsByTenant(tenantSlug: string) {
  return aiRuns.filter((run) => run.tenantSlug === tenantSlug);
}

export async function getUsageForTenant(tenantSlug: string) {
  const usageEvents = contactEvents.filter((event) => event.tenantSlug === tenantSlug);
  return {
    billableContactEvents: usageEvents.length,
    basis: "Software usage metering based on contact events. No referral or closing-based fees.",
  };
}
