import { digest, easternNoon, holdReason, intentKey, type Intent, type Ledger, type Policy, type Provider, type RemotePost, type SocialItem, type Store } from "./publisher";

export type Inventory = Awaited<ReturnType<Provider["inventory"]>>;
export type Outcome = "completed" | "no_work" | "deferred" | "policy_hold" | "incident" | "unknown";
export interface Incident {
  id: string; code: string; channelId: string; firstSeen: string; lastSeen: string;
  acknowledgedAt?: string; nextRecheckAt: string; resolvedAt?: string;
}
// Observation never writes the ledger or publishes. A publication pause does
// not turn an existing scheduled/ambiguous publication into unobservable work.
export async function observe(provider: Provider): Promise<Inventory> {
  const inventory = await provider.inventory();
  if (!inventory.complete) throw Error("inventory_incomplete_no_publish");
  return inventory;
}
export function matches(intent: Intent, post: RemotePost) {
  return post.channelId === intent.channelId && post.text === intent.item.text &&
    post.dueAt === intent.item.dueAt && JSON.stringify(post.assets) === JSON.stringify(intent.item.assets.map(a => a.url));
}
export function reconcileSnapshot(ledger: Ledger, inventory: Inventory, now: Date): Ledger {
  if (!inventory.complete) throw Error("inventory_incomplete_no_reconcile");
  return { ...ledger, intents: ledger.intents.map(intent => {
    if (!["processing", "unknown", "scheduled", "queued", "draft"].includes(intent.state)) return intent;
    const found = inventory.posts.filter(p => intent.providerId ? p.id === intent.providerId && p.channelId === intent.channelId : matches(intent, p));
    if (found.length === 1 && matches(intent, found[0])) {
      const p = found[0];
      const state = p.status === "sent" ? "published" : p.status === "error" ? "failed" : p.status === "draft" ? "draft" : ["buffer", "scheduled"].includes(p.status) ? "scheduled" : "processing";
      return { ...intent, attemptedAt: intent.attemptedAt || intent.updatedAt, providerId: p.id, state, permalink: p.permalink, reason: undefined, updatedAt: now.toISOString() } as Intent;
    }
    // Missing scheduled items may have published outside the inventory's retained
    // window. Never silently count them as published, cancelled or reusable.
    return { ...intent, attemptedAt: intent.attemptedAt || intent.updatedAt, state: "unknown", reason: found.length ? "remote_content_slot_or_media_changed" : "remote_outcome_not_established", updatedAt: now.toISOString() } as Intent;
  }) };
}
export async function reconcile(store: Store, inventory: Inventory, now: Date) {
  const old = await store.read();
  if (old.lease && Date.parse(old.lease.until) > +now) throw Error("publisher_already_running");
  const next = reconcileSnapshot(old, inventory, now);
  next.health = { ...old.health, lastObservation: now.toISOString(), lastReconciliation: now.toISOString(), trigger: "manual" };
  if (!(await store.compareAndSwap(old.revision, { ...next, revision: old.revision + 1 }))) throw Error("reconciliation_conflict_stop");
  return next;
}
function civilDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
/** Pure planning. The catalogue's placeholder dates are not an instruction to
 * move used work. Occupancy includes independently observed native posts. */
