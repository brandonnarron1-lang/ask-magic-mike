/**
 * Phase 11 — Brokerage Intelligence Brain
 * Shared types consumed by all intelligence engines.
 * Pure data — no side effects, no DB calls, no external APIs.
 */

// ---------------------------------------------------------------------------
// Knowledge Graph — Node Types
// ---------------------------------------------------------------------------

export type NodeType =
  | "lead"
  | "property"
  | "agent"
  | "campaign"
  | "conversation"
  | "task"
  | "appointment"
  | "listing"
  | "offer"
  | "buyer"
  | "seller"
  | "source"
  | "traffic"
  | "question"
  | "recommendation"
  | "workflow"
  | "automation";

export type RelationshipType =
  | "interested_in"
  | "assigned_to"
  | "generated_by"
  | "participated_in"
  | "asked_about"
  | "listed_by"
  | "owned_by"
  | "managed_by"
  | "converted_by"
  | "triggered"
  | "recommended"
  | "approved_by"
  | "executed_by"
  | "influences"
  | "preceded_by"
  | "followed_by";

export interface GraphNode {
  id:          string;
  type:        NodeType;
  label:       string;
  attributes:  Record<string, string | number | boolean | null>;
  confidence:  number;   // 0–100
  status:      "active" | "inactive" | "archived";
  createdAt:   string;
  updatedAt:   string;
}

export interface GraphEdge {
  id:           string;
  fromId:       string;
  toId:         string;
  fromType:     NodeType;
  toType:       NodeType;
  relationship: RelationshipType;
  strength:     number;   // 0–100
  direction:    "unidirectional" | "bidirectional";
  confidence:   number;   // 0–100
  origin:       "system" | "manual" | "inferred";
  createdAt:    string;
  updatedAt:    string;
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  generatedAt: string;
  totalNodeCount: number;
  totalEdgeCount: number;
}

export interface RelationshipSummary {
  nodeId:     string;
  nodeType:   NodeType;
  connected:  Array<{ node: GraphNode; edge: GraphEdge }>;
  totalEdges: number;
  avgStrength: number;
}

// ---------------------------------------------------------------------------
// Memory Engine
// ---------------------------------------------------------------------------

export type MemoryEventType =
  | "first_contact"
  | "lead_created"
  | "score_changed"
  | "status_changed"
  | "appointment_set"
  | "appointment_missed"
  | "property_viewed"
  | "question_asked"
  | "offer_interest"
  | "campaign_exposed"
  | "agent_assigned"
  | "follow_up_completed"
  | "conversion"
  | "dead_lead"
  | "reactivation";

export type MemorySignificance = "critical" | "high" | "medium" | "low";

export interface MemoryRecord {
  id:           string;
  entityId:     string;
  entityType:   NodeType;
  eventType:    MemoryEventType;
  summary:      string;
  context:      Record<string, string | number | boolean | null>;
  significance: MemorySignificance;
  recordedAt:   string;
  expiresAt:    string | null;
  immutable:    true;
}

export interface MemoryConsolidation {
  entityId:       string;
  entityType:     NodeType;
  totalEvents:    number;
  significantEvents: number;
  memoryStrength: number;  // 0–100
  firstSeenAt:    string | null;
  lastSeenAt:     string | null;
  keyMilestones:  MemoryRecord[];
  narrative:      string;
}

// ---------------------------------------------------------------------------
// Intelligence Signals — shared input across all engines
// ---------------------------------------------------------------------------

export interface IntelligenceSignals {
  generatedAt:   string;
  windowDays:    number;   // rolling window (default 7)

  // Lead corpus
  totalLeads:             number;
  newLeadsInWindow:       number;
  hotLeads:               number;
  sellerLeads:            number;
  buyerLeads:             number;
  reactivatedLeads:       number;
  stalledLeads:           number;
  avgLeadScore:           number;   // 0–100

  // Property corpus
  totalProperties:        number;
  valuationRequestsInWindow: number;
  propertyViewsInWindow:  number;
  listingInterestLeads:   number;

  // Agent performance
  activeAgents:           number;
  avgResponseMinutes:     number;
  topAgentConversionRate: number;   // 0–100
  teamAvgConversionRate:  number;   // 0–100
  avgHealthScore:         number;   // 0–100

  // Campaign performance
  activeCampaigns:        number;
  campaignLeadsInWindow:  number;
  topCampaignSource:      string;
  campaignConversionRate: number;   // 0–100

  // Appointment signals
  appointmentsInWindow:         number;
  appointmentAcceptanceRate:    number;   // 0–100
  missedAppointmentsInWindow:   number;
  avgResponseToAcceptMinutes:   number;

