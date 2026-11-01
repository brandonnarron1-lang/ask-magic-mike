import { createHash } from "node:crypto";

// Separate authority from the existing intelligence workers' draft_only_no_send.
// No lead DB, consumer transport, model call or implicit production credential.
export type Platform = "facebook" | "instagram" | "tiktok";
export type PublicationState = "draft" | "held" | "queued" | "processing" | "scheduled" | "published" | "failed" | "unknown" | "cancelled";
export interface SocialItem {
  id: string; platform: Platform; category: string; text: string; destination: string;
  sourceReferences: string[]; rights: "approved_owned"; policyVersion: string;
  assets: { url: string; sha256: string; type: "image" | "video"; alt: string }[];
  dueAt: string; aiAssisted: boolean;
  // Writing assistance is distinct from realistic synthetic/concept visual media.
  requiresAiDisclosure?: boolean;
}
export interface Channel {
  platform: Platform; id: string; accountId: string; ownerVerifiedAt: string;
  paused: boolean; automaticFormats: ("image" | "video")[];
  profileLinkVerified: boolean; disclosureVerified: boolean;
}
export interface Policy {
  version: string; masterPaused: boolean;
  brokerageAdvertisingApproval: { reference: string; scope: "owned_evergreen"; expiresAt: string } | null;
  entitlement: { plan: "Free"; verifiedAt: string; expiresAt: string; channelLimit: number; queueLimit: number; runtimeZeroCostVerified: boolean } | null;
  channels: Channel[]; allowedCategories: string[];
  caps: { channels: number; queuePerChannel: number; providerQueueHardLimit: number; createsPerRun: number; apiCallsPerRun: number; ledgerEntries: number };
}
export interface Intent {
  key: string; item: SocialItem; channelId: string; state: PublicationState;
  providerId?: string; permalink?: string; reason?: string; updatedAt: string;
}
export interface Ledger { revision: number; intents: Intent[]; masterPaused?: boolean; pausedChannels?: string[]; lease?: { token: string; until: string } }
export interface Store {
  read(): Promise<Ledger>;
  // Atomic compare-and-swap MUST be durable before any provider effect.
  compareAndSwap(expected: number, next: Ledger): Promise<boolean>;
}
export interface RemotePost { id: string; channelId: string; text: string; dueAt: string | null; status: string; assets: string[]; permalink?: string }
export interface Provider {
  // An incomplete inventory is a hard stop, never evidence of absence.
  inventory(): Promise<{ complete: boolean; posts: RemotePost[]; disconnected: string[] }>;
  create(intent: Intent): Promise<{ id: string; state: PublicationState; permalink?: string }>;
  cancel(id: string): Promise<void>;
}
export const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function intentKey(channelId: string, item: SocialItem) {
  return digest([channelId, item.id, item.dueAt, item.policyVersion]);
}
function validPublicUrl(raw: string, media = false) {
  try {
    const u = new URL(raw);
    if (u.origin !== "https://www.askmagicmike.com" || u.hash || u.username || u.password) return false;
    if (media) return /^\/social\/owned-launch-v[12]\/[a-z0-9-]+\.(jpg|mp4)$/.test(u.pathname) && !u.search;
    if (!["/home-value", "/buy", "/sell"].includes(u.pathname)) return false;
    const allowed = new Set(["seller_option", "utm_source", "utm_medium", "utm_campaign", "utm_content"]);
    const keys = [...u.searchParams.keys()];
    const offer = u.pathname === "/buy" ? "buyer" : u.pathname === "/sell" ? "compare" : "seller";
    return new Set(keys).size === keys.length && keys.every(k => allowed.has(k)) &&
      (u.pathname === "/sell" || !u.searchParams.has("seller_option")) &&
      ["facebook", "instagram", "tiktok"].includes(u.searchParams.get("utm_source") || "") &&
      u.searchParams.get("utm_medium") === "organic_social" &&
      u.searchParams.get("utm_campaign") === "amm_seller_buyer_launch_2026" &&
      u.searchParams.get("utm_content") === `${offer}_${u.searchParams.get("utm_source")}` &&
      (u.pathname !== "/sell" || u.searchParams.get("seller_option") === "compare");
  } catch { return false; }
}
export function requiresNativeAiDisclosure(item: Pick<SocialItem, "requiresAiDisclosure" | "assets">) {
  // The reviewed concept edition cannot be relabeled by omitting/clearing a
  // caller flag. Use the same decision in the policy gate and provider adapter.
  return item.requiresAiDisclosure === true || item.assets.some(asset =>
    validPublicUrl(asset.url, true) && new URL(asset.url).pathname.startsWith("/social/owned-launch-v2/"));
}
export function holdReason(policy: Policy, item: SocialItem, now: Date): string | null {
  const channel = policy.channels.find(c => c.platform === item.platform);
  if (policy.masterPaused) return "master_paused";
  if (!channel || !channel.accountId || !channel.ownerVerifiedAt || channel.paused) return "account_unverified_or_paused";
  const e = policy.entitlement, a = policy.brokerageAdvertisingApproval;
  if (!e || e.plan !== "Free" || !Number.isFinite(Date.parse(e.expiresAt)) || Date.parse(e.expiresAt) <= +now || !e.runtimeZeroCostVerified) return "zero_cost_entitlement_unverified";
  if (!a || !a.reference || a.scope !== "owned_evergreen" || !Number.isFinite(Date.parse(a.expiresAt)) || Date.parse(a.expiresAt) <= +now) return "brokerage_advertising_scope_unverified";
  if (policy.channels.length > Math.min(3, e.channelLimit, policy.caps.channels) || new Set(policy.channels.map(c => c.id)).size !== policy.channels.length) return "account_scope_invalid";
  if (item.policyVersion !== policy.version || item.rights !== "approved_owned" || !item.sourceReferences.length || !policy.allowedCategories.includes(item.category)) return "editorial_evidence_missing";
  if (!item.text.includes("Our Town Properties, Inc.") || item.text.length > 2100) return "brokerage_identification_or_caption_invalid";
  if (!validPublicUrl(item.destination) || !item.assets.length || item.assets.length > 4 || item.assets.some(a => !validPublicUrl(a.url, true) || !a.url.endsWith(a.type === "video" ? ".mp4" : ".jpg") || !/^[a-f0-9]{64}$/.test(a.sha256) || !a.alt || !channel.automaticFormats.includes(a.type))) return "media_or_destination_not_verified";
  if (new URL(item.destination).searchParams.get("utm_source") !== item.platform) return "attribution_platform_mismatch";
  if (item.platform !== "facebook" && !channel.profileLinkVerified) return "clickable_profile_destination_unverified";
  if (!channel.disclosureVerified) return "required_disclosure_unverified";
  const unsupportedLabel = item.platform === "facebook" || (item.platform === "tiktok" && item.assets.some(a => a.type !== "video"));
  if (requiresNativeAiDisclosure(item) && unsupportedLabel) return "native_ai_disclosure_required_for_this_format";
  if (!Number.isFinite(Date.parse(item.dueAt)) || Date.parse(item.dueAt) < +now + 60_000 || Date.parse(item.dueAt) > +now + 8 * 86400_000) return "schedule_outside_window";
  return null;
}
function matchingPost(intent: Intent, p: RemotePost) {
  return p.channelId === intent.channelId && p.text === intent.item.text && p.dueAt === intent.item.dueAt &&
    JSON.stringify(p.assets) === JSON.stringify(intent.item.assets.map(a => a.url));
}
function remoteState(p: RemotePost): PublicationState {
  if (p.status === "sent") return "published";
  if (["buffer", "scheduled"].includes(p.status)) return "scheduled";
  if (p.status === "error") return "failed";
  if (p.status === "draft") return "draft";
  return "processing";
}
async function update(store: Store, key: string, apply: (i: Intent) => Intent) {
  // Bounded CAS retry only for local ledger writes, NEVER provider mutations.
  for (let n = 0; n < 3; n++) {
    const old = await store.read();
    if (await store.compareAndSwap(old.revision, { ...old, revision: old.revision + 1, intents: old.intents.map(i => i.key === key ? apply(i) : i) })) return;
  }
  throw new Error("ledger_concurrent_update_stop");
}
export async function replenish(options: { policy: Policy; items: SocialItem[]; store: Store; provider: Provider; now: Date }) {
  const old = await options.store.read();
  if (old.lease && Date.parse(old.lease.until) > +options.now) throw new Error("publisher_already_running");
  const token = digest([options.now.toISOString(), Math.random()]);
  const lease = { token, until: new Date(+options.now + 10 * 60_000).toISOString() };
  if (!(await options.store.compareAndSwap(old.revision, { ...old, revision: old.revision + 1, lease }))) throw new Error("publisher_lease_conflict");
  try { return await replenishLocked(options, token); }
  finally {
    const current = await options.store.read();
    if (current.lease?.token === token) await options.store.compareAndSwap(current.revision, { ...current, revision: current.revision + 1, lease: undefined });
  }
}
async function replenishLocked(options: { policy: Policy; items: SocialItem[]; store: Store; provider: Provider; now: Date }, token: string) {
  const { policy, items, store, provider, now } = options;
  const result = { created: 0, reconciled: 0, held: [] as string[], weeklyReviewDue: now.getUTCDay() === 1 };
  // No external calls at all when globally paused.
  if (policy.masterPaused) { result.held.push("master_paused"); return result; }
  const eligible = items.filter(item => !holdReason(policy, item, now));
  if (!eligible.length) {
    result.held.push(...items.map(item => `${item.id}:${item.platform}:${holdReason(policy, item, now)}`));
    return result;
  }
  if (existingPause(await store.read())) { result.held.push("durable_operator_pause"); return result; }
  const inventory = await provider.inventory();
  if (!inventory.complete) throw new Error("inventory_incomplete_no_publish");
  const existing = await store.read();
  for (const intent of existing.intents) {
    if (!["processing", "unknown", "scheduled"].includes(intent.state)) continue;
    const matches = inventory.posts.filter(p => intent.providerId ? p.id === intent.providerId && p.channelId === intent.channelId : matchingPost(intent, p));
    if (matches.length === 1) {
      const p = matches[0];
      if (!matchingPost(intent, p)) {
        await update(store, intent.key, i => ({ ...i, state: "unknown", reason: "remote_content_slot_or_media_changed", updatedAt: new Date().toISOString() }));
        result.held.push(`${intent.item.platform}:remote_intent_conflict`);
        continue;
      }
      await update(store, intent.key, i => ({ ...i, providerId: p.id, state: remoteState(p), permalink: p.permalink, updatedAt: now.toISOString() }));
      result.reconciled++;
    } else if (intent.state === "processing") {
      // A crash after persisted intent may have reached Buffer. Absence in one
      // snapshot is NOT proof of non-acceptance. Never automatically replay.
      await update(store, intent.key, i => ({ ...i, state: "unknown", reason: "ambiguous_create_requires_reconciliation", updatedAt: now.toISOString() }));
    }
  }
  for (const item of items.slice(0, 21)) {
    const reason = holdReason(policy, item, new Date());
    if (reason) { result.held.push(`${item.id}:${item.platform}:${reason}`); continue; }
    const channel = policy.channels.find(c => c.platform === item.platform)!;
    if (inventory.disconnected.includes(channel.id)) { result.held.push(`${channel.platform}:authorization_revoked`); continue; }
    const old = await store.read(), key = intentKey(channel.id, item);
    if (old.lease?.token !== token || Date.parse(old.lease.until) <= Date.now()) throw new Error("publisher_lease_lost");
    if (old.masterPaused) { result.held.push("durable_operator_pause"); break; }
    if (old.pausedChannels?.includes(channel.id)) { result.held.push(`${channel.platform}:durable_channel_pause`); continue; }
    if (old.intents.some(i => i.channelId === channel.id && ["unknown", "processing"].includes(i.state))) { result.held.push(`${channel.platform}:unresolved_provider_result`); continue; }
    if (old.intents.some(i => i.key === key || (i.channelId === channel.id && (i.item.id === item.id || i.item.dueAt === item.dueAt)))) continue;
    const remoteAtSlot = inventory.posts.filter(p => p.channelId === channel.id && p.dueAt === item.dueAt && p.status !== "error");
    if (remoteAtSlot.length) { result.held.push(`${channel.platform}:remote_slot_occupied_reconcile_before_create`); continue; }
    // Account-level remote occupancy includes posts created outside this runner.
    const count = inventory.posts.filter(p => p.channelId === channel.id && !["sent", "error", "draft"].includes(p.status)).length;
    const cap = Math.min(7, policy.caps.queuePerChannel, policy.caps.providerQueueHardLimit, policy.entitlement!.queueLimit);
    if (count >= cap || result.created >= Math.min(3, policy.caps.createsPerRun)) { result.held.push(`${channel.platform}:run_or_queue_cap`); continue; }
    if (old.intents.length >= Math.min(1000, policy.caps.ledgerEntries)) throw new Error("ledger_capacity_manual_archive_required");
    const intent: Intent = { key, item, channelId: channel.id, state: "processing", updatedAt: now.toISOString() };
    if (!(await store.compareAndSwap(old.revision, { ...old, revision: old.revision + 1, intents: [...old.intents, intent] }))) { result.held.push("concurrent_run_stop"); break; }
    try {
      const fresh = await store.read(), freshReason = holdReason(policy, item, new Date());
      if (freshReason || fresh.masterPaused || fresh.pausedChannels?.includes(channel.id) || fresh.lease?.token !== token || Date.parse(fresh.lease.until) <= Date.now()) {
        await update(store, key, i => ({ ...i, state: "held", reason: freshReason || "pause_or_lease_changed_before_create", updatedAt: new Date().toISOString() }));
        result.held.push(`${channel.platform}:fresh_pre_effect_hold`); continue;
      }
      const response = await provider.create(intent);
      if (!response.id || !["scheduled", "processing", "published"].includes(response.state)) throw new Error("provider_acceptance_not_established");
      await update(store, key, i => ({ ...i, providerId: response.id, state: response.state, permalink: response.permalink, updatedAt: now.toISOString() }));
      inventory.posts.push({ id: response.id, channelId: channel.id, text: item.text, dueAt: item.dueAt, status: "scheduled", assets: item.assets.map(a => a.url) });
      result.created++;
    } catch {
      await update(store, key, i => ({ ...i, state: "unknown", reason: "provider_result_unknown_do_not_retry", updatedAt: now.toISOString() }));
      result.held.push(`${channel.platform}:provider_result_unknown`);
      break;
    }
  }
  const final = await store.read();
  if (!result.created && !result.held.length && final.intents.every(i => ["published", "cancelled", "failed"].includes(i.state))) result.held.push("content_exhausted_review_backlog_before_reuse");
  return result;
}
function existingPause(ledger: Ledger) { return ledger.masterPaused === true; }
export async function pausePublisher(store: Store, channelId?: string) {
  for (let n = 0; n < 3; n++) {
    const old = await store.read();
    const next = channelId ? { ...old, pausedChannels: [...new Set([...(old.pausedChannels || []), channelId])] } : { ...old, masterPaused: true };
    if (await store.compareAndSwap(old.revision, { ...next, revision: old.revision + 1 })) return;
  }
  throw new Error("pause_checkpoint_conflict_stop");
}
// Master pause must be saved first. This separately removes OUR remote queued
// posts. It never deletes a published post or another actor's untracked content.
export async function cancelQueued(store: Store, provider: Provider, channelId?: string) {
  await pausePublisher(store, channelId);
  const state = await store.read();
  if (state.lease && Date.parse(state.lease.until) > Date.now()) throw new Error("paused_wait_for_inflight_runner_before_remote_cancel");
  const inventory = await provider.inventory();
  if (!inventory.complete) throw new Error("inventory_incomplete_no_cancel");
  const old = await store.read(); let cancelled = 0; const unresolved: string[] = [];
  for (const i of old.intents) {
    if (channelId && i.channelId !== channelId) continue;
    const matches = inventory.posts.filter(p => i.providerId ? p.id === i.providerId && p.channelId === i.channelId : matchingPost(i, p));
    if (matches.length !== 1) {
      if (["unknown", "processing", "scheduled"].includes(i.state)) unresolved.push(i.key);
      continue;
    }
    if (!["buffer", "scheduled", "draft"].includes(matches[0].status)) {
      if (matches[0].status === "sending") unresolved.push(i.key);
      continue;
    }
    await provider.cancel(matches[0].id);
    await update(store, i.key, value => ({ ...value, state: "cancelled", reason: "operator_pause_remote_cancel", updatedAt: new Date().toISOString() }));
    cancelled++;
  }
  if (unresolved.length) throw new Error(`remote_pause_incomplete_unresolved_intents:${unresolved.length}:confirmed_cancelled:${cancelled}`);
  return cancelled;
}
/** Civil noon avoids DST transition ambiguity; timestamps are derived per day,
 * not by adding 24h to a prior UTC slot. Never claims a future post is scheduled. */
export function easternNoon(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid_date");
  const probe = new Date(`${date}T12:00:00Z`);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(probe));
  return new Date(+probe + (12 - hour) * 3600_000).toISOString();
}
