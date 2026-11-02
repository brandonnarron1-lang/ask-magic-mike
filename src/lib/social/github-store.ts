import type { Ledger, Store } from "./publisher";

export function assertPublicLedger(value: unknown): asserts value is Ledger {
  const object = (v: unknown, fields: string[]) => {
    if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).some(k => !fields.includes(k))) throw Error("public_ledger_schema_rejected");
    return v as Record<string, unknown>;
  };
  const text = (v: unknown, max = 2100) => typeof v === "string" && v.length > 0 && v.length <= max && !/[\u0000-\u0008]/.test(v);
  const stamp = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
  const s = object(value, ["revision", "intents", "incidents", "masterPaused", "pausedChannels", "lease", "effectBudget", "health"]);
  if (!Number.isInteger(s.revision) || Number(s.revision) < 0 || !Array.isArray(s.intents) || s.intents.length > 1000) throw Error("public_ledger_schema_rejected");
  if (s.masterPaused !== undefined && typeof s.masterPaused !== "boolean") throw Error("public_ledger_schema_rejected");
  if (s.pausedChannels !== undefined && (!Array.isArray(s.pausedChannels) || s.pausedChannels.length > 3 || !s.pausedChannels.every(v => text(v, 100)))) throw Error("public_ledger_schema_rejected");
  if (s.lease !== undefined) { const l = object(s.lease, ["token", "until"]); if (!text(l.token, 100) || !stamp(l.until)) throw Error("public_ledger_schema_rejected"); }
  if (s.effectBudget !== undefined) { const b = object(s.effectBudget, ["ownerToken", "until"]); if (!text(b.ownerToken, 100) || !stamp(b.until)) throw Error("public_ledger_schema_rejected"); }
  if (s.health !== undefined) { const h = object(s.health, ["lastStart", "lastObservation", "lastReconciliation", "lastPublication", "lastCompleted", "trigger", "nextExpected"]); if (!["manual", "scheduled"].includes(String(h.trigger)) || !stamp(h.lastObservation) || !stamp(h.lastReconciliation) || ["lastStart", "lastPublication", "lastCompleted", "nextExpected"].some(k => h[k] !== undefined && !stamp(h[k]))) throw Error("public_ledger_schema_rejected"); }
  for (const raw of s.intents) {
    const i = object(raw, ["key", "item", "channelId", "state", "providerId", "permalink", "reason", "updatedAt", "attemptedAt"]);
    const item = object(i.item, ["id", "platform", "category", "text", "destination", "sourceReferences", "rights", "policyVersion", "assets", "dueAt", "aiAssisted", "requiresAiDisclosure"]);
    if (!text(i.key, 100) || !text(i.channelId, 100) || !stamp(i.updatedAt) || (i.attemptedAt !== undefined && !stamp(i.attemptedAt)) || !["draft", "held", "queued", "processing", "scheduled", "published", "failed", "unknown", "cancelled"].includes(String(i.state))) throw Error("public_ledger_schema_rejected");
    if (i.reason !== undefined && !/^[a-z0-9_:.-]{1,150}$/.test(String(i.reason))) throw Error("public_ledger_private_text_rejected");
    if (i.providerId !== undefined && !text(i.providerId, 200)) throw Error("public_ledger_schema_rejected");
    if (i.permalink !== undefined) { const p = new URL(String(i.permalink)); if (p.protocol !== "https:" || !["www.facebook.com", "www.instagram.com", "www.tiktok.com"].includes(p.hostname) || p.username || p.password || p.hash) throw Error("public_ledger_private_url_rejected"); }
    if (!text(item.id, 100) || !text(item.text) || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(String(item.text)) || item.rights !== "approved_owned" || !["facebook", "instagram", "tiktok"].includes(String(item.platform)) || !stamp(item.dueAt) || typeof item.aiAssisted !== "boolean") throw Error("public_ledger_private_text_rejected");
    if (!Array.isArray(item.sourceReferences) || item.sourceReferences.length > 10 || !item.sourceReferences.every(v => typeof v === "string" && /^(config|public|docs)\/[a-zA-Z0-9/_.-]{1,180}$/.test(v) && !v.includes(".."))) throw Error("public_ledger_private_reference_rejected");
    const destination = new URL(String(item.destination));
    if (destination.origin !== "https://www.askmagicmike.com" || !["/home-value", "/buy", "/sell"].includes(destination.pathname) || destination.hash || destination.username || destination.password || [...destination.searchParams.keys()].some(k => !["seller_option", "utm_source", "utm_medium", "utm_campaign", "utm_content"].includes(k)) || [...destination.searchParams.values()].some(v => !/^[a-z0-9_]{1,80}$/.test(v))) throw Error("public_ledger_private_url_rejected");
    if (!Array.isArray(item.assets) || item.assets.length > 4 || !item.assets.length) throw Error("public_ledger_schema_rejected");
    for (const rawAsset of item.assets) { const a = object(rawAsset, ["url", "sha256", "type", "alt"]); if (!/^https:\/\/www\.askmagicmike\.com\/social\/owned-launch-v[12]\/[a-z0-9-]+\.(jpg|mp4)$/.test(String(a.url)) || !/^[a-f0-9]{64}$/.test(String(a.sha256)) || !["image", "video"].includes(String(a.type)) || !text(a.alt, 1000)) throw Error("public_ledger_private_media_rejected"); }
  }
  if (s.incidents !== undefined) {
    if (!Array.isArray(s.incidents) || s.incidents.length > 1000) throw Error("public_ledger_schema_rejected");
    for (const raw of s.incidents) { const i = object(raw, ["id", "code", "channelId", "firstSeen", "lastSeen", "acknowledgedAt", "nextRecheckAt", "resolvedAt"]); if (!/^[a-f0-9]{64}$/.test(String(i.id)) || !/^[a-z0-9_:.-]{1,150}$/.test(String(i.code)) || !text(i.channelId, 100) || !stamp(i.firstSeen) || !stamp(i.lastSeen) || !stamp(i.nextRecheckAt) || (i.acknowledgedAt !== undefined && !stamp(i.acknowledgedAt)) || (i.resolvedAt !== undefined && !stamp(i.resolvedAt))) throw Error("public_ledger_schema_rejected"); }
  }
}

