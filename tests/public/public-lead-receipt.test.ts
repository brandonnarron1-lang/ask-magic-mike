// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { isValidLeadPhone } from "../../app/lib/leadContactValidation";
import { normalizeLeadPayload } from "../../app/lib/leadPayload";
import { PUBLIC_LEAD_SAVE_ERROR } from "../../app/lib/publicLeadErrors";
import { validateRawPublicLeadInput } from "../../app/lib/publicLeadIngress";
import {
  parsePublicLeadReceipt,
  parsePublicLeadRetryAfter,
  publicLeadOutcomeFromResponse,
  publicLeadTransportOutcome,
  PUBLIC_LEAD_SAVED_MESSAGE,
  PUBLIC_LEAD_UNCONFIRMED_MESSAGE,
  type PublicLeadResponse,
} from "../../app/lib/publicLeadReceipt";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-5222-9222-222222222222";
const CORRELATION_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const OTHER_ID = "bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb";
const DUPLICATE_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const NOW = Date.parse("2030-01-01T00:00:00.250Z");
const INTERNAL_DETAIL = "synthetic provider exception: private database field and token";
const RECEIPT = {
  lead_id: LEAD_ID,
  session_id: SESSION_ID,
  correlation_id: CORRELATION_ID,
  duplicate_of_lead_id: null,
  message: PUBLIC_LEAD_SAVED_MESSAGE,
};

function headers(extra: Record<string, string> = {}) {
  return new Headers({
    "Content-Type": "application/json",
    "X-AMM-Correlation-Id": CORRELATION_ID,
    ...extra,
  });
}

function response(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: headers(extra) });
}

function refusal(code: string, status: number, extra: Record<string, string> = {}, error = INTERNAL_DETAIL) {
  return response({ code, error, correlation_id: CORRELATION_ID }, status, extra);
}

