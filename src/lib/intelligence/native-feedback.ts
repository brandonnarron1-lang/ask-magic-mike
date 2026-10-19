import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { R2Viewer } from "./viewer";

export const nativeAnswerReferenceSchema = z.object({
  answerId: z.string().uuid(), revision: z.coerce.number().int().positive().max(2147483647),
}).strict();
type AnswerReference = z.infer<typeof nativeAnswerReferenceSchema>;
const TTL_SECONDS = 300;

/** A native request does not impersonate a browser Origin. Header absence is
 * NOT authority: a fresh, current viewer and session-bound CSRF MAC are required
 * as well. The existing web endpoint and its Origin protection stay unchanged.
 * Browser fetch metadata is refused, CORS is not enabled, and no redirect occurs.
 */
export function nativeRequestContext(request: Request) {
  return !["origin", "referer", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest"].some(name => request.headers.has(name));
}
function signature(secret: string, origin: string, viewer: R2Viewer, ref: AnswerReference, expiry: number) {
  if (secret.trim().length < 32) throw Error("native_feedback_unavailable");
  // Domain separation and length-delimited encoding; neither subject nor session
  // is returned in the token. This MAC is CSRF proof, never a bearer login token.
  return createHmac("sha256", secret).update(JSON.stringify([
    "amm:native-feedback:csrf:v1", "POST /api/native/v1/feedback", origin,
    viewer.ownerScope, viewer.consumerUserId, viewer.consumerSessionId,
    ref.answerId, ref.revision, expiry,
  ])).digest("base64url");
}
export function issueNativeFeedbackToken(secret: string, origin: string, viewer: R2Viewer, ref: AnswerReference, now = Date.now()) {
  const checked = nativeAnswerReferenceSchema.parse(ref);
  const expiry = Math.floor(now / 1000) + TTL_SECONDS;
  return { token: `v1.${expiry}.${signature(secret, origin, viewer, checked, expiry)}`, expiresAt: new Date(expiry * 1000).toISOString() };
}
export function verifyNativeFeedbackToken(token: string | null, secret: string, origin: string, viewer: R2Viewer, ref: AnswerReference, now = Date.now()) {
  if (!token || token.length > 90) return false;
  const match = /^v1\.([1-9][0-9]{9})\.([A-Za-z0-9_-]{43})$/.exec(token);
  const parsed = nativeAnswerReferenceSchema.safeParse(ref);
  if (!match || !parsed.success) return false;
  const expiry = Number(match[1]), current = Math.floor(now / 1000);
  if (expiry <= current || expiry > current + TTL_SECONDS) return false;
  try {
    const expected = Buffer.from(signature(secret, origin, viewer, parsed.data, expiry));
    const supplied = Buffer.from(match[2]);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  } catch { return false; }
}
