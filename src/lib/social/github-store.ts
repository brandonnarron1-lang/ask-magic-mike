import type { Ledger, Store } from "./publisher";

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
    if (!Number.isInteger(ledger.revision) || !Array.isArray(ledger.intents) || ledger.intents.length > 1000) throw new Error("durable_social_ledger_invalid");
    this.sha = d.sha; this.revision = ledger.revision; return ledger;
  }
  async compareAndSwap(expected: number, next: Ledger) {
    if (!this.sha || this.revision !== expected || next.revision !== expected + 1) return false;
    const raw = JSON.stringify(next);
    if (Buffer.byteLength(raw) > 750_000) throw new Error("durable_social_ledger_full");
    const r = await this.transport(this.endpoint, { method: "PUT", headers: { ...this.headers(), "Content-Type": "application/json" }, redirect: "error", body: JSON.stringify({ message: "chore(social): checkpoint bounded publication state", branch: "codex/owned-social-publication-state", sha: this.sha, content: Buffer.from(raw).toString("base64") }), signal: AbortSignal.timeout(15_000) });
    if (r.status === 409 || r.status === 422) return false;
    if (!r.ok) throw new Error("durable_social_checkpoint_unconfirmed");
    this.sha = null; this.revision = null; return true;
  }
}