describe("strict public committed receipt", () => {
  it("accepts the actual committed 200 shape, with no invented success flag", async () => {
    const outcome = await publicLeadOutcomeFromResponse(response(RECEIPT));
    expect(outcome).toEqual({
      status: "saved",
      receipt: { ...RECEIPT, idempotentReplay: false },
    });
  });

  it("accepts the actual replay header, preserving the original receipt", async () => {
    const outcome = await publicLeadOutcomeFromResponse(response(RECEIPT, 200, {
      "X-AMM-Idempotent-Replay": "1",
    }));
    expect(outcome).toMatchObject({ status: "saved", receipt: {
      lead_id: LEAD_ID, session_id: SESSION_ID, idempotentReplay: true,
    } });
  });

  it.each([null, DUPLICATE_ID, undefined])("handles optional canonical duplicate ID %s", async (duplicate) => {
    const outcome = await publicLeadOutcomeFromResponse(response({ ...RECEIPT, duplicate_of_lead_id: duplicate }));
    expect(outcome).toMatchObject({ status: "saved", receipt: {
      duplicate_of_lead_id: duplicate ?? null, idempotentReplay: false,
    } });
  });

  it("keeps duplicate identity linkage independent of replay", async () => {
    const outcome = await publicLeadOutcomeFromResponse(response({
      ...RECEIPT, duplicate_of_lead_id: DUPLICATE_ID,
    }, 200, { "X-AMM-Idempotent-Replay": "1" }));
    expect(outcome).toMatchObject({ status: "saved", receipt: {
      duplicate_of_lead_id: DUPLICATE_ID, idempotentReplay: true,
    } });
  });

  it("ignores invented body replay flags and normalizes UUID casing", () => {
    expect(parsePublicLeadReceipt({
      ...RECEIPT,
      correlation_id: CORRELATION_ID.toUpperCase(),
      duplicate_of_lead_id: DUPLICATE_ID.toUpperCase(),
      idempotent_replay: true, saved: true, notification_status: "failed",
    }, headers())).toMatchObject({
      correlation_id: CORRELATION_ID, duplicate_of_lead_id: DUPLICATE_ID, idempotentReplay: false,
    });
  });

  it("is notification-independent and discards every untrusted response field", async () => {
    const outcome = await publicLeadOutcomeFromResponse(response({
      ...RECEIPT, message: INTERNAL_DETAIL, error: INTERNAL_DETAIL,
      notification_status: "failed", provider: INTERNAL_DETAIL, details: INTERNAL_DETAIL,
    }));
    expect(outcome).toEqual({ status: "saved", receipt: { ...RECEIPT, idempotentReplay: false } });
    expect(JSON.stringify(outcome)).not.toContain(INTERNAL_DETAIL);
  });

  for (const field of ["lead_id", "session_id", "correlation_id"] as const) {
    it.each([
      undefined, null, "", "lead-1", "qa-email-only-lead", 123, true, [], {},
      "00000000-0000-0000-0000-000000000000",
      "11111111-1111-4111-7111-111111111111",
      "11111111-1111-0111-8111-111111111111",
      ` ${LEAD_ID}`, `${LEAD_ID} `, `${LEAD_ID}, ${OTHER_ID}`,
    ])(`rejects malformed/missing ${field}: %j`, async (value) => {
      const body = { ...RECEIPT, [field]: value };
      expect(parsePublicLeadReceipt(body, headers())).toBeNull();
      expect(await publicLeadOutcomeFromResponse(response(body))).toMatchObject({
        status: "unconfirmed", reason: "invalid_receipt", retryPolicy: "same_payload",
      });
    });
  }

  it.each(["", "duplicate-1", 123, false, {}, [], `${DUPLICATE_ID}, ${LEAD_ID}`])(
    "rejects malformed optional duplicate ID %j", async (value) => {
      expect(await publicLeadOutcomeFromResponse(response({ ...RECEIPT, duplicate_of_lead_id: value })))
        .toMatchObject({ status: "unconfirmed", reason: "invalid_receipt" });
    },
  );

  it.each(["", "request-1", OTHER_ID, `${CORRELATION_ID}, ${OTHER_ID}`])(
    "rejects malformed or mismatched correlation header %s", async (value) => {
      expect(await publicLeadOutcomeFromResponse(response(RECEIPT, 200, { "X-AMM-Correlation-Id": value })))
        .toMatchObject({ status: "unconfirmed", reason: "invalid_receipt" });
    },
  );

  it("rejects a missing correlation header and old mock IDs", async () => {
    const missing = response(RECEIPT);
    missing.headers.delete("X-AMM-Correlation-Id");
    expect(await publicLeadOutcomeFromResponse(missing)).toMatchObject({ status: "unconfirmed" });
    expect(await publicLeadOutcomeFromResponse(response({ lead_id: "qa-lead", session_id: "qa-session" })))
      .toMatchObject({ status: "unconfirmed" });
  });

  it.each(["", "0", "true", "1, 1", "yes"])("rejects unsupported replay header %s", async (value) => {
    expect(await publicLeadOutcomeFromResponse(response(RECEIPT, 200, { "X-AMM-Idempotent-Replay": value })))
      .toMatchObject({ status: "unconfirmed", reason: "invalid_receipt" });
  });

  it.each([null, [], "stored", 42, true])("rejects non-object JSON %j", async (body) => {
    expect(parsePublicLeadReceipt(body, headers())).toBeNull();
    expect(await publicLeadOutcomeFromResponse(response(body))).toMatchObject({ status: "unconfirmed" });
  });

  it.each(["text/html", "text/plain", ""])("rejects non-JSON media type %s even with IDs", async (contentType) => {
    expect(parsePublicLeadReceipt(RECEIPT, headers({ "Content-Type": contentType }))).toBeNull();
    expect(await publicLeadOutcomeFromResponse(response(RECEIPT, 200, { "Content-Type": contentType })))
      .toMatchObject({ status: "unconfirmed", reason: "unreadable_response" });
  });

  it("accepts the actual JSON content-type with charset", async () => {
    expect(await publicLeadOutcomeFromResponse(response(RECEIPT, 200, { "Content-Type": "application/json; charset=utf-8" })))
      .toMatchObject({ status: "saved" });
  });

  it.each(["", "{", "<html>Login</html>"])("rejects malformed/non-JSON body %s", async (text) => {
    expect(await publicLeadOutcomeFromResponse(new Response(text, { status: 200, headers: headers() })))
      .toMatchObject({ status: "unconfirmed", reason: "unreadable_response" });
  });

  it("classifies the exact 202 honeypot contract as not saved", async () => {
    expect(await publicLeadOutcomeFromResponse(response({ message: "Got it.", correlation_id: CORRELATION_ID }, 202)))
      .toMatchObject({ status: "not_saved", reason: "honeypot", retryPolicy: "blocked" });
  });

  it.each([200, 201, 202, 206])("does not infer saved from generic 2xx %i with no IDs", async (status) => {
    expect(await publicLeadOutcomeFromResponse(response({ accepted: true, saved: true, correlation_id: CORRELATION_ID }, status)))
      .toMatchObject({ status: "unconfirmed", reason: "invalid_receipt" });
  });

  it.each([201, 202, 206])("requires the actual committed status, not arbitrary 2xx %i", async (status) => {
    expect(await publicLeadOutcomeFromResponse(response(RECEIPT, status))).toMatchObject({ status: "unconfirmed" });
  });

  it("does not accept a 204 without a receipt", async () => {
    expect(await publicLeadOutcomeFromResponse(new Response(null, { status: 204, headers: headers() })))
      .toMatchObject({ status: "unconfirmed", reason: "unreadable_response" });
  });
});