  // Conversation intelligence
  avgConversationDepth:     number;   // 1–10
  sellerConversationsInWindow: number;
  buyerConversationsInWindow:  number;
  totalQuestionsAsked:      number;

  // Geographic
  topNeighborhood:          string;
  neighborhoodLeadCounts:   Record<string, number>;

  // Revenue pipeline
  estimatedPipelineValue:   number;   // dollars
  predictedClosings30d:     number;
  avgDaysToClose:           number;

  // Trend signals — percentage change vs prior period (positive = up)
  sellerConversationsTrend: number;
  appointmentTrend:         number;
  leadQualityTrend:         number;
  campaignPerformanceTrend: number;
  conversionRateTrend:      number;

  // SLA
  slaBreachCount:           number;
  slaWarningCount:          number;
  avgSlaComplianceRate:     number;   // 0–100

  // Referral
  referralLeads:            number;
  referralConversionRate:   number;   // 0–100
}

// ---------------------------------------------------------------------------
// Property Intelligence
// ---------------------------------------------------------------------------

export type MarketVelocity = "fast" | "normal" | "slow" | "stalled";
export type ActivityTrend  = "rising" | "stable" | "declining";

export interface PropertyIntelligence {
  propertyId:                    string;
  address:                       string;
  interestScore:                 number;   // 0–100
  sellerProbability:             number;   // 0–100
  buyerDemandScore:              number;   // 0–100
  marketingExposureCount:        number;
  conversationCount:             number;
  valuationRequestCount:         number;
  appointmentRequestCount:       number;
  marketVelocity:                MarketVelocity;
  activityTrend:                 ActivityTrend;
  predictedListingProbability:   number;   // 0–100
  predictedClosingProbability:   number;   // 0–100
  predictedMarketingOpportunity: number;   // 0–100
  confidence:                    number;   // 0–100
  signals:                       string[];
  recommendedActions:            string[];
  lastActivityAt:                string | null;
}

export interface PropertySignals {
  propertyId:              string;
  address:                 string;
  valuationRequests:       number;
  propertyViews:           number;
  conversationCount:       number;
  appointmentRequests:     number;
  marketingExposureCount:  number;
  daysOnMarket:            number | null;
  listingInterestLeads:    number;
  repeatVisitLeads:        number;
  lastActivityAt:          string | null;
}

// ---------------------------------------------------------------------------
// Seller Intelligence
// ---------------------------------------------------------------------------

export type SellerSignal =
  | "valuation_requested"
  | "repeat_visit"
  | "high_return_frequency"
  | "pricing_question"
  | "timeline_discussion"
  | "equity_conversation"
  | "cash_offer_interest"
  | "appointment_requested"
  | "follow_up_engaged"
  | "seller_objection"
  | "deep_conversation";

export type SellerIntentGrade = "A+" | "A" | "B" | "C" | "D";
export type SellerListingWindow = "0-30d" | "30-90d" | "90-180d" | "180d+" | "unknown";
export type OpportunityLevel = "exceptional" | "strong" | "moderate" | "weak";

export interface SellerReadiness {
  leadId:                 string;
  readinessScore:         number;           // 0–100
  intentGrade:            SellerIntentGrade;
  predictedListingWindow: SellerListingWindow;
  confidence:             number;           // 0–100
  risk:                   "low" | "medium" | "high";
  opportunity:            OpportunityLevel;
  signals:                SellerSignal[];
  recommendations:        string[];
  estimatedCommission:    number;           // dollars (based on avg home price)
  reasoning:              string;
}

export interface SellerSignalInput {
  leadId:               string;
  valuationRequests:    number;
  repeatVisits:         number;
  returnFrequency:      number;   // visits per week
  conversationDepth:    number;   // 1–10
  hasPricingQuestion:   boolean;
  hasTimelineDiscussion: boolean;
  hasEquityConversation: boolean;
  hasCashOfferInterest:  boolean;
  hasAppointmentRequest: boolean;
  followUpEngagements:   number;
  hasSellerObjection:    boolean;
  avgPropertyValue:      number;  // for commission estimate
  daysSinceFirstContact: number;
}

// ---------------------------------------------------------------------------
// Buyer Intelligence
// ---------------------------------------------------------------------------

export type BuyerSignal =
  | "financing_question"
  | "location_question"
  | "school_question"
  | "price_range_specified"
  | "saved_properties"
  | "multiple_conversations"
  | "appointment_requested"
  | "repeat_search"
  | "market_timing_question"
  | "urgency_indicated";

