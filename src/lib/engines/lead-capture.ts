/**
 * LeadCaptureEngine
 *
 * Canonical capture orchestrator. Accepts a validated
 * `CreateLeadCanonicalInput`, normalizes identity, runs spam + dup
 * detection, then commits the lead through the existing repositories
 * (so the funnel scoring + routing engines keep working).
 *
 * Side effects:
 *   - writes a `leads` row (or marks a dup of an existing one)
 *   - writes `analytics_events` with `lead_created` + reason events
 *   - emits a `lead_event` for downstream consumers
 *
 * In dev/no-Supabase mode the engine logs a structured record and
 * returns a synthetic UUID so the public route stays responsive without
 * a database.
 */
import { randomUUID, createHash } from "node:crypto";
import type {
  CreateLeadCanonicalInput,
} from "@/schemas/leads-canonical.schema";
import {
  legacyIntentFor,
  gradeForScore,
  shouldAutoSendConfirmation,
  type LeadType,
} from "@/lib/leads/lead-types";
import { normalizeLeadIdentity } from "@/lib/leads/normalize";
import { scoreSpam } from "@/lib/leads/spam-detector";
import {
  classifyDuplicate,
  type KnownLeadIdentity,
} from "@/lib/leads/duplicate-detection";
import { trackEventNoWait } from "@/lib/analytics/ledger";

export interface CaptureRequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  acceptedLanguage?: string | null;
}

export interface CaptureResult {
  leadId: string;
  ok: boolean;
  isDuplicate: boolean;
  duplicateOfLeadId?: string;
  spamScore: number;
  isSpamSuspect: boolean;
  leadType: LeadType;
  grade: string;
  autoConfirmationQueued: boolean;
  reasons: Array<{ code: string; points?: number; label: string }>;
  // Public-safe response shape — never includes internal fields.
  publicPayload: {
    lead_id: string;
    received_at: string;
    next_step: string;
  };
}

export interface LeadCaptureRepository {
  /** Look up known leads that could collide with the candidate. */
  findKnownByIdentity(input: {
    normalizedEmail: string | null;
    normalizedPhone: string | null;
  }): Promise<KnownLeadIdentity[]>;

  /** Insert a brand new lead and return its id. */
  insertLead(record: PersistableLead): Promise<string>;

  /** Increment activity on an existing lead and record the dup attempt. */
  recordDuplicateAttempt(args: {
    existingLeadId: string;
    spamScore: number;
    spamReasons: unknown;
  }): Promise<void>;
}

/** What we actually write to Postgres. */
export interface PersistableLead {
  id: string;
  sessionId: string | null;
  contactId: string | null;
  leadType: LeadType;
  legacyIntent: "sell" | "buy" | "both" | "unknown";
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  propertyAddress: string | null;
  normalizedPropertyAddress: string | null;
  city: string | null;
  county: string | null;
  state: string;
  zip: string | null;
  source: string;
  sourceDetail: string | null;
  pageUrl: string | null;
  widgetSessionId: string | null;
  listingId: string | null;
  utm: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    term: string | null;
    content: string | null;
  };
  referrer: string | null;
  landingPage: string | null;
  spamScore: number;
  spamReasons: unknown;
  leadGrade: string;
  metadata: Record<string, unknown> | null;
}

/**
 * Pure, in-process engine. Pass a repository implementation in for prod;
 * tests pass an in-memory stub.
 */
export class LeadCaptureEngine {
  constructor(private readonly repo: LeadCaptureRepository) {}

