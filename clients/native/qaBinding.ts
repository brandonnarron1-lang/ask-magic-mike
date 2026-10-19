import type { VerifiedLocalLoopbackQa } from "./nativeHttp";

/** Public synthetic test descriptor, NOT a credential or a server authority.
 * The runner independently verifies fresh local PostgreSQL before embedding it.
 * Default builds are disconnected. No arbitrary endpoint or Production fallback.
 */
export function localQaBinding(raw: string | undefined, platform: string, now = Date.now()): VerifiedLocalLoopbackQa | undefined {
  if (!raw) return undefined;
  if (raw.length > 1500 || !["ios", "android"].includes(platform)) throw Error("Local QA binding unavailable.");
  const v: unknown = JSON.parse(raw);
  if (!v || typeof v !== "object" || Array.isArray(v)) throw Error("Local QA binding unavailable.");
  const d = v as Record<string, unknown>;
  if (Object.keys(d).sort().join() !== "androidOrigin,expiresAt,iosOrigin,kind,localScopeId,verificationReceipt"
    || d.kind !== "verified-local-loopback" || typeof d.iosOrigin !== "string" || typeof d.androidOrigin !== "string"
    || typeof d.verificationReceipt !== "string" || !/^local-postgres:[a-f0-9]{64}$/.test(d.verificationReceipt)
    || typeof d.localScopeId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.localScopeId)
    || typeof d.expiresAt !== "number" || d.expiresAt <= now || d.expiresAt > now + 6 * 3600000) throw Error("Local QA binding unavailable.");
  const ios = new URL(d.iosOrigin), android = new URL(d.androidOrigin);
  if (ios.protocol !== "http:" || android.protocol !== "http:" || ios.hostname !== "127.0.0.1" || android.hostname !== "10.0.2.2"
    || ios.origin !== d.iosOrigin || android.origin !== d.androidOrigin || ios.username || ios.password || android.username || android.password
    || ios.port !== android.port || Number(ios.port) < 1024 || Number(ios.port) > 65535) throw Error("Local QA binding unavailable.");
  return { kind: "verified-local-loopback", platform: platform as "ios" | "android", origin: platform === "ios" ? d.iosOrigin : d.androidOrigin,
    localScopeId: d.localScopeId, verificationReceipt: d.verificationReceipt, expiresAt: d.expiresAt };
}
