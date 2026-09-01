import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export type WordPressBridgeVerification =
  | { ok: true; entryId: string }
  | { ok: false; status: 400 | 401 | 503; error: string };

export type WordPressBridgePayloadIdentityVerification =
  | { ok: true; formId: string; entryId: string }
  | { ok: false; status: 400; error: "wordpress_bridge_identity_mismatch" };

function safeEqual(expected: string, supplied: string) {
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function signWordPressBridgeBody(
  secret: string,
  timestamp: string,
  entryId: string,
  body: string,
) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${entryId}.${body}`)
    .digest("hex");
}

/** Verify the optional WordPress bridge boundary.
 * Ordinary browser submissions do not include x-amm-wp-bridge and are unaffected. */
export function verifyWordPressBridgeRequest(
  req: Request,
  body: string,
  env: Record<string, string | undefined> = process.env,
  nowMs = Date.now(),
): WordPressBridgeVerification {
  if (req.headers.get("x-amm-wp-bridge") !== "v1") {
    return { ok: false, status: 400, error: "wordpress_bridge_marker_missing" };
  }
  const secret = env.WORDPRESS_BRIDGE_SECRET;
  if (!secret || secret.length < 32) {
    return { ok: false, status: 503, error: "wordpress_bridge_not_configured" };
  }
  const timestamp = req.headers.get("x-amm-wp-timestamp") ?? "";
  const entryId = req.headers.get("x-amm-wp-entry") ?? "";
  const signatureHeader = req.headers.get("x-amm-wp-signature") ?? "";
  if (!/^\d{10}$/.test(timestamp) || !/^\d{1,20}$/.test(entryId) || !/^v1=[a-f0-9]{64}$/i.test(signatureHeader)) {
    return { ok: false, status: 401, error: "wordpress_bridge_signature_invalid" };
  }
  const requestSeconds = Number(timestamp);
  if (Math.abs(Math.floor(nowMs / 1_000) - requestSeconds) > MAX_CLOCK_SKEW_SECONDS) {
    return { ok: false, status: 401, error: "wordpress_bridge_timestamp_expired" };
  }
  const expected = signWordPressBridgeBody(secret, timestamp, entryId, body);
  const supplied = signatureHeader.slice(3).toLowerCase();
  return safeEqual(expected, supplied)
    ? { ok: true, entryId }
    : { ok: false, status: 401, error: "wordpress_bridge_signature_invalid" };
}

/**
 * Bind the signed entry header to the canonical payload identity. This keeps a
 * valid bridge signature from accidentally attributing one Gravity Forms
 * entry to another form, entry, or consent source.
 */
export function verifyWordPressBridgePayloadIdentity(
  payload: { idempotency_key?: string; consent_source?: string },
  signedEntryId: string,
): WordPressBridgePayloadIdentityVerification {
  const match = /^gf:([1-7]):(\d{1,20})$/.exec(payload.idempotency_key ?? "");
  if (
    !match ||
    match[2] !== signedEntryId ||
    payload.consent_source !== `gravity_forms_${match[1]}`
  ) {
    return {
      ok: false,
      status: 400,
      error: "wordpress_bridge_identity_mismatch",
    };
  }

  return { ok: true, formId: match[1], entryId: match[2] };
}
