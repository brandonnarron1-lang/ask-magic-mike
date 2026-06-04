// ─── Attribution & Session ────────────────────────────────────────────────────

export type DeviceType = "mobile" | "tablet" | "desktop";
export type ReferrerType =
  | "organic"
  | "paid"
  | "social"
  | "direct"
  | "email"
  | "referral";
export type SessionStatus = "active" | "completed" | "abandoned" | "expired";

export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrerUrl: string | null;
  referrerType: ReferrerType;
  landingPage: string;
}

export interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrerUrl: string | null;
  referrerType: ReferrerType | null;
  landingPage: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  deviceType: DeviceType | null;
  status: SessionStatus;
  stepReached: number;
  initialQuestion: string | null;
  initialAddress: string | null;
}

// ─── Lead ─────────────────────────────────────────────────────────────────────

export type PrimaryIntent = "sell" | "buy" | "both" | "unknown";
export type TimelineMonths = 0 | 3 | 6 | 12 | 24;
export type LeadStatus =
  | "new"
  | "scored"
  | "assigned"
  | "contacted"
  | "nurture"
  | "dead"
  | "converted";
export type ConsentLanguageVersion = "v1";

export type CTAChip =
  | "home_worth"
  | "should_sell_now"
  | "tour_home"
  | "what_can_afford"
  | "talk_to_mike";

