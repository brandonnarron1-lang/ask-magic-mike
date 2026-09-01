import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { normalizeLeadPayload, type LeadPayload } from "../../lib/leadPayload";
import { isValidLeadEmail, isValidLeadPhone } from "../../lib/leadContactValidation";
import { PUBLIC_LEAD_SAVE_ERROR } from "../../lib/publicLeadErrors";
import { consentGrantedForCall, consentGrantedForEmail, consentGrantedForSms, LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";
import { scoreLead } from "../../lib/leadScoring";
import { routeLead } from "../../lib/leadRouting";
import { enqueueLeadNotifications } from "../../lib/leadAlertService";
import { recordServerAnalyticsEvent } from "../../lib/serverAnalytics";
import { createFirstLiveLeadMonitor } from "@/lib/operations/first-live-lead-monitor";
import { isApprovedPublicOrigin } from "../../lib/publicOrigin";
import {
  checkRateLimit,
  LIMITS,
  nonDurableRateLimitFallbackAllowed,
  rateLimitKey,
} from "../../../src/lib/security/rate-limit";
import { createDefaultPersistence } from "../../lib/persistence/defaultPersistence";
import type { LeadLifecycleCaptureResult } from "../../lib/persistence/contracts";
import {
  PREVIEW_READ_ONLY_MESSAGE,
  assertDatabaseMutationAllowed,
} from "../../../src/lib/preview-security";
import { verifyWordPressBridgeRequest } from "../../lib/wordpressBridgeSignature";

const LEAD_TYPES = new Set([
  "buyer",
  "seller",
  "seller_cash_offer",
  "investor",
  "listing_inquiry",
  "open_house",
  "home_value",
  "relocation",
  "renter",
  "agent_referral",
  "general_question",
  "unknown",
]);

const PUBLIC_LEAD_CONFLICT_ERROR =
  "That submission conflicts with an existing request. Please refresh and submit again, or call Our Town Properties at 252-243-7700.";
function leadTypeFor(payload: LeadPayload) {
  if (payload.lead_type && LEAD_TYPES.has(payload.lead_type)) return payload.lead_type;
  if (payload.funnel_type === "seller") return "seller";
  if (payload.funnel_type === "buyer") return "buyer";
  if (payload.funnel_type === "renter") return "renter";
  if (payload.funnel_type === "open_house") return "open_house";
  if (payload.funnel_type === "home_value" || payload.funnel_type === "widget") return "home_value";
  return "general_question";
}

function primaryIntentFor(leadType: string, payload: LeadPayload) {
  if (
    leadType === "seller" ||
    leadType === "seller_cash_offer" ||
    leadType === "investor" ||
    leadType === "home_value" ||
    payload.funnel_type === "seller"
  ) {
    return "sell";
  }
  if (
    leadType === "buyer" ||
    leadType === "listing_inquiry" ||
    leadType === "relocation" ||
    leadType === "renter"
  ) {
    return "buy";
  }
  return "unknown";
}

function timelineMonthsFor(input?: string) {
  const value = (input || "").toLowerCase();
  if (!value) return null;
  if (/\basap\b|immediate|as soon|right away|0\s*[-–]\s*30|under 30|this month/.test(value)) return 0;
  if (/30\s*[-–]\s*60|60\s*[-–]\s*90|31\s*[-–]\s*90|next 90|90 days/.test(value)) return 3;
  if (/3\s*[-–]\s*6|three\s*[-–]\s*six|3 to 6/.test(value)) return 6;
  if (/6\s*[-–]\s*12|six\s*[-–]\s*twelve|6 to 12/.test(value)) return 12;
  if (/12\+|12 plus|more than 12|next year|just planning|just curious/.test(value)) return 24;
  return null;
}

function splitName(payload: LeadPayload) {
  const explicitFirst = payload.first_name;
  const explicitLast = payload.last_name;
  if (explicitFirst || explicitLast) {
    return { firstName: explicitFirst || null, lastName: explicitLast || null };
  }

  const name = payload.name?.trim();
  if (!name) return { firstName: null, lastName: null };
  const parts = name.split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function stripPhoneDigits(phone?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits || null;
}

function normalizeEmail(email?: string) {
  const cleaned = (email || "").trim().toLowerCase();
  return cleaned || null;
}

function normalizePhone(phone?: string) {
  const digits = stripPhoneDigits(phone);
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function normalizePropertyAddress(address?: string) {
  const cleaned = (address || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function consentIpHash(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim();
  const salt = process.env.CONSENT_IP_HASH_SALT;
  if (!ip || !salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function isUuid(value?: string) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function deterministicSessionId(value: string): string {
  const hex = createHash("sha256")
    .update(`ask-magic-mike:lead-session:${value}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  // RFC 4122 variant with a name-derived version marker. The identifier is
  // stable for a non-UUID idempotency key and never exposes the key itself.
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const compact = hex.join("");
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function sessionIdFor(payload: LeadPayload): string {
  if (payload.idempotency_key) {
    return isUuid(payload.idempotency_key)
      ? payload.idempotency_key
      : deterministicSessionId(payload.idempotency_key);
  }
  return isUuid(payload.widget_session_id) && payload.widget_session_id
    ? payload.widget_session_id
    : crypto.randomUUID();
}

function sourceFor(payload: LeadPayload) {
  const attribution = payload.attribution || {};
  return attribution.source || (payload.lead_source_surface === "widget" ? "widget" : payload.lead_source_surface);
}

function sourceDetailFor(payload: LeadPayload) {
  const attribution = payload.attribution || {};
  return [
    payload.lead_source_surface,
    attribution.medium,
    attribution.campaign,
    attribution.placement_id || attribution.placement,
  ].filter(Boolean).join(" / ") || null;
}

function pageUrlFor(payload: LeadPayload, req: Request) {
  const attribution = payload.attribution || {};
  const referrer = req.headers.get("referer") || undefined;
  return (
    payload.page_url ||
    attribution.parent_url ||
    attribution.landing_page ||
    attribution.current_path ||
    referrer ||
    null
  );
}

function sessionLandingPageFor(payload: LeadPayload, req: Request) {
  const attribution = payload.attribution || {};
  return (
    attribution.parent_url ||
    payload.page_url ||
    attribution.landing_page ||
    attribution.current_path ||
    req.headers.get("referer") ||
    null
  );
}

function referrerTypeFor(payload: LeadPayload) {
  const source = (sourceFor(payload) || "").toLowerCase();
  const medium = (payload.attribution?.medium || "").toLowerCase();
  if (["cpc", "paid", "paid_social", "ppc"].includes(medium)) return "paid";
  if (["facebook", "instagram", "meta", "tiktok", "youtube"].includes(source)) return "social";
  if (medium === "email") return "email";
  if (payload.attribution?.referrer || payload.attribution?.parent_url) return "referral";
  return "direct";
}

function buildNotes(payload: LeadPayload) {
  const attribution = payload.attribution || {};
  const notes = [
    payload.notes,
    payload.address ? "Address: " + payload.address : undefined,
    payload.question ? "Question: " + payload.question : undefined,
    payload.condition ? "Condition: " + payload.condition : undefined,
    payload.timeline ? "Timeline: " + payload.timeline : undefined,
    "Attribution: " + JSON.stringify(attribution),
  ]
    .filter(Boolean)
    .join("\n");

  return notes || null;
}

function qualificationFor(payload: LeadPayload) {
  const leadType = leadTypeFor(payload);
  const timelineMonths = timelineMonthsFor(payload.timeline);
  const hasContact = Boolean(payload.email || payload.phone);
  const hasProperty = Boolean(payload.address || payload.property_address);
  const sellerIntent = primaryIntentFor(leadType, payload) === "sell";

  if (
    sellerIntent &&
    hasProperty &&
    hasContact &&
    timelineMonths !== null &&
    timelineMonths <= 3
  ) {
    return { status: "qualified", lead_grade: "A" };
  }
  if (sellerIntent && hasProperty && hasContact) {
    return { status: "qualified", lead_grade: "B" };
  }
  if (hasContact) {
    return { status: "new", lead_grade: "C" };
  }
  return { status: "new", lead_grade: "D" };
}

function buildSessionRow(payload: LeadPayload, req: Request, sessionId: string) {
  const attribution = payload.attribution || {};
  return {
    id: sessionId,
    utm_source: attribution.source || null,
    utm_medium: attribution.medium || null,
    utm_campaign: attribution.campaign || null,
    utm_content: attribution.content || null,
    utm_term: attribution.term || null,
    referrer_url: attribution.parent_url || attribution.referrer || req.headers.get("referer") || null,
    referrer_type: referrerTypeFor(payload),
    landing_page: sessionLandingPageFor(payload, req),
    user_agent: req.headers.get("user-agent") || null,
    device_type: attribution.device_category === "mobile" ||
      attribution.device_category === "tablet" ||
      attribution.device_category === "desktop"
      ? attribution.device_category
      : null,
    initial_question: payload.question || null,
    initial_address: payload.address || payload.property_address || null,
    status: "completed",
    step_reached: 5,
  };
}

function buildLeadRow(payload: LeadPayload, req: Request, sessionId: string) {
  const leadType = leadTypeFor(payload);
  const { firstName, lastName } = splitName(payload);
  const notes = buildNotes(payload);
  const qualification = qualificationFor(payload);
  const address = payload.property_address || payload.address || undefined;
  const score = scoreLead(payload);
  const routing = routeLead(payload, score.score);
  const consentEmail = consentGrantedForEmail(payload);
  const consentCall = consentGrantedForCall(payload);
  const consentSms = consentGrantedForSms(payload);

  return {
    session_id: sessionId,
    first_name: firstName,
    last_name: lastName,
    email: payload.email || null,
    phone: payload.phone || null,
    phone_normalized: stripPhoneDigits(payload.phone),
    normalized_email: normalizeEmail(payload.email),
    normalized_phone: normalizePhone(payload.phone),
    normalized_property_address: normalizePropertyAddress(address),
    spam_score: 0,
    spam_reasons: [],
    is_duplicate: false,
    duplicate_of_lead_id: null,
    state: "NC",
    address_raw: address || null,
    primary_intent: primaryIntentFor(leadType, payload),
    question_raw: notes || payload.question || payload.condition || null,
    timeline_months: timelineMonthsFor(payload.timeline),
    consent_sms: consentSms,
    consent_call: consentCall,
    consent_email: consentEmail,
    consent_timestamp: consentEmail || consentCall || consentSms ? new Date().toISOString() : null,
    consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
    status: qualification.status,
    lead_type: leadType,
    lead_grade: qualification.lead_grade,
    conversion_stage: qualification.status === "qualified" ? "qualified" : null,
    source: sourceFor(payload),
    source_detail: sourceDetailFor(payload),
    page_url: pageUrlFor(payload, req),
    widget_session_id: payload.widget_session_id || sessionId,
    city: payload.city || null,
    score: score.score,
    score_factors: score.factors,
    score_version: score.version,
    is_test: payload.is_test === true,
    consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
    consent_ip_hash: consentIpHash(req),
    consent_source: payload.consent_source || payload.lead_source_surface,
    consent_user_agent: req.headers.get("user-agent") || null,
    communication_suppressed: payload.is_test === true,
    email_suppressed: payload.is_test === true,
    sms_suppressed: payload.is_test === true,
    routing_reason: routing.routingReason,
    target_geography: payload.target_geography || null,
    financing: payload.financing || null,
    preapproval: payload.preapproval ?? null,
    request_idempotency_key: payload.idempotency_key || null,
  };
}

function buildSourceAttributionRow(payload: LeadPayload, req: Request) {
  const attribution = payload.attribution || {};
  const medium = attribution.medium || null;
  return {
    utm_source: attribution.source || sourceFor(payload) || null,
    utm_medium: medium,
    utm_campaign: attribution.campaign || null,
    utm_content: attribution.content || null,
    utm_term: attribution.term || null,
    referrer_url: attribution.parent_url || attribution.referrer || req.headers.get("referer") || null,
    referrer_type: referrerTypeFor(payload),
    landing_page: sessionLandingPageFor(payload, req),
    is_paid: ["cpc", "paid", "paid_social", "ppc"].includes(String(medium || "").toLowerCase()),
    first_touch: attribution.first_touch || null,
    last_touch: attribution.last_touch || attribution,
    click_ids: {
      gclid: attribution.gclid || null,
      gbraid: attribution.gbraid || null,
      wbraid: attribution.wbraid || null,
      fbclid: attribution.fbclid || null,
      msclkid: attribution.msclkid || null,
    },
    placement_id: attribution.placement_id || attribution.placement || null,
    page_title: attribution.page_title || null,
    listing_id: payload.listing_id || attribution.listing_id || null,
    property_id: payload.property_id || attribution.property_id || null,
    agent_id: payload.agent_id || attribution.agent_id || null,
  };
}

async function insertLead(payload: LeadPayload, req: Request) {
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) throw new Error(mutation.error);

  const persistence = createDefaultPersistence();
  if (!persistence) {
    console.info("Lead capture refused: canonical database is not configured", {
      funnel_type: payload.funnel_type,
      lead_source_surface: payload.lead_source_surface,
      address_present: Boolean(payload.address),
      email_present: Boolean(payload.email),
      phone_present: Boolean(payload.phone),
    });
    throw new Error("lead_store_not_configured");
  }

  const sessionId = sessionIdFor(payload);
  const result = await persistence.captureLeadLifecycle({
    session: buildSessionRow(payload, req, sessionId),
    lead: buildLeadRow(payload, req, sessionId),
    attribution: buildSourceAttributionRow(payload, req),
    // The public capture owns the single internal lead-alert outbox below.
    // Disable the legacy assignment outbox here so a Mike assignment cannot
    // create a duplicate email alongside the canonical alert.
    notificationMode: "disabled",
  });
  if (process.env.NODE_ENV !== "test" && result.ok && !result.idempotent_replay && persistence.enrichLeadRecord) {
    const score = scoreLead(payload);
    const routing = routeLead(payload, score.score);
    const consentEmail = consentGrantedForEmail(payload);
    const consentCall = consentGrantedForCall(payload);
    const consentSms = consentGrantedForSms(payload);
    const collectedAt = new Date().toISOString();
    await persistence.enrichLeadRecord({
      leadId: result.lead_id,
      leadPatch: {
        city: payload.city || null,
        score: score.score,
        score_factors: score.factors,
        score_version: score.version,
        is_test: payload.is_test === true,
        consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
        consent_ip_hash: consentIpHash(req),
        consent_source: payload.consent_source || payload.lead_source_surface,
        consent_user_agent: req.headers.get("user-agent") || null,
        communication_suppressed: payload.is_test === true,
        email_suppressed: payload.is_test === true,
        sms_suppressed: payload.is_test === true,
        routing_reason: routing.routingReason,
        target_geography: payload.target_geography || null,
        financing: payload.financing || null,
        preapproval: payload.preapproval ?? null,
        request_idempotency_key: payload.idempotency_key || null,
      },
      attributionPatch: {
        first_touch: payload.attribution.first_touch || null,
        last_touch: payload.attribution.last_touch || payload.attribution,
        click_ids: {
          gclid: payload.attribution.gclid || null,
          gbraid: payload.attribution.gbraid || null,
          wbraid: payload.attribution.wbraid || null,
          fbclid: payload.attribution.fbclid || null,
          msclkid: payload.attribution.msclkid || null,
        },
        placement_id: payload.attribution.placement_id || payload.attribution.placement || null,
        page_title: payload.attribution.page_title || null,
        listing_id: payload.listing_id || payload.attribution.listing_id || null,
        property_id: payload.property_id || payload.attribution.property_id || null,
        agent_id: payload.agent_id || payload.attribution.agent_id || null,
      },
      consents: [
        ["email", consentEmail],
        ["call", consentCall],
        ["sms", consentSms],
      ].map(([type, granted]) => ({
        lead_id: result.lead_id,
        consent_type: type,
        granted,
        language_version: LEAD_CONSENT_LANGUAGE_VERSION,
        language_text: LEAD_CONSENT_LANGUAGE_TEXT,
        user_agent: req.headers.get("user-agent") || null,
        collected_at: collectedAt,
      })),
    });
  }
  return result;
}

function isLeadConflict(
  result: LeadLifecycleCaptureResult,
): result is Extract<LeadLifecycleCaptureResult, { ok: false }> {
  return result.ok === false;
}

function validateLead(payload: LeadPayload) {
  if ((payload.funnel_type === "home_value" || payload.funnel_type === "widget") && !payload.address) {
    return "Address is required.";
  }

  if (
    (payload.funnel_type === "home_value" || payload.funnel_type === "widget") &&
    !payload.email &&
    !payload.phone
  ) {
    return "Email or phone is required for a home value request.";
  }

  if (payload.funnel_type === "seller" && (!payload.address || !payload.phone)) {
    return "Property address and phone are required for seller requests.";
  }

  if (payload.funnel_type === "chat" && !payload.question) {
    return "Question is required for chat leads.";
  }

  if (payload.funnel_type === "chat" && !payload.email && !payload.phone) {
    return "Email or phone is required for a chat follow-up request.";
  }

  if (payload.funnel_type === "chat" && !payload.consent) {
    return "Consent is required for a chat follow-up request.";
  }

  if (payload.funnel_type === "appointment" && !payload.email && !payload.phone) {
    return "Email or phone is required to schedule an appointment.";
  }

  if ((payload.funnel_type === "buyer" || payload.funnel_type === "renter") && !payload.email && !payload.phone) {
    return "Email or phone is required for buyer and renter requests.";
  }

  if (payload.funnel_type === "open_house" && !payload.email && !payload.phone) {
    return "Email or phone is required for open-house registration.";
  }

  if (payload.email && !isValidLeadEmail(payload.email)) {
    return "Enter a valid email address.";
  }

  if (payload.phone && !isValidLeadPhone(payload.phone)) {
    return "Enter a valid phone number.";
  }

  const boundedFields: Array<[string, string | undefined, number]> = [
    ["address", payload.address, 500],
    ["name", payload.name, 160],
    ["question", payload.question, 4000],
    ["notes", payload.notes, 4000],
    ["page_url", payload.page_url, 2048],
    ["idempotency_key", payload.idempotency_key, 160],
  ];
  for (const [label, value, max] of boundedFields) {
    if (value && value.length > max) return `${label} is too long.`;
  }

  return null;
}

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  const origin = req.headers.get("origin");
  if (!isApprovedPublicOrigin(origin)) {
    return NextResponse.json({ error: "This form origin is not approved.", correlation_id: correlationId }, { status: 403, headers: { "X-AMM-Correlation-Id": correlationId } });
  }

  const rateLimit = process.env.NODE_ENV === "test"
    ? { allowed: true, remaining: LIMITS.intakeSubmit.limit, resetAt: Date.now() + LIMITS.intakeSubmit.windowMs, durable: true }
    : await checkRateLimit(
        rateLimitKey(req.headers.get("x-forwarded-for")),
        LIMITS.intakeSubmit.limit,
        LIMITS.intakeSubmit.windowMs,
        "intakeSubmit",
      );
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly.", correlation_id: correlationId }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))), "X-AMM-Correlation-Id": correlationId } });
  }
  if (!rateLimit.durable && !nonDurableRateLimitFallbackAllowed()) {
    return NextResponse.json({ error: "Lead intake is temporarily unavailable.", correlation_id: correlationId }, { status: 503, headers: { "X-AMM-Correlation-Id": correlationId } });
  }

  let raw: unknown;
  let rawBody: string;
  let persistedLead: Awaited<ReturnType<typeof insertLead>>;
  try {
    const declaredSize = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(declaredSize) && declaredSize > 65_536) {
      return NextResponse.json({ error: "Submission is too large.", correlation_id: correlationId }, { status: 413 });
    }
    rawBody = await req.text();
    if (rawBody.length > 65_536) {
      return NextResponse.json({ error: "Submission is too large.", correlation_id: correlationId }, { status: 413 });
    }
    if (req.headers.get("x-amm-wp-bridge")) {
      const bridge = verifyWordPressBridgeRequest(req, rawBody);
      if (!bridge.ok) {
        return NextResponse.json(
          { error: "WordPress bridge authorization failed.", code: bridge.error, correlation_id: correlationId },
          { status: bridge.status, headers: { "X-AMM-Correlation-Id": correlationId } },
        );
      }
    }
    raw = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const payload = normalizeLeadPayload({
    ...input,
    idempotency_key: input.idempotency_key || req.headers.get("idempotency-key") || undefined,
  });

  if (payload.honeypot) {
    return NextResponse.json({ message: "Got it.", correlation_id: correlationId }, { status: 202, headers: { "X-AMM-Correlation-Id": correlationId } });
  }
  const validationError = validateLead(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError, correlation_id: correlationId }, { status: 400, headers: { "X-AMM-Correlation-Id": correlationId } });
  }

  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return NextResponse.json(
      { error: mutation.publicMessage, code: mutation.error },
      { status: mutation.statusCode, headers: { "X-AMM-Correlation-Id": correlationId } },
    );
  }

  try {
    persistedLead = await insertLead(payload, req);
  } catch (error) {
    if (error instanceof Error && error.message === "preview_data_disabled") {
      return NextResponse.json({ error: PREVIEW_READ_ONLY_MESSAGE, code: "preview_data_disabled", correlation_id: correlationId }, { status: 503, headers: { "X-AMM-Correlation-Id": correlationId } });
    }
    if (error instanceof Error && error.message === "lead_store_not_configured") {
      return NextResponse.json({ error: PUBLIC_LEAD_SAVE_ERROR, code: "lead_store_not_configured", correlation_id: correlationId }, { status: 503, headers: { "X-AMM-Correlation-Id": correlationId } });
    }
    console.error("Lead persistence failed", {
      funnel_type: payload.funnel_type,
      lead_source_surface: payload.lead_source_surface,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: PUBLIC_LEAD_SAVE_ERROR, correlation_id: correlationId }, { status: 500, headers: { "X-AMM-Correlation-Id": correlationId } });
  }

  if (isLeadConflict(persistedLead)) {
    return NextResponse.json({ error: PUBLIC_LEAD_CONFLICT_ERROR, code: persistedLead.error, correlation_id: correlationId }, { status: 409, headers: { "X-AMM-Correlation-Id": correlationId } });
  }

  if (persistedLead.idempotent_replay) {
    return NextResponse.json(
      {
        message: "Your request is stored for review. Mike or the approved team will follow up through the contact path you provided.",
        lead_id: persistedLead.lead_id,
        session_id: persistedLead.session_id,
        duplicate_of_lead_id: persistedLead.duplicate_of_lead_id ?? null,
        correlation_id: correlationId,
      },
      { headers: { "X-AMM-Idempotent-Replay": "1", "X-AMM-Correlation-Id": correlationId } },
    );
  }

  const score = scoreLead(payload);
  const routing = routeLead(payload, score.score);
  let notificationResult: Awaited<ReturnType<typeof enqueueLeadNotifications>> | null = null;
  if (process.env.NODE_ENV !== "test") {
    notificationResult = await enqueueLeadNotifications({
      leadId: persistedLead.lead_id,
      sessionId: persistedLead.session_id,
      correlationId,
      payload,
      score,
      routing,
      submittedAt: new Date().toISOString(),
      duplicateOfLeadId: persistedLead.duplicate_of_lead_id,
    });
    await recordServerAnalyticsEvent({
      eventName: "lead_created",
      category: "intake",
      sessionId: persistedLead.session_id,
      leadId: persistedLead.lead_id,
      attribution: { source: payload.attribution.source, medium: payload.attribution.medium, campaign: payload.attribution.campaign },
      properties: { funnel_name: payload.funnel_type, lead_source_surface: payload.lead_source_surface, is_test: payload.is_test === true, score: score.score },
      userAgent: req.headers.get("user-agent"),
    });
    const internalStatus = notificationResult.internal?.status;
    if (internalStatus) {
      await recordServerAnalyticsEvent({
        eventName: internalStatus === "sent" ? "notification_delivered" : internalStatus === "retry_scheduled" || internalStatus === "permanently_failed" ? "notification_failed" : "notification_queued",
        category: "system",
        sessionId: persistedLead.session_id,
        leadId: persistedLead.lead_id,
        properties: { notification_type: "lead_alert", status: internalStatus, is_test: payload.is_test === true },
      });
    }
    if (!payload.is_test) {
      const liveMonitor = createFirstLiveLeadMonitor();
      if (liveMonitor) {
        try {
          await liveMonitor.run({ leadId: persistedLead.lead_id, lookbackHours: 1 });
        } catch {
          console.error("First-live lead monitor failed", { error: "first_live_monitor_failed" });
        }
      }
    }
  }
  return NextResponse.json({
    message: "Your request is stored for review. Mike or the approved team will follow up through the contact path you provided.",
    lead_id: persistedLead.lead_id,
    session_id: persistedLead.session_id,
    duplicate_of_lead_id: persistedLead.duplicate_of_lead_id ?? null,
    correlation_id: correlationId,
  }, { headers: { "X-AMM-Correlation-Id": correlationId } });
}