  async capture(
    input: CreateLeadCanonicalInput,
    meta: CaptureRequestMeta
  ): Promise<CaptureResult> {
    const reasons: CaptureResult["reasons"] = [];

    // 1) Normalize identity.
    const ids = normalizeLeadIdentity({
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.property_address ?? null,
    });

    // 2) Spam scoring (inline).
    const spam = scoreSpam({
      name: input.name ?? joinName(input.first_name, input.last_name),
      email: input.email ?? null,
      phone: input.phone ?? null,
      question: input.intent ?? input.notes ?? null,
      userAgent: meta.userAgent ?? null,
      honeypot: input.honeypot ?? null,
      formStartedAtMs: input.form_started_at_ms ?? null,
    });
    for (const r of spam.reasons) reasons.push({ code: r.code, points: r.points, label: r.label });

    if (spam.isReject) {
      // Reject before touching the DB; emit a tracking event so we still
      // see the volume of bot traffic in the analytics ledger.
      trackEventNoWait({
        eventName: "spam_flagged", // not in the legacy enum; ledger swallows unknown gracefully
        properties: {
          spamScore: spam.score,
          spamReasons: spam.reasons,
          source: input.source,
        },
      });
      const stubId = randomUUID();
      return {
        leadId: stubId,
        ok: false,
        isDuplicate: false,
        spamScore: spam.score,
        isSpamSuspect: false,
        leadType: input.lead_type,
        grade: "D",
        autoConfirmationQueued: false,
        reasons: [...reasons, { code: "spam_rejected", label: "Rejected as spam" }],
        publicPayload: {
          lead_id: stubId,
          received_at: new Date().toISOString(),
          next_step: "We could not process this request. Please try again.",
        },
      };
    }

    // 3) Duplicate detection.
    const known = await this.repo.findKnownByIdentity({
      normalizedEmail: ids.email.normalized,
      normalizedPhone: ids.phone.e164,
    });
    const dup = classifyDuplicate(ids, known);

    // 4) Score → grade. We rely on the existing scoring engine downstream
    //    (it runs on the leads row via the intake submit path). For the
    //    canonical endpoint we provide a grade estimate from the spam +
    //    contact-quality signals so the auto-confirmation branch has
    //    something to go on. Real composite score is recomputed when the
    //    intake completes.
    const estimateScore = estimateInitialScore(input, ids, spam.score);
    const grade = gradeForScore(estimateScore);

    // 5) Persist.
    if (dup.isHard && dup.match) {
      await this.repo.recordDuplicateAttempt({
        existingLeadId: dup.match.leadId,
        spamScore: spam.score,
        spamReasons: spam.reasons,
      });
      trackEventNoWait({
        eventName: "duplicate_detected",
        leadId: dup.match.leadId,
        properties: {
          source: input.source,
          confidence: dup.match.confidence,
          reasons: dup.match.reasons,
        },
      });
      reasons.push({
        code: "duplicate_hard",
        label: `Hard duplicate of existing lead (${dup.match.confidence})`,
      });
      return {
        leadId: dup.match.leadId,
        ok: true,
        isDuplicate: true,
        duplicateOfLeadId: dup.match.leadId,
        spamScore: spam.score,
        isSpamSuspect: spam.isSuspect,
        leadType: input.lead_type,
        grade,
        autoConfirmationQueued: false,
        reasons,
        publicPayload: {
          lead_id: dup.match.leadId,
          received_at: new Date().toISOString(),
          next_step:
            "We already have your details — Mike's team will follow up.",
        },
      };
    }

    const id = randomUUID();
    const persistable: PersistableLead = {
      id,
      sessionId: null, // intake-flow leads supply this; canonical entry doesn't require it
      contactId: null,
      leadType: input.lead_type,
      legacyIntent: legacyIntentFor(input.lead_type),
      firstName: input.first_name ?? splitFirst(input.name) ?? null,
      lastName:  input.last_name  ?? splitLast(input.name)  ?? null,
      email: ids.email.normalized,
      phone: ids.phone.e164,
      normalizedEmail: ids.email.normalized,
      normalizedPhone: ids.phone.e164,
      propertyAddress: input.property_address ?? null,
      normalizedPropertyAddress: ids.address.fingerprint,
      city:   input.city ?? null,
      county: input.county ?? null,
      state:  input.state ?? "NC",
      zip:    input.zip ?? null,
      source: input.source,
      sourceDetail: input.source_detail ?? null,
      pageUrl:        input.page_url ?? null,
      widgetSessionId: input.widget_session_id ?? null,
      listingId: input.listing_id ?? null,
      utm: {
        source: input.utm_source ?? null,
        medium: input.utm_medium ?? null,
        campaign: input.utm_campaign ?? null,
        term: input.utm_term ?? null,
        content: input.utm_content ?? null,
      },
      referrer:    input.referrer ?? meta.referrer ?? null,
      landingPage: input.landing_page ?? null,
      spamScore: spam.score,
      spamReasons: spam.reasons,
      leadGrade: grade,
      metadata: {
        ...(input.metadata ?? {}),
        ipHash: meta.ipAddress ? hashIp(meta.ipAddress) : null,
        gclid:  input.gclid ?? null,
        fbclid: input.fbclid ?? null,
      },
    };

    const persistedId = await this.repo.insertLead(persistable);

    trackEventNoWait({
      eventName: "lead_created",
      leadId: persistedId,
      properties: {
        leadType: input.lead_type,
        source: input.source,
        grade,
        spamScore: spam.score,
        spamSuspect: spam.isSuspect,
        utmSource: input.utm_source ?? null,
      },
      utmSource:   input.utm_source   ?? undefined,
      utmMedium:   input.utm_medium   ?? undefined,
      utmCampaign: input.utm_campaign ?? undefined,
    });

    return {
      leadId: persistedId,
      ok: true,
      isDuplicate: dup.isLikely,
      duplicateOfLeadId: dup.match?.leadId,
      spamScore: spam.score,
      isSpamSuspect: spam.isSuspect,
      leadType: input.lead_type,
      grade,
      autoConfirmationQueued:
        shouldAutoSendConfirmation(grade) && !spam.isSuspect,
      reasons,
      publicPayload: {
        lead_id: persistedId,
        received_at: new Date().toISOString(),
        next_step:
          "Mike Eatmon or the Our Town Properties team will follow up.",
      },
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function joinName(first: string | null | undefined, last: string | null | undefined) {
  return [first, last].filter(Boolean).join(" ") || null;
}
function splitFirst(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.trim().split(/\s+/)[0] ?? null;
}
function splitLast(name: string | null | undefined): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return null;
  return parts.slice(1).join(" ");
}
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Best-effort initial grade estimate from contact quality + intent. The
 *  authoritative score still comes from `computeScore` downstream once the
 *  full intake completes. */
function estimateInitialScore(
  input: CreateLeadCanonicalInput,
  ids: ReturnType<typeof normalizeLeadIdentity>,
  spamScore: number
): number {
  let s = 0;
  if (ids.phone.valid) s += 10;
  if (ids.email.valid) s += 6;
  if (input.first_name || input.last_name || input.name) s += 4;
  if (input.preferred_contact_method) s += 2;

  switch (input.timeline) {
    case "asap":
    case "0_30_days":     s += 22; break;
    case "31_90_days":    s += 15; break;
    case "3_6_months":    s += 8;  break;
    case "6_plus_months": s += 4;  break;
  }

  switch (input.lead_type) {
    case "seller_cash_offer":
    case "investor":          s += 18; break;
    case "listing_inquiry":
    case "home_value":        s += 14; break;
    case "buyer":             s += 12; break;
    case "seller":            s += 14; break;
    case "agent_referral":    s += 6;  break;
    case "general_question":  s += 5;  break;
  }

  if (input.property_address) s += 8;
  if (input.zip)              s += 4;
  if (input.listing_id)       s += 6;

  // Penalize spam.
  s -= Math.round(spamScore / 2);
  return Math.max(0, Math.min(100, s));
}
