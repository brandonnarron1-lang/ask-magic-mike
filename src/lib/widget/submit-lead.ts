"use client";

/**
 * Widget → canonical /api/leads submitter.
 *
 * Pulls stored attribution from sessionStorage, builds a clean payload
 * matching `CreateLeadCanonicalSchema`, posts, and returns the public
 * response. Designed for the existing MagicMikeWidgetShell + the future
 * embeddable widget script.
 */
import { readAttribution } from "@/lib/attribution/client-storage";
import type { LeadType } from "@/lib/leads/lead-types";

export interface WidgetSubmitInput {
  leadType: LeadType;
  intent?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  propertyAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  timeline?:
    | "asap"
    | "0_30_days"
    | "31_90_days"
    | "3_6_months"
    | "6_plus_months"
    | "unknown";
  listingId?: string;
  preferredContactMethod?: "sms" | "call" | "email" | "any";
  consent?: { sms?: boolean; email?: boolean; call?: boolean; language?: string };
  notes?: string;
  formStartedAtMs?: number;
}

export interface WidgetSubmitResult {
  ok: boolean;
  leadId?: string;
  isDuplicate?: boolean;
  nextStep?: string;
  error?: string;
}

export async function submitWidgetLead(
  input: WidgetSubmitInput
): Promise<WidgetSubmitResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "must_run_in_browser" };
  }

  const attribution = readAttribution();

  const payload: Record<string, unknown> = {
    lead_type: input.leadType,
    source: "widget",
    source_detail: "magic_mike_widget",
    first_name: input.firstName ?? null,
    last_name: input.lastName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    property_address: input.propertyAddress ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    zip: input.zip ?? null,
    listing_id: input.listingId ?? null,
    intent: input.intent ?? null,
    timeline: input.timeline ?? null,
    preferred_contact_method: input.preferredContactMethod ?? null,
    notes: input.notes ?? null,
    page_url: window.location.href,
    widget_session_id: sessionStorageGetOrSet(
      "amm_widget_session_id",
      () => crypto.randomUUID()
    ),
    utm_source: attribution?.utmSource ?? null,
    utm_medium: attribution?.utmMedium ?? null,
    utm_campaign: attribution?.utmCampaign ?? null,
    utm_term: attribution?.utmTerm ?? null,
    utm_content: attribution?.utmContent ?? null,
    referrer: attribution?.referrerUrl ?? document.referrer ?? null,
    landing_page: attribution?.landingPath ?? null,
    consent: input.consent
      ? {
          ...input.consent,
          language:
            input.consent.language ??
            "By submitting, I agree to be contacted by Our Town Properties / Ask Magic Mike about my real estate inquiry. Message/data rates may apply. Reply STOP to opt out.",
        }
      : undefined,
    form_started_at_ms: input.formStartedAtMs ?? null,
  };

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      lead_id?: string;
      is_duplicate?: boolean;
      next_step?: string;
      error?: string;
    };
    if (!data.ok) {
      return { ok: false, error: data.error ?? `http_${res.status}` };
    }
    return {
      ok: true,
      leadId: data.lead_id,
      isDuplicate: data.is_duplicate,
      nextStep: data.next_step,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}

function sessionStorageGetOrSet(
  key: string,
  factory: () => string
): string {
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const fresh = factory();
    window.sessionStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return factory();
  }
}
