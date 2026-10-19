import type { VerifiedInternalBeta } from "./nativeHttp";

const validOrigin = (value: string) => /^https:\/\/amm-internal-beta-[a-f0-9]{12}\.vercel\.app$/.test(value);
/** Deliberately separate from the localhost QA descriptor. This is public
 * provenance, not authentication. No endpoint picker or Production fallback. */
export function internalBetaBinding(raw: string | undefined): VerifiedInternalBeta | undefined {
  if (!raw) return undefined;
  if (raw.length > 1500) throw Error("Beta identity unavailable.");
  const d = JSON.parse(raw) as VerifiedInternalBeta;
  if (!d || Object.keys(d).sort().join() !== "createdAt,expiresAt,kind,localScopeId,origin,source,verificationReceipt"
    || d.kind !== "connected-internal-beta" || !validOrigin(d.origin)
    || !/^[a-f0-9]{40}$/.test(d.source) || !/^beta-provenance:[a-f0-9]{64}$/.test(d.verificationReceipt)
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(d.localScopeId)
    || !Number.isSafeInteger(d.createdAt) || !Number.isSafeInteger(d.expiresAt) || d.expiresAt <= d.createdAt
    || d.expiresAt - d.createdAt > 7 * 86400000) throw Error("Beta identity unavailable.");
  // An expired build still opens its useful private plan. Network requests are
  // separately refused before access-store reads AND by the server clock.
  return d;
}
