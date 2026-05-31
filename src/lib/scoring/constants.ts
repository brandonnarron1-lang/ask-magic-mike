export const SCORER_VERSION = "1.0.0";

export const SLA_ACCEPT_MS = parseInt(
  process.env.SLA_ACCEPT_MS ?? "120000",
  10
);
export const SLA_CONTACT_MS = parseInt(
  process.env.SLA_CONTACT_MS ?? "300000",
  10
);

export interface FactorDef {
  key: string;
  points: number;
  reason: string;
}

export const SELLER_FACTORS = {
  INTENT_SELL: {
    key: "intent_sell",
    points: 30,
    reason: "Explicit sell intent",
  },
  INTENT_BOTH: {
    key: "intent_both_seller",
    points: 15,
    reason: "Buy+sell intent (seller component)",
  },
  CTA_HOME_WORTH: {
    key: "cta_home_worth",
    points: 20,
    reason: "Clicked \"What's my home worth?\"",
  },
  CTA_SELL_NOW: {
    key: "cta_sell_now",
    points: 25,
    reason: "Clicked \"Should I sell now?\"",
  },
  TIMELINE_ASAP: {
    key: "timeline_asap",
    points: 20,
    reason: "Timeline: ASAP (0 months)",
  },
  TIMELINE_3MO: {
    key: "timeline_3mo",
    points: 15,
    reason: "Timeline: 3 months",
  },
  TIMELINE_6MO: {
    key: "timeline_6mo",
    points: 10,
    reason: "Timeline: 6 months",
  },
  HAS_ADDRESS: {
    key: "has_address",
    points: 5,
    reason: "Provided property address",
  },
} as const satisfies Record<string, FactorDef>;

export const BUYER_FACTORS = {
  INTENT_BUY: {
    key: "intent_buy",
    points: 30,
    reason: "Explicit buy intent",
  },
  INTENT_BOTH: {
    key: "intent_both_buyer",
    points: 15,
    reason: "Buy+sell intent (buyer component)",
  },
  CTA_TOUR_HOME: {
    key: "cta_tour_home",
    points: 20,
    reason: "Clicked \"Can I tour a home?\"",
  },
  CTA_AFFORD: {
    key: "cta_afford",
    points: 20,
    reason: "Clicked \"What can I afford?\"",
  },
  TIMELINE_ASAP: {
    key: "buyer_timeline_asap",
    points: 20,
    reason: "Timeline: ASAP (0 months)",
  },
  TIMELINE_3MO: {
    key: "buyer_timeline_3mo",
    points: 15,
    reason: "Timeline: 3 months",
  },
  TIMELINE_6MO: {
    key: "buyer_timeline_6mo",
    points: 10,
    reason: "Timeline: 6 months",
  },
} as const satisfies Record<string, FactorDef>;

export const SHARED_FACTORS = {
  HAS_PHONE: {
    key: "has_phone",
    points: 10,
    reason: "Provided phone number",
  },
  HAS_EMAIL: {
    key: "has_email",
    points: 5,
    reason: "Provided email address",
  },
  HAS_NAME: {
    key: "has_name",
    points: 5,
    reason: "Provided name",
  },
  CONSENT_SMS: {
    key: "consent_sms",
    points: 5,
    reason: "SMS consent granted",
  },
  CONSENT_CALL: {
    key: "consent_call",
    points: 10,
    reason: "Call consent granted",
  },
  CTA_TALK_MIKE: {
    key: "cta_talk_mike",
    points: 15,
    reason: "Clicked \"Talk to Mike\"",
  },
  PAID_TRAFFIC: {
    key: "paid_traffic",
    points: 5,
    reason: "Arrived from paid source",
  },
} as const satisfies Record<string, FactorDef>;

export const TEMPERATURE_THRESHOLDS = {
  urgent: 80,
  hot: 65,
  warm: 40,
  nurture: 20,
} as const;

export const URGENT_TIMELINE_MAX_MONTHS = 3;