export type BuyerTimeHorizon =
  | "immediate"
  | "0-30d"
  | "30-90d"
  | "90-180d"
  | "180d+"
  | "browsing";

export interface BuyerReadiness {
  leadId:              string;
  readinessScore:      number;   // 0–100
  purchaseProbability: number;   // 0–100
  timeHorizon:         BuyerTimeHorizon;
  confidence:          number;   // 0–100
  signals:             BuyerSignal[];
  recommendations:     string[];
  nextBestAction:      string;
  reasoning:           string;
}

export interface BuyerSignalInput {
  leadId:                  string;
  hasFinancingQuestion:    boolean;
  hasLocationQuestion:     boolean;
  hasSchoolQuestion:       boolean;
  hasPriceRange:           boolean;
  savedPropertyCount:      number;
  conversationCount:       number;
  hasAppointmentRequest:   boolean;
  repeatSearchCount:       number;
  hasMarketTimingQuestion: boolean;
  hasUrgencySignal:        boolean;
  daysSinceFirstContact:   number;
}

// ---------------------------------------------------------------------------
// Prediction Engine
// ---------------------------------------------------------------------------

export type PredictionType =
  | "likely_listing"
  | "likely_buyer"
  | "likely_appointment"
  | "likely_closing"
  | "campaign_winner"
  | "campaign_failure"
  | "sla_breach"
  | "stale_lead"
  | "reassignment_candidate"
  | "coaching_opportunity"
  | "referral_opportunity";

export type PredictionUrgency = "critical" | "high" | "medium" | "low";

export interface Prediction {
  id:                  string;
  type:                PredictionType;
  label:               string;
  entityId:            string;
  entityType:          NodeType;
  confidence:          number;   // 0–100
  reasoning:           string;
  historicalSupport:   string;
  expectedTimeframe:   string;
  supportingSignals:   string[];
  recommendedWorkflow: string | null;
  urgency:             PredictionUrgency;
  createdAt:           string;
}

export interface PredictionSignals {
  signals:    IntelligenceSignals;
  timestamp:  string;
}

// ---------------------------------------------------------------------------
// Opportunity Engine
// ---------------------------------------------------------------------------

export type OpportunityCategory =
  | "seller_listing"
  | "buyer_purchase"
  | "campaign_optimization"
  | "agent_coaching"
  | "lead_reactivation"
  | "referral_capture"
  | "market_expansion";

export type EaseLevel = "easy" | "moderate" | "complex";

export interface Opportunity {
  id:                   string;
  category:             OpportunityCategory;
  title:                string;
  description:          string;
  businessValue:        number;   // dollar estimate
  confidence:           number;   // 0–100
  urgency:              PredictionUrgency;
  ease:                 EaseLevel;
  expectedCommission:   number;   // dollars
  expectedAppointments: number;
  expectedListings:     number;
  expectedBuyers:       number;
  estimatedEffortHours: number;
  recommendedActions:   string[];
  supportingData:       Record<string, string | number | boolean>;
  rank:                 number;
  roi:                  number;   // expected ROI ratio (e.g. 12.5 = 12.5x)
}

export interface Risk {
  id:          string;
  category:    string;
  title:       string;
  description: string;
  severity:    PredictionUrgency;
  confidence:  number;   // 0–100
  likelihood:  number;   // 0–100
  mitigation:  string;
}

export interface OpportunitySignals {
  signals: IntelligenceSignals;
}

// ---------------------------------------------------------------------------
// Executive Intelligence
// ---------------------------------------------------------------------------

export type InsightType =
  | "trend_acceleration"
  | "trend_reversal"
  | "neighborhood_surge"
  | "agent_performance"
  | "conversion_shift"
  | "campaign_impact"
  | "lead_quality_change"
  | "sla_pattern"
  | "referral_pattern"
  | "market_velocity";

export interface ExecutiveInsight {
  id:                  string;
  type:                InsightType;
  headline:            string;
  narrative:           string;
  reason:              string;
  supportingMetrics:   Record<string, string | number>;
  confidence:          number;   // 0–100
  expectedImpact:      string;
  recommendedAction:   string;
  estimatedROI:        number | null;   // dollars
  urgency:             PredictionUrgency;
  generatedAt:         string;
}

export interface BriefingPacket {
  generatedAt:    string;
  windowDays:     number;
  insights:       ExecutiveInsight[];
  topInsight:     ExecutiveInsight | null;
  criticalCount:  number;
  highCount:      number;
  overallHealth:  "excellent" | "good" | "fair" | "poor";
  executiveSummary: string;
}

export interface ExecutiveSignals {
  signals: IntelligenceSignals;
  timestamp: string;
}
