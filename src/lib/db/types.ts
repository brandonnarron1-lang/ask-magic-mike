import type { Temperature } from "@/types/domain.types";

export interface DbSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  status: "active" | "completed" | "abandoned" | "expired";
  stepReached: number;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerType: string | null;
  landingPage: string | null;
  deviceType: string | null;
  initialQuestion: string | null;
  initialAddress: string | null;
}

export interface DbContact {
  id: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  crmContactId: string | null;
}

export interface DbLead {
  id: string;
  sessionId: string;
  contactId: string | null;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  addressRaw: string | null;
  primaryIntent: string;
  questionRaw: string | null;
  timelineMonths: number | null;
  consentSms: boolean;
  consentCall: boolean;
  consentEmail: boolean;
  consentTimestamp: string | null;
  ctaChipUsed: string | null;
  status: string;
  crmContactId: string | null;
  crmSyncedAt: string | null;
}

export interface DbLeadScore {
  id: string;
  leadId: string;
  sellerCertaintyScore: number;
  buyerCertaintyScore: number;
  compositeScore: number;
  temperature: Temperature;
  factorLog: FactorLogEntry[];
  scorerVersion: string;
}

export interface FactorLogEntry {
  key: string;
  points: number;
  label: string;
  side: "seller" | "buyer" | "shared";
}

export interface AdminLeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  intent: string;
  question: string | null;
  addressRaw: string | null;
  temperature: Temperature;
  sellerScore: number;
  buyerScore: number;
  compositeScore: number;
  factorLog: FactorLogEntry[];
  agentName: string;
  status: string;
  createdAt: string;
  slaBreached: boolean;
  utmSource: string | null;
  utmCampaign: string | null;
  consentSms: boolean;
  consentCall: boolean;
  consentEmail: boolean;
}

/** True when Supabase credentials are present — use this to gate DB calls */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** @deprecated use isSupabaseConfigured() — kept for call-sites that pre-date the rename */
export function isDev(): boolean {
  return !isSupabaseConfigured();
}

/** Throws in production if Supabase is not configured (call on write paths) */
export function requireSupabase(): void {
  if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
    throw new Error(
      "Supabase is required in production. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}