export function plan(policy: Policy, catalogue: SocialItem[], ledger: Ledger, inventory: Inventory, now: Date) {
  if (!inventory.complete) throw Error("inventory_incomplete_no_plan");
  if (catalogue.length > 300) throw Error("catalogue_bound_exceeded");
  const selected: SocialItem[] = [], held: string[] = [];
  if (policy.masterPaused) held.push("master_paused");
  if (!policy.channels.length) held.push("account_scope_unverified");
  const perChannel = new Map<string, SocialItem[]>();
  for (const channel of policy.channels) {
    const candidates: SocialItem[] = [];
    perChannel.set(channel.id, candidates);
    if (ledger.masterPaused || ledger.pausedChannels?.includes(channel.id)) { held.push(`${channel.platform}:durable_operator_pause`); continue; }
    if (inventory.disconnected.includes(channel.id)) { held.push(`${channel.platform}:authorization_revoked`); continue; }
    if (ledger.intents.some(i => i.channelId === channel.id && ["unknown", "processing"].includes(i.state))) { held.push(`${channel.platform}:unresolved_provider_result`); continue; }
    const remote = inventory.posts.filter(p => p.channelId === channel.id);
    const occupancy = remote.filter(p => !["sent", "error", "draft"].includes(p.status)).length;
    const capacity = Math.max(0, Math.min(7, policy.caps.queuePerChannel, policy.caps.providerQueueHardLimit, policy.entitlement?.queueLimit ?? 0) - occupancy);
    const occupied = new Set([...remote.filter(p => p.status !== "error").map(p => p.dueAt), ...ledger.intents.filter(i => i.channelId === channel.id).map(i => i.item.dueAt)]);
    for (const source of catalogue.filter(i => i.platform === channel.platform)) {
      // A used content ID is not recycled because its date/policy changed.
      if (ledger.intents.some(i => i.channelId === channel.id && i.item.id === source.id)) continue;
      if (remote.some(p => p.text === source.text && JSON.stringify(p.assets) === JSON.stringify(source.assets.map(a => a.url)))) continue;
      if (candidates.length >= capacity) { held.push(`${channel.platform}:queue_full`); break; }
      let dueAt: string | undefined;
      for (let offset = 0; offset <= 8; offset++) {
        const d = new Date(civilDay(now) + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + offset);
        const slot = easternNoon(d.toISOString().slice(0, 10));
        if (Date.parse(slot) >= +now + 60_000 && Date.parse(slot) <= +now + 8 * 86400_000 && !occupied.has(slot)) { dueAt = slot; break; }
      }
      if (!dueAt) { held.push(`${channel.platform}:schedule_window_full`); break; }
      const item = { ...source, dueAt };
      const reason = holdReason(policy, item, now);
      if (reason) { held.push(`${source.id}:${channel.platform}:${reason}`); continue; }
      occupied.add(dueAt); candidates.push(item);
    }
  }
  // Rotate the first channel by the last actual intent. A full/held channel
  // cannot consume another channel's execution allowance.
  const channels = [...policy.channels];
  const last = ledger.intents.at(-1)?.channelId;
  const start = last ? (channels.findIndex(c => c.id === last) + 1) % Math.max(1, channels.length) : 0;
  const order = [...channels.slice(start), ...channels.slice(0, start)];
  const cap = Math.min(3, policy.caps.createsPerRun);
  while (selected.length < cap) {
    let progress = false;
    for (const c of order) { const item = perChannel.get(c.id)?.shift(); if (item && selected.length < cap) { selected.push(item); progress = true; } }
    if (!progress) break;
  }
  return { selected, held: [...new Set(held)], remainingUnused: catalogue.filter(i => !ledger.intents.some(v => v.item.id === i.id && v.item.platform === i.platform)).length,
    intentKeys: selected.map(i => intentKey(policy.channels.find(c => c.platform === i.platform)!.id, i)) };
}
export function classify(code: string): Outcome {
  if (/unknown|unresolved|ambiguous|not_established/.test(code)) return "unknown";
  if (/revoked|incomplete|conflict|credential|ledger|provider_result|unavailable/.test(code)) return "incident";
  if (/queue_full|queue_cap|run_or|window_full|shared_.*_cap/.test(code)) return "deferred";
  return "policy_hold";
}
export function checkpointIncidents(previous: Incident[], findings: { code: string; channelId: string }[], now: Date, complete = true) {
  const active = new Set(findings.map(f => digest([f.channelId, f.code]))), notify: string[] = [];
  const next = previous.map(i => ({ ...i }));
  for (const finding of findings) {
    const id = digest([finding.channelId, finding.code]);
    const existing = next.find(i => i.id === id);
    if (!existing) { next.push({ id, ...finding, firstSeen: now.toISOString(), lastSeen: now.toISOString(), nextRecheckAt: new Date(+now + 86400_000).toISOString() }); notify.push(id); }
    else {
      if (existing.resolvedAt) notify.push(id);
      existing.lastSeen = now.toISOString(); existing.resolvedAt = undefined;
      if (notify.includes(id)) existing.nextRecheckAt = new Date(+now + 86400_000).toISOString();
    }
  }
  // Failed/partial observation must not resolve an existing incident.
  if (complete) for (const i of next) if (!active.has(i.id) && !i.resolvedAt) { i.resolvedAt = now.toISOString(); notify.push(i.id); }
  return { incidents: next, notify };
}
export async function acknowledgeIncident(store: Store, id: string, now: Date) {
  const old = await store.read();
  if (!old.incidents?.some(i => i.id === id)) throw Error("incident_not_found");
  if (!(await store.compareAndSwap(old.revision, { ...old, revision: old.revision + 1, incidents: old.incidents.map(i => i.id === id ? { ...i, acknowledgedAt: now.toISOString() } : i) }))) throw Error("incident_acknowledgement_conflict");
}