// Non-sensitive durable publication intents only. Never credentials, contacts,
// drafts about customers, media blobs or the consumer/notification outbox.
// The separate ref must exist and its Vercel Git builds must be disabled BEFORE
// provisioning it. A missing ledger is a hard stop, never an implicit new queue.
export class GitHubLedgerStore implements Store {
  private sha: string | null = null;
  private revision: number | null = null;
  private token: string; private transport: typeof fetch;
  constructor(token: string, transport: typeof fetch = fetch) {
    this.token = token; this.transport = transport;
    if (!token) throw new Error("github_state_credential_missing");
  }
  private endpoint = "https://api.github.com/repos/brandonnarron1-lang/ask-magic-mike/contents/owned-social-ledger.json";
  private headers() { return { Authorization: `Bearer ${this.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }; }
  async read(): Promise<Ledger> {
    const r = await this.transport(`${this.endpoint}?ref=codex%2Fowned-social-publication-state`, { headers: this.headers(), redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error("durable_social_ledger_unavailable");
    const d = await r.json();
    if (d.encoding !== "base64" || typeof d.content !== "string" || d.size > 750_000 || !d.sha) throw new Error("durable_social_ledger_invalid");
    const ledger = JSON.parse(Buffer.from(d.content, "base64").toString("utf8"));
    assertPublicLedger(ledger);
    this.sha = d.sha; this.revision = ledger.revision; return ledger;
  }
  async compareAndSwap(expected: number, next: Ledger) {
    if (!this.sha || this.revision !== expected || next.revision !== expected + 1) return false;
    assertPublicLedger(next);
    const raw = JSON.stringify(next);
    if (Buffer.byteLength(raw) > 750_000) throw new Error("durable_social_ledger_full");
    const r = await this.transport(this.endpoint, { method: "PUT", headers: { ...this.headers(), "Content-Type": "application/json" }, redirect: "error", body: JSON.stringify({ message: "chore(social): checkpoint bounded publication state", branch: "codex/owned-social-publication-state", sha: this.sha, content: Buffer.from(raw).toString("base64") }), signal: AbortSignal.timeout(15_000) });
    if (r.status === 409 || r.status === 422) return false;
    if (!r.ok) throw new Error("durable_social_checkpoint_unconfirmed");
    this.sha = null; this.revision = null; return true;
  }
}
