// @vitest-environment node
import { execFileSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkpointIncidents, classify, observe, plan, reconcile, type Inventory } from "../../src/lib/social/operations";
import { easternNoon, holdReason, replenish, type Intent, type Ledger, type Policy, type Provider, type SocialItem, type Store } from "../../src/lib/social/publisher";
import { assertPublicLedger } from "../../src/lib/social/github-store";

const now = new Date("2026-11-01T20:00:00Z");
const item: SocialItem = { id: "01", platform: "instagram", category: "existing_offer", text: "Request human guidance. Our Town Properties, Inc.", destination: "https://www.askmagicmike.com/home-value?utm_source=instagram&utm_medium=organic_social&utm_campaign=amm_seller_buyer_launch_2026&utm_content=seller_instagram", sourceReferences: ["config/experience-contract.v1.json"], rights: "approved_owned", policyVersion: "test", dueAt: easternNoon("2026-11-02"), aiAssisted: true, assets: [{ url: "https://www.askmagicmike.com/social/owned-launch-v2/test.jpg", type: "image", sha256: "a".repeat(64), alt: "Illustrative brand scene, not a listing." }] };
const policy = (): Policy => ({ version: "test", masterPaused: false, brokerageAdvertisingApproval: { reference: "synthetic-policy", scope: "owned_evergreen", expiresAt: "2026-12-01T00:00:00Z" }, entitlement: { plan: "Free", verifiedAt: now.toISOString(), expiresAt: "2026-12-01T00:00:00Z", channelLimit: 3, queueLimit: 10, runtimeZeroCostVerified: true }, channels: [{ platform: "instagram", id: "synthetic-instagram", accountId: "synthetic-account", ownerVerifiedAt: now.toISOString(), paused: false, automaticFormats: ["image", "video"], profileLinkVerified: true, disclosureVerified: true, capability: { evidence: "synthetic-only", observedAt: now.toISOString(), recheckAfter: "2026-12-01T00:00:00Z", status: "verified", destinationPaths: ["/home-value"] } }], allowedCategories: ["existing_offer"], caps: { channels: 3, queuePerChannel: 7, providerQueueHardLimit: 10, createsPerRun: 3, apiCallsPerRun: 50, ledgerEntries: 1000 } });
const inventory = (): Inventory => ({ complete: true, posts: [], disconnected: [] });
class Memory implements Store {
  value: Ledger = { revision: 0, intents: [] };
  async read() { return structuredClone(this.value); }
  async compareAndSwap(revision: number, next: Ledger) { if (revision !== this.value.revision) return false; this.value = structuredClone(next); return true; }
}
const used = (n: number): Intent => ({ key: String(n), channelId: "synthetic-instagram", item: { ...item, id: String(n).padStart(2, "0"), dueAt: easternNoon("2026-10-" + String(n + 10)) }, state: "published", updatedAt: "2026-10-31T00:00:00Z" });
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());
describe("Repeatable campaign operations, synthetic only and no delivery", () => {
  it("selects finished backlog after all original seven concepts were used", () => {
    const ledger = { revision: 0, intents: Array.from({ length: 7 }, (_, n) => used(n + 1)) };
    const catalogue = Array.from({ length: 14 }, (_, n) => ({ ...item, id: String(n + 1).padStart(2, "0") }));
    const p = plan(policy(), catalogue, ledger, inventory(), now);
    expect(p.selected.map(i => i.id)).toEqual(["08", "09", "10"]);
    expect(p.selected[0].dueAt).toBe(easternNoon("2026-11-02"));
    expect(plan(policy(), catalogue, ledger, inventory(), now)).toEqual(p);
  });
  it("does not starve a supported channel behind held Facebook content", () => {
    const p = policy(); p.channels.unshift({ ...p.channels[0], platform: "facebook", id: "synthetic-facebook" });
    const held = Array.from({ length: 24 }, (_, n) => ({ ...item, id: "held-" + n, platform: "facebook" as const, destination: item.destination.replaceAll("instagram", "facebook") }));
    const result = plan(p, [...held, item], { revision: 0, intents: [] }, inventory(), now);
    expect(result.selected.map(i => i.platform)).toEqual(["instagram"]);
    expect(result.held.every(h => classify(h) === "policy_hold")).toBe(true);
  });
  it("executes a later-than-21st eligible item rather than slicing it away", async () => {
    const s = new Memory(); const p = policy();
    const provider: Provider = { inventory: vi.fn(async () => inventory()), create: vi.fn(async () => ({ id: "remote", state: "scheduled" as const })), cancel: vi.fn() };
    await replenish({ policy: p, items: [...Array.from({ length: 24 }, (_, n) => ({ ...item, id: "held-" + n, category: "unapproved" })), item], store: s, provider, now });
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(s.value.intents[0].item.id).toBe("01");
  });
  it("observes without writes, then reconciles while paused and content exhausted", async () => {
    const s = new Memory(); s.value = { revision: 0, masterPaused: true, intents: [{ ...used(1), state: "scheduled", providerId: "remote" }] };
    const i = s.value.intents[0]; const remote = { ...inventory(), posts: [{ id: "remote", channelId: i.channelId, text: i.item.text, dueAt: i.item.dueAt, status: "sent", assets: i.item.assets.map(a => a.url) }] };
    const provider: Provider = { inventory: vi.fn(async () => remote), create: vi.fn(), cancel: vi.fn() };
    const snapshot = await observe(provider); expect(s.value.revision).toBe(0);
    await reconcile(s, snapshot, now);
    expect(s.value.intents[0].state).toBe("published"); expect(s.value.masterPaused).toBe(true);
    expect(provider.create).not.toHaveBeenCalled(); expect(provider.cancel).not.toHaveBeenCalled();
  });
  it("holds missing remote results, never converting absence into success", async () => {
    const s = new Memory(); s.value.intents = [{ ...used(1), state: "processing" }];
    await reconcile(s, inventory(), now); expect(s.value.intents[0].state).toBe("unknown");
    expect(plan(policy(), [item], s.value, inventory(), now).selected).toEqual([]);
  });
  it("rejects incomplete inventory without resolving or mutating anything", async () => {
    const s = new Memory(); await expect(reconcile(s, { ...inventory(), complete: false }, now)).rejects.toThrow("incomplete"); expect(s.value.revision).toBe(0);
  });
  it("allocates around both native and provider occupancy", () => {
    const remote = inventory(); remote.posts.push({ id: "native", channelId: "synthetic-instagram", dueAt: item.dueAt, text: "Externally scheduled", status: "scheduled", assets: [] });
    expect(plan(policy(), [item], { revision: 0, intents: [] }, remote, now).selected[0].dueAt).toBe(easternNoon("2026-11-03"));
  });
  it("keeps queue-full ordinary deferral out of incident notices", () => {
    const remote = inventory(); remote.posts = Array.from({ length: 7 }, (_, n) => ({ id: String(n), channelId: "synthetic-instagram", dueAt: item.dueAt, text: "Other", status: "scheduled", assets: [] }));
    const result = plan(policy(), [item], { revision: 0, intents: [] }, remote, now);
    expect(result.selected).toEqual([]); expect(result.held.map(classify)).toEqual(["deferred"]);
  });
  it("requires current capability evidence without manufacturing consent expiration", () => {
    const p = policy(); p.channels[0].capability!.recheckAfter = now.toISOString();
    expect(holdReason(p, item, now)).toBe("capability_recheck_required");
    expect(p.brokerageAdvertisingApproval!.expiresAt).toBe("2026-12-01T00:00:00Z");
  });
  it("does not use a seller-only profile link to imply a buyer destination", () => expect(holdReason(policy(), { ...item, destination: item.destination.replace("/home-value?", "/buy?").replace("seller_instagram", "buyer_instagram") }, now)).toBe("offer_profile_destination_unverified"));
  it("persists one incident identity and suppresses unchanged daily notices", () => {
    const first = checkpointIncidents([], [{ code: "authorization_revoked", channelId: "synthetic" }], now);
    expect(first.notify).toHaveLength(1);
    const again = checkpointIncidents(first.incidents, [{ code: "authorization_revoked", channelId: "synthetic" }], new Date(+now + 2 * 86400_000));
    expect(again.notify).toEqual([]); expect(again.incidents[0].firstSeen).toBe(now.toISOString());
    expect(checkpointIncidents(again.incidents, [], new Date(+now + 3 * 86400_000), false).incidents[0].resolvedAt).toBeUndefined();
    expect(checkpointIncidents(again.incidents, [], new Date(+now + 3 * 86400_000)).notify).toHaveLength(1);
  });
  it("does not reset historical slot/content IDs or silently truncate a full ledger", () => {
    const ledger = { revision: 0, intents: [used(1)] }; expect(plan(policy(), [{ ...item, id: "01", dueAt: easternNoon("2026-11-05") }], ledger, inventory(), now).selected).toEqual([]);
    expect(ledger.intents).toHaveLength(1);
  });
  it("executes default local planning with fetch forbidden and no credential binding", () => {
    const output = execFileSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", "globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};process.argv=['node','run','--summary'];await import('./scripts/social/run.mjs')"], { encoding: "utf8", env: { ...process.env, AMM_SOCIAL_BUFFER_KEY: "", AMM_SOCIAL_STATE_TOKEN: "" } });
    expect(JSON.parse(output)).toMatchObject({ status: "PREPARED_NOT_SCHEDULED", concepts: 14, variants: 42 });
  });
  it.each(["friends", "privateGroup", "prospect", "credential", "notes"])("rejects private %s fields from public state", field => expect(() => assertPublicLedger({ revision: 0, intents: [], [field]: "private" })).toThrow("schema"));
  it("rejects sensitive URLs and contact addresses inside public intent text", () => {
    const i = used(1); assertPublicLedger({ revision: 0, intents: [i] });
    expect(() => assertPublicLedger({ revision: 0, intents: [{ ...i, item: { ...i.item, destination: i.item.destination + "&email=hidden" } }] })).toThrow("private_url");
    expect(() => assertPublicLedger({ revision: 0, intents: [{ ...i, item: { ...i.item, text: "Private customer@example.test" } }] })).toThrow("private_text");
  });
  it("shares the mutation allowance across manual restarts", async () => {
    const s = new Memory(); const remote = inventory();
    const provider: Provider = { inventory: vi.fn(async ( ) => structuredClone(remote)), create: vi.fn(async (i: Intent) => { const id = "remote-" + remote.posts.length; remote.posts.push({ id, channelId: i.channelId, text: i.item.text, dueAt: i.item.dueAt, assets: i.item.assets.map(a => a.url), status: "scheduled" }); return { id, state: "scheduled" as const }; }), cancel: vi.fn() };
    await replenish({ policy: policy(), items: [item], store: s, provider, now });
    const result = await replenish({ policy: policy(), items: [{ ...item, id: "02", dueAt: easternNoon("2026-11-03") }], store: s, provider, now });
    expect(provider.create).toHaveBeenCalledTimes(1); expect(result.held).toContain("shared_effect_window_cap");
  });
});