describe("public failure classification and safe recovery", () => {
  it.each(["identity_conflict", "idempotency_conflict"])("blocks blind retries or identity changes for 409 %s", async (code) => {
    const outcome = await publicLeadOutcomeFromResponse(refusal(code, 409));
    expect(outcome).toMatchObject({ status: "not_saved", reason: "conflict", code, retryPolicy: "blocked" });
    if (outcome.status === "saved") throw new Error("Unexpected saved response");
    expect(outcome.message).toContain("252-243-7700");
    expect(outcome.message).not.toMatch(/refresh|submit again/i);
    expect(JSON.stringify(outcome)).not.toContain(INTERNAL_DETAIL);
  });

  it("also blocks an unknown 409 without exposing its code", async () => {
    expect(await publicLeadOutcomeFromResponse(refusal(INTERNAL_DETAIL, 409)))
      .toMatchObject({ status: "not_saved", reason: "conflict", code: null, retryPolicy: "blocked" });
  });

  it.each(["text/html", "application/json"])("keeps an unreadable 409 blocked (%s), not a same-payload retry", async (contentType) => {
    expect(await publicLeadOutcomeFromResponse(new Response("<html>Conflict</html>", {
      status: 409, headers: { "Content-Type": contentType },
    }))).toMatchObject({ status: "not_saved", reason: "conflict", code: null, retryPolicy: "blocked" });
  });

  it("keeps a 409 blocked when correlation headers are missing or mismatched", async () => {
    const input = refusal("idempotency_conflict", 409);
    input.headers.delete("X-AMM-Correlation-Id");
    expect(await publicLeadOutcomeFromResponse(input)).toMatchObject({ retryPolicy: "blocked", correlation_id: null });
    expect(await publicLeadOutcomeFromResponse(refusal("idempotency_conflict", 409, { "X-AMM-Correlation-Id": OTHER_ID })))
      .toMatchObject({ retryPolicy: "blocked", correlation_id: null });
  });

  it.each([
    [400, "invalid_json", "Invalid JSON."],
    [400, "invalid_payload", "Invalid lead payload."],
    [400, "invalid_field_type", "Invalid submission."],
    [400, "protected_field_rejected", "Invalid submission."],
    [400, "invalid_funnel_type", "Invalid lead request type."],
    [400, "invalid_lead_type", "Invalid lead request type."],
    [400, "invalid_lead_source_surface", "Invalid lead source."],
    [400, "invalid_attribution", "Invalid attribution context."],
    [400, "invalid_experiment_context", "Invalid experiment context."],
    [400, "wordpress_bridge_marker_missing", "WordPress bridge authorization failed."],
    [400, "wordpress_bridge_identity_mismatch", "WordPress bridge payload identity was rejected."],
    [413, "payload_too_large", "Submission is too large."],
    [415, "unsupported_media_type", "Lead submissions require JSON."],
    [422, "invalid_lead_payload", "Invalid submission."],
  ])("maps %i %s to a known sanitized refusal", async (status, code, message) => {
    expect(await publicLeadOutcomeFromResponse(refusal(String(code), Number(status))))
      .toMatchObject({ status: "not_saved", reason: "validation", code, message, retryPolicy: "edit" });
  });

  it.each(["idempotency_key_required", "idempotency_key_invalid", "idempotency_key_conflict", "invalid_test_marker"])(
    "uses only registered 400 messaging for %s", async (code) => {
      const outcome = await publicLeadOutcomeFromResponse(refusal(code, 400));
      expect(outcome).toMatchObject({ status: "not_saved", code, retryPolicy: "edit" });
      expect(JSON.stringify(outcome)).not.toContain(INTERNAL_DETAIL);
    },
  );

  it("retains a current known validation message but not an arbitrary error", async () => {
    expect(await publicLeadOutcomeFromResponse(refusal("invalid_lead_payload", 400, {}, "Enter a valid phone number.")))
      .toMatchObject({ status: "not_saved", message: "Enter a valid phone number." });
    expect(await publicLeadOutcomeFromResponse(refusal("invalid_lead_payload", 400, {}, INTERNAL_DETAIL)))
      .toMatchObject({ status: "not_saved", message: "Invalid submission." });
  });

  it.each([INTERNAL_DETAIL, "__proto__", "constructor", "toString"])("never echoes unknown public code %s", async (code) => {
    expect(await publicLeadOutcomeFromResponse(refusal(code, 400)))
      .toMatchObject({ status: "not_saved", code: null, message: PUBLIC_LEAD_SAVE_ERROR });
  });

  it.each(["preview_data_disabled", "lead_store_not_configured", "rate_limit_store_unavailable"])(
    "recognizes pre-save 503 %s as not saved, unlike a persistence exception", async (code) => {
      const outcome = await publicLeadOutcomeFromResponse(refusal(code, 503));
      expect(outcome).toMatchObject({ status: "not_saved", reason: "mode_refusal", code, retryPolicy: "blocked" });
      expect(JSON.stringify(outcome)).not.toContain(INTERNAL_DETAIL);
    },
  );

  it.each([
    [401, "wordpress_bridge_signature_invalid"], [401, "wordpress_bridge_timestamp_expired"],
    [403, "origin_not_approved"], [503, "wordpress_bridge_not_configured"],
  ])("maps existing authorization refusal %i %s without leaking internal details", async (status, code) => {
    const outcome = await publicLeadOutcomeFromResponse(refusal(String(code), Number(status)));
    expect(outcome).toMatchObject({ status: "not_saved", reason: "mode_refusal", code, retryPolicy: "blocked" });
    expect(JSON.stringify(outcome)).not.toContain(INTERNAL_DETAIL);
  });

  it("keeps preview read-only copy without importing server security code", async () => {
    expect(await publicLeadOutcomeFromResponse(refusal("preview_data_disabled", 503)))
      .toMatchObject({ message: "This preview is in read-only demonstration mode. No lead or appointment data was saved." });
  });

  it.each([
    [500, "lead_persistence_failed"], [500, "lead_preparation_failed"],
    [502, INTERNAL_DETAIL], [503, "lead_persistence_failed"], [503, "unknown_mode"],
    [500, "preview_data_disabled"], [504, "timeout"],
  ])("treats %i %s as potentially committed, never retry-by-new-key", async (status, code) => {
    const outcome = await publicLeadOutcomeFromResponse(refusal(String(code), Number(status)));
    expect(outcome).toMatchObject({
      status: "unconfirmed", reason: "server_error", retryPolicy: "same_payload",
      message: PUBLIC_LEAD_UNCONFIRMED_MESSAGE,
    });
    expect(JSON.stringify(outcome)).not.toContain(INTERNAL_DETAIL);
  });

  it("does not infer saved from IDs returned in an error response", async () => {
    expect(await publicLeadOutcomeFromResponse(response({ ...RECEIPT, code: "lead_persistence_failed" }, 500)))
      .toMatchObject({ status: "unconfirmed", reason: "server_error" });
  });

  it("cannot trust even a known refusal with mismatched correlation", async () => {
    expect(await publicLeadOutcomeFromResponse(refusal("preview_data_disabled", 503, { "X-AMM-Correlation-Id": OTHER_ID })))
      .toMatchObject({ status: "unconfirmed", reason: "unexpected_response", code: null });
  });

  it.each(["timeout", "transport_error"] as const)("a %s/lost response may already have committed", (reason) => {
    expect(publicLeadTransportOutcome(reason)).toEqual({
      status: "unconfirmed", reason, httpStatus: null, correlation_id: null, code: null,
      message: PUBLIC_LEAD_UNCONFIRMED_MESSAGE, retryPolicy: "same_payload",
    });
  });

  it("reads once, sanitizes a body-stream exception, and never fetches or retries", async () => {
    const json = vi.fn().mockRejectedValue(new Error(INTERNAL_DETAIL));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      const input: PublicLeadResponse = { status: 200, headers: headers(), json };
      expect(await publicLeadOutcomeFromResponse(input)).toMatchObject({
        status: "unconfirmed", reason: "unreadable_response", message: PUBLIC_LEAD_UNCONFIRMED_MESSAGE,
      });
      expect(json).toHaveBeenCalledExactlyOnceWith();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("429 Retry-After guidance from the actual header", () => {
  it("converts delay-seconds into a same-payload cooldown, not an automatic retry", async () => {
    expect(await publicLeadOutcomeFromResponse(refusal("rate_limited", 429, { "Retry-After": "7" }), NOW))
      .toMatchObject({
        status: "not_saved", reason: "rate_limited", retryPolicy: "same_payload", retryAfterSeconds: 7,
        retryAfter: { source: "delay-seconds", delayMs: 7_000, retryAt: "2030-01-01T00:00:07.250Z" },
      });
  });

  it("supports an HTTP-date using injected time and rounds seconds up", async () => {
    expect(await publicLeadOutcomeFromResponse(refusal("rate_limited", 429, {
      "Retry-After": "Tue, 01 Jan 2030 00:00:10 GMT",
    }), NOW)).toMatchObject({
      status: "not_saved", retryPolicy: "same_payload", retryAfterSeconds: 10,
      retryAfter: { source: "http-date", delayMs: 9_750, retryAt: "2030-01-01T00:00:10.000Z" },
    });
  });

  it("retains actual 429 header guidance even when its JSON/error body is unavailable", async () => {
    expect(await publicLeadOutcomeFromResponse(new Response("<html>Rate limited</html>", {
      status: 429, headers: { "Retry-After": "9", "Content-Type": "text/html" },
    }), NOW)).toMatchObject({ status: "not_saved", code: null, retryPolicy: "same_payload", retryAfterSeconds: 9 });
  });

  it.each(["0", "Tue, 01 Jan 2030 00:00:00 GMT"])("honors an elapsed/zero cooldown %s", (value) => {
    expect(parsePublicLeadRetryAfter(value, NOW)).toMatchObject({ delayMs: 0, retryAt: "2030-01-01T00:00:00.250Z" });
  });

  it.each([
    null, "", "-1", "+1", "1.5", "1e3", "NaN", "Infinity", "10, 20", "2030-01-01",
    "Mon, 01 Jan 2030 00:00:10 GMT", "Tue, 01 Feb 2030 30:00:10 GMT", "999999999999999999999999",
  ])("never invents a cooldown for absent/invalid Retry-After %s", async (value) => {
    expect(parsePublicLeadRetryAfter(value, NOW)).toBeNull();
    const outcome = await publicLeadOutcomeFromResponse(refusal("rate_limited", 429, value === null ? {} : { "Retry-After": value }), NOW);
    expect(outcome).toMatchObject({ status: "not_saved", reason: "rate_limited", retryPolicy: "same_payload" });
    expect(outcome).not.toHaveProperty("retryAfterSeconds");
    expect(outcome).not.toHaveProperty("retryAfter");
  });

  it("rejects timestamps outside Date range and invalid injected time", () => {
    expect(parsePublicLeadRetryAfter("8640000000001", NOW)).toBeNull();
    expect(parsePublicLeadRetryAfter("3", Number.NaN)).toBeNull();
  });

  it("does not trust body retry hints or forward rate-limit error fields", async () => {
    const outcome = await publicLeadOutcomeFromResponse(response({
      code: "rate_limited", correlation_id: CORRELATION_ID,
      retryAfterSeconds: 999, retry_after: 999, error: INTERNAL_DETAIL,
    }, 429, { "Retry-After": "2" }), NOW);
    expect(outcome).toMatchObject({ retryAfterSeconds: 2, code: "rate_limited" });
    expect(JSON.stringify(outcome)).not.toContain(INTERNAL_DETAIL);
  });
});

describe("disjoint pure evidence: optional phone and existing QA classification", () => {
  const BASE_INPUT = { funnel_type: "home_value", lead_source_surface: "home_value_page" };

  it.each([undefined, "", "   "])("normalizes omitted/blank phone %j without a required-phone schema", (phone) => {
    const input = { ...BASE_INPUT, phone };
    expect(validateRawPublicLeadInput(input)).toBeNull();
    expect(normalizeLeadPayload(input).phone).toBeUndefined();
  });

  it("retains supplied phone and the existing validator rejects malformed phone", () => {
    const phone = normalizeLeadPayload({ ...BASE_INPUT, phone: "2025550100" }).phone;
    expect(phone).toBe("2025550100");
    expect(isValidLeadPhone(phone!)).toBe(true);
    expect(isValidLeadPhone("252")).toBe(false);
    expect(isValidLeadPhone("1234567890123456")).toBe(false);
  });

  it.each([
    [{ is_test: true }, false],
    [{ name: "INTERNAL QA" }, false],
    [{ notes: "DO NOT CONTACT" }, false],
    [{ name: "internal qa", notes: "do not contact" }, true],
    [{ address: "INTERNAL QA DO NOT CONTACT", is_test: false }, true],
  ] as const)("classifies only from the existing marker pair %j", (fields, expected) => {
    expect(normalizeLeadPayload({ ...BASE_INPUT, ...fields }).is_test).toBe(expected);
  });
});
