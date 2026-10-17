import { guestInterest, MAX_GUEST_INTERESTS, type GuestInterest } from "./consumerInterests";

export type ConsumerWorkspaceSnapshot = { version: "amm.consumer-workspace.v1"; revision: number; interests: GuestInterest[]; updatedAt: string | null };
export type ConsumerProfile = { name: string; email: string; emailVerified: boolean; audience: "consumer" };

/** No user ID, role, contact, consent or arbitrary property facts in this write. */
export function readConsumerWorkspaceWrite(value: unknown): { revision: number; interests: GuestInterest[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_workspace");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !["revision", "interests"].includes(key)) || !Number.isSafeInteger(record.revision) || Number(record.revision) < 0 || Number(record.revision) >= 2_147_483_647 || !Array.isArray(record.interests) || record.interests.length > MAX_GUEST_INTERESTS) throw new Error("invalid_workspace");
  const seen = new Set<string>();
  const interests = record.interests.map(input => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_interest");
    const item = input as Record<string, unknown>;
    if (Object.keys(item).some(key => !["id", "kind", "value", "budget"].includes(key)) || typeof item.id !== "string" || !/^[0-9a-f-]{36}$/i.test(item.id) || seen.has(item.id) || !["property", "search"].includes(String(item.kind)) || typeof item.value !== "string" || typeof item.budget !== "string") throw new Error("invalid_interest");
    seen.add(item.id);
    return guestInterest({ kind: item.kind as "property" | "search", value: item.value, budget: item.budget }, item.id);
  });
  return { revision: Number(record.revision), interests };
}

export function consumerInterestWrite(items: GuestInterest[]) {
  return items.map(item => ({ id: item.id, kind: item.declared.kind === "search" ? "search" : "property", value: item.label, budget: item.declared.kind === "search" ? item.declared.budget_range || "" : "" }));
}
