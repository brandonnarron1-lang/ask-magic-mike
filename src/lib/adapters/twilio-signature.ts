/**
 * Twilio inbound-webhook signature verification.
 *
 * Implements Twilio's standard X-Twilio-Signature algorithm so the inbound
 * SMS route can reject forged calls in production. Kept in its own module
 * so the route stays focused and the algorithm can be unit-tested without
 * spinning up a Next handler.
 *
 * Algorithm (per Twilio docs):
 *   1. Take the FULL URL Twilio called (incl. query string).
 *   2. If the body is `application/x-www-form-urlencoded`, append each
 *      param's name+value (no separators), in alphabetical order by name.
 *   3. HMAC-SHA1 the resulting string using your account auth token.
 *   4. Base64-encode the binary digest.
 *   5. Compare against `X-Twilio-Signature` header (constant-time).
 *
 * For JSON bodies Twilio does not require the param appending step; we
 * still HMAC the URL alone.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifyTwilioSignatureArgs {
  /** The full URL Twilio used to call the webhook (must match exactly). */
  url: string;
  /** The signature Twilio sent in `X-Twilio-Signature`. */
  providedSignature: string | null | undefined;
  /** Twilio auth token (`TWILIO_AUTH_TOKEN`). */
  authToken: string;
  /** Parsed form params (for application/x-www-form-urlencoded bodies). */
  formParams?: Record<string, string>;
}

/**
 * Compute the expected signature for the given URL + params, then compare
 * in constant time against the supplied value.
 */
export function verifyTwilioSignature(args: VerifyTwilioSignatureArgs): {
  ok: boolean;
  reason?: "missing_signature" | "missing_token" | "mismatch";
  expected?: string;
} {
  if (!args.providedSignature) return { ok: false, reason: "missing_signature" };
  if (!args.authToken) return { ok: false, reason: "missing_token" };

  const expected = computeTwilioSignature({
    url: args.url,
    formParams: args.formParams,
    authToken: args.authToken,
  });

  // Constant-time compare (length-safe).
  const provided = args.providedSignature;
  if (provided.length !== expected.length) {
    return { ok: false, reason: "mismatch", expected };
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (!timingSafeEqual(a, b)) {
    return { ok: false, reason: "mismatch", expected };
  }
  return { ok: true };
}

/**
 * Computes the expected Twilio signature. Exported so tests + the verifier
 * use the exact same path.
 */
export function computeTwilioSignature(args: {
  url: string;
  authToken: string;
  formParams?: Record<string, string>;
}): string {
  let payload = args.url;
  if (args.formParams) {
    const keys = Object.keys(args.formParams).sort();
    for (const k of keys) {
      payload += k + args.formParams[k];
    }
  }
  const hmac = createHmac("sha1", args.authToken);
  hmac.update(payload);
  return hmac.digest("base64");
}
