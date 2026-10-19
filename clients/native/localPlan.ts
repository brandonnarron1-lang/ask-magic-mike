import { guestInterest, MAX_GUEST_INTERESTS, isRecord, type GuestInterest } from "./contracts";

/** Main supplies a protected, app-private native store (e.g. SecureStore), with
 * backup/device-lock policy and size support verified on both platforms.
 * Never substitute AsyncStorage/plaintext files or reuse staff token storage.
 */
export interface SecureStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
/** Useful guest fallback, explicitly NOT persistent or encrypted storage. */
export function sessionStore(): SecureStore {
  const values = new Map<string, string>();
  return {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
}

const KEY = "amm-r3-local-plan-v1";
export const LOCAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const sellerSteps = ["Gather property documents", "List repairs to discuss", "Compare selling paths with a human"] as const;
export type LocalPlan = { version: 1; expiresAt: number; interests: GuestInterest[]; compareIds: string[]; needs: string; sellerDone: number[] };
export const emptyPlan = (now: number): LocalPlan => ({ version: 1, expiresAt: now + LOCAL_RETENTION_MS, interests: [], compareIds: [], needs: "", sellerDone: [] });

function plain(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max && !Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
}
export function addInterest(plan: LocalPlan, kind: "property" | "search", value: string, budget: string, id: string): LocalPlan {
  if (plan.interests.length >= MAX_GUEST_INTERESTS) throw Error("Keep at most eight saved interests.");
  // Plain references only in this slice. Nothing personal is encoded in a URL,
  // fetched, enriched, sent to Ask Mike, or treated as an available listing.
  if (/\b[a-z][a-z0-9+.-]*:\/\/|^\/\//i.test(value)) throw Error("Use a plain-text property reference or area, not a link.");
  if (!id || plan.interests.some(item => item.id === id)) throw Error("Saved reference identity unavailable.");
  return { ...plan, interests: [...plan.interests, guestInterest({ kind, value, budget }, id)] };
}

/** Reconstruct via the existing canonical validator; persisted JSON is untrusted. */
export function readPlan(raw: string | null, now: number): LocalPlan {
  if (raw === null) return emptyPlan(now);
  if (raw.length > 24000) throw Error("Local data cannot be read safely.");
  const v: unknown = JSON.parse(raw);
  if (!isRecord(v) || v.version !== 1 || typeof v.expiresAt !== "number" || !Number.isFinite(v.expiresAt)) throw Error("Local data cannot be read safely.");
  if (v.expiresAt <= now) return emptyPlan(now);
  if (v.expiresAt > now + LOCAL_RETENTION_MS || !plain(v.needs, 1000) || !Array.isArray(v.interests) || v.interests.length > MAX_GUEST_INTERESTS
    || !Array.isArray(v.sellerDone) || v.sellerDone.some(i => !Number.isInteger(i) || i < 0 || i >= sellerSteps.length)
    || !Array.isArray(v.compareIds) || v.compareIds.length > 2 || v.compareIds.some(id => !plain(id, 100))
    || new Set(v.compareIds).size !== v.compareIds.length) throw Error("Local data cannot be read safely.");
  let result = { ...emptyPlan(now), expiresAt: v.expiresAt, needs: v.needs, sellerDone: [...new Set(v.sellerDone as number[])] };
  for (const item of v.interests) {
    if (!isRecord(item) || !plain(item.id, 100) || !plain(item.label, 500) || item.provenance !== "user_reported_unverified" || !isRecord(item.declared)) throw Error("Local data cannot be read safely.");
    const d = item.declared;
    if (d.kind === "search" && d.version === 1 && d.desired_area === item.label && plain(d.budget_range ?? "", 160)) {
      result = addInterest(result, "search", item.label, String(d.budget_range ?? ""), item.id);
    } else if (d.kind === "specific" && d.version === 1 && Array.isArray(d.properties) && d.properties.length === 1
      && isRecord(d.properties[0]) && d.properties[0].address_text === item.label && Object.keys(d.properties[0]).length === 1) {
      result = addInterest(result, "property", item.label, "", item.id);
    } else throw Error("Local data cannot be read safely.");
  }
  if (v.compareIds.some(id => !result.interests.some(item => item.id === id))) throw Error("Local data cannot be read safely.");
  return { ...result, compareIds: v.compareIds as string[] };
}
export async function loadPlan(store: SecureStore, now: number): Promise<LocalPlan> {
  const raw = await store.getItem(KEY);
  const plan = readPlan(raw, now);
  // Expiry is enforced on local read; this is not a background deletion promise.
  if (raw && (JSON.parse(raw) as LocalPlan).expiresAt <= now) await store.removeItem(KEY);
  return plan;
}
export async function savePlan(store: SecureStore, plan: LocalPlan, now: number): Promise<LocalPlan> {
  const checked = readPlan(JSON.stringify({ ...plan, expiresAt: now + LOCAL_RETENTION_MS }), now);
  await store.setItem(KEY, JSON.stringify(checked));
  return checked;
}
export async function deletePlan(store: SecureStore) { await store.removeItem(KEY); }