export interface Lead {
  id: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  addressRaw: string | null;
  primaryIntent: PrimaryIntent;
  questionRaw: string | null;
  timelineMonths: TimelineMonths | null;
  consentSms: boolean;
  consentCall: boolean;
  consentEmail: boolean;
  consentTimestamp: Date | null;
  consentIp: string | null;
  consentLanguageVersion: ConsentLanguageVersion;
  status: LeadStatus;
  crmContactId: string | null;
  crmLeadId: string | null;
  crmSyncedAt: Date | null;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export type Temperature = "urgent" | "hot" | "warm" | "nurture" | "low";

export interface ScoreFactor {
  key: string;
  category: "seller" | "buyer" | "shared";
  points: number;
  reason: string;
}

export interface LeadScore {
  id?: string;
  leadId: string;
  scoredAt: Date;
  sellerCertaintyScore: number;
  buyerCertaintyScore: number;
  compositeScore: number;
  temperature: Temperature;
  factorLog: ScoreFactor[];
  scorerVersion: string;
}

export interface ScoringInput {
  primaryIntent: PrimaryIntent;
  timelineMonths: TimelineMonths | null;
  questionRaw: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
  hasName: boolean;
  consentSms: boolean;
  consentCall: boolean;
  consentEmail: boolean;
  ctaChipUsed: CTAChip | null;
  utmSource: string | null;
  utmMedium: string | null;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export type AgentRole = "primary" | "backup" | "admin";

export interface AgentAvailability {
  mon?: [number, number];
  tue?: [number, number];
  wed?: [number, number];
  thu?: [number, number];
  fri?: [number, number];
  sat?: [number, number];
  sun?: [number, number];
}

export interface Agent {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  phone: string | null;
  role: AgentRole;
  isActive: boolean;
  maxDailyLeads: number;
  currentLoad: number;
  priorityScore: number;
  availability: AgentAvailability;
  timezone: string;
  notificationEmail: boolean;
  notificationSms: boolean;
  notificationPhone: string | null;
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export type RoutingStatus =
  | "pending"
  | "accepted"
  | "contacted"
  | "reassigned"
  | "escalated";

export interface LeadRouting {
  id: string;
  leadId: string;
  agentId: string;
  assignedAt: Date;
  assignmentReason: string;
  agentPriorityScore: number;
  acceptDeadline: Date;
  contactDeadline: Date;
  acceptedAt: Date | null;
  contactedAt: Date | null;
  status: RoutingStatus;
  escalatedAt: Date | null;
  escalationReason: string | null;
  reassignedTo: string | null;
  notes: string | null;
}

export interface RoutingDecision {
  agentId: string;
  agentName: string;
  agentEmail: string;
  agentPriorityScore: number;
  assignmentReason: string;
  acceptDeadlineMs: number;
  contactDeadlineMs: number;
}

// ─── Property & Valuation ─────────────────────────────────────────────────────

export type PropertyType =
  | "single_family"
  | "condo"
  | "townhouse"
  | "multi_family"
  | "land"
  | "commercial"
  | "other";

export interface Property {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  fipsCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeSource: string | null;
  geocodedAt: Date | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft: number | null;
  yearBuilt: number | null;
  propertyType: PropertyType | null;
  parcelId: string | null;
  lastSalePrice: number | null;
  lastSaleDate: Date | null;
  estimatedValue: number | null;
  estimatedAt: Date | null;
  leadId: string | null;
}

export interface ValuationComp {
  address: string;
  salePrice: number;
  saleDate: string;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  distanceMiles: number;
}

export interface ValuationReport {
  id: string;
  createdAt: Date;
  propertyId: string;
  leadId: string | null;
  estimateLow: number;
  estimateMid: number;
  estimateHigh: number;
  confidencePct: number | null;
  provider: string;
  providerReportId: string | null;
  providerRaw: Record<string, unknown> | null;
  comps: ValuationComp[];
  disclaimerVersion: string;
  disclaimerText: string;
  expiresAt: Date;
  isConsumerFacing: boolean;
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export interface CRMContact {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  tags: string[];
  customFields?: Record<string, string>;
}

export interface CRMContactResult {
  contactId: string;
  created: boolean;
}

export interface CRMLead {
  contactId: string;
  address: string | null;
  intent: PrimaryIntent;
  temperature: Temperature;
  sellerScore: number;
  buyerScore: number;
  notes: string;
}

export interface CRMTask {
  contactId: string;
  assigneeId: string | null;
  subject: string;
  dueAt: Date;
  body: string;
}

export interface CRMNote {
  contactId: string;
  body: string;
  occurredAt: Date;
}

export interface CRMTranscript {
  contactId: string;
  filename: string;
  content: string;
  occurredAt: Date;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsEventCategory =
  | "session"
  | "intake"
  | "scoring"
  | "routing"
  | "valuation"
  | "crm"
  | "admin"
  | "system";

export type AnalyticsEventName =
  | "session_created"
  | "landing_page_viewed"
  | "cta_chip_clicked"
  | "question_submitted"
  | "address_entered"
  | "intake_step_completed"
  | "contact_info_submitted"
  | "consent_granted"
  | "consent_declined"
  | "intake_completed"
  | "intake_abandoned"
  | "lead_scored"
  | "lead_assigned"
  | "agent_notified"
  | "agent_accepted"
  | "agent_contacted"
  | "sla_accept_breached"
  | "sla_contact_breached"
  | "lead_escalated"
  | "valuation_requested"
  | "valuation_delivered"
  | "crm_sync_success"
  | "crm_sync_error"
  // Canonical platform additions (migration 00012 + LeadCaptureEngine):
  | "lead_created"
  | "duplicate_detected"
  | "spam_flagged"
  | "rate_limited"
  | "listing_imported"
  | "listing_viewed"
  | "listing_matched"
  | "marketing_asset_generated"
  | "sms_sent"
  | "sms_received"
  | "sms_delivered"
  | "sms_failed"
  | "email_sent"
  | "email_received"
  | "email_opened"
  | "email_clicked";

export interface AnalyticsEvent {
  id: string;
  occurredAt: Date;
  sessionId: string | null;
  leadId: string | null;
  agentId: string | null;
  eventName: AnalyticsEventName;
  eventCategory: AnalyticsEventCategory;
  properties: Record<string, unknown>;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface TrackEventParams {
  eventName: AnalyticsEventName;
  sessionId?: string;
  leadId?: string;
  agentId?: string;
  properties?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ipAddress?: string;
  userAgent?: string;
}
