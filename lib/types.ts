export type TenantBrandConfig = {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  assistantName: string;
  brokerName: string;
  brokerLicense?: string;
  disclaimer: string;
  buyerAgreementUrl?: string;
};

export type TenantRoutingConfig = {
  destinationEmail: string;
  webhookUrl?: string;
  webhookSecret?: string;
};

export type Tenant = {
  id: string;
  slug: string;
  status: "trial" | "active" | "past_due";
  companyName: string;
  marketAreas: string[];
  promptInstructions: string;
  brand: TenantBrandConfig;
  routing: TenantRoutingConfig;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
};

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Conversation = {
  id: string;
  tenantSlug: string;
  visitorSessionId: string;
  messages: Message[];
  safetyFlags: string[];
  createdAt: string;
};

export type ContactEvent = {
  id: string;
  tenantSlug: string;
  name: string;
  email: string;
  phone?: string;
  generalIntent: string;
  marketArea: string;
  message: string;
  consentAt: string;
  routingStatus: "queued" | "delivered" | "failed";
};

export type RoutingLog = {
  id: string;
  contactEventId: string;
  tenantSlug: string;
  channel: "email" | "webhook";
  status: "sent" | "failed";
  responseCode?: number;
  responseBody?: string;
  createdAt: string;
};

export type AIRun = {
  id: string;
  tenantSlug: string;
  conversationId: string;
  prompt: string;
  completion: string;
  provider: string;
  model: string;
  safetyFlags: string[];
  createdAt: string;
};
