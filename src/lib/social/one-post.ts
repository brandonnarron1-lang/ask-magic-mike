import { holdReason, type Ledger, type Policy, type SocialItem } from "./publisher";
import type { Inventory } from "./operations";

interface OnePost {
  id: string; category: string; text: string; destination: string;
  asset: string; sha256: string; alt: string;
}
interface ManifestFile { name: string; sha256: string; bytes: number; width?: number; height?: number }

// Explicit manual selection only. Never imported into the recurring catalogue.
// This is content preparation, not authority, current entitlement or a booking.
export function buildOnePost(catalogue: { version: string; posts: OnePost[] }, manifest: { files: ManifestFile[] }, id: string, at: string): SocialItem {
  if (catalogue.version !== "amm.owned-social.one-posts.v1") throw Error("one_post_catalogue_unreviewed");
  const matches = catalogue.posts.filter(p => p.id === id);
  if (matches.length !== 1) throw Error("one_post_identity_not_unique");
  const post = matches[0];
  if (!/^[0-9]{2}-[a-z0-9-]+$/.test(id) || post.asset !== `${id}-feed.jpg` || !/^[a-f0-9]{64}$/.test(post.sha256)) throw Error("one_post_asset_invalid");
  const files = manifest.files.filter(f => f.name === post.asset);
  if (files.length !== 1 || files[0].sha256 !== post.sha256 || files[0].bytes <= 0 || files[0].width !== 1080 || files[0].height !== 1350) throw Error("one_post_manifest_mismatch");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(at) || !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at.replace(/Z$/, at.includes(".") ? "Z" : ".000Z")) throw Error("one_post_explicit_utc_time_required");
  return {
    id, platform: "instagram", category: post.category, text: post.text, destination: post.destination,
    sourceReferences: ["config/owned-social-one-posts.json", "public/social/owned-launch-v2/asset-manifest.json"],
    rights: "approved_owned", policyVersion: "amm.owned-social.v1", aiAssisted: true, requiresAiDisclosure: true,
    dueAt: new Date(at).toISOString(),
    assets: [{ url: `https://www.askmagicmike.com/social/owned-launch-v2/${post.asset}`, sha256: post.sha256, type: "image", alt: post.alt }],
  };
}

// Unlike recurring plan(), NEVER chooses a next slot or changes the supplied time.
// The existing replenish() still owns the lease, fresh checks, CAS and effects.
export function selectOnePost(policy: Policy, item: SocialItem, ledger: Ledger, inventory: Inventory, now: Date) {
  const channel = policy.channels.find(c => c.platform === item.platform);
  const used = ledger.intents.some(i => i.channelId === channel?.id && i.item.id === item.id);
  const hold = holdReason(policy, item, now)
    || (!inventory.complete ? "inventory_incomplete_no_publish" : null)
    || (ledger.masterPaused || ledger.pausedChannels?.includes(channel?.id || "") ? "durable_operator_pause" : null)
    || (inventory.disconnected.includes(channel?.id || "") ? "authorization_revoked" : null)
    || (ledger.intents.some(i => i.channelId === channel?.id && ["unknown", "processing"].includes(i.state)) ? "unresolved_provider_result" : null)
    || (used ? "one_post_already_reserved" : null)
    || (ledger.intents.some(i => i.channelId === channel?.id && i.item.dueAt === item.dueAt) ? "ledger_slot_already_reserved" : null)
    || (inventory.posts.some(p => p.channelId === channel?.id && p.text === item.text && JSON.stringify(p.assets) === JSON.stringify(item.assets.map(a => a.url))) ? "remote_content_already_present" : null)
    || (inventory.posts.some(p => p.channelId === channel?.id && p.dueAt === item.dueAt && p.status !== "error") ? "remote_slot_occupied_reconcile_before_create" : null)
    || (inventory.posts.filter(p => p.channelId === channel?.id && !["sent", "error", "draft"].includes(p.status)).length >= Math.min(7, policy.caps.queuePerChannel, policy.caps.providerQueueHardLimit, policy.entitlement?.queueLimit || 0) ? "run_or_queue_cap" : null);
  return { selected: hold ? [] : [item], held: hold ? [`${item.id}:instagram:${hold}`] : [], remainingUnused: used ? 0 : 1 };
}
