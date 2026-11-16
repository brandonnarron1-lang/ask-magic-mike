// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOnePost, selectOnePost } from "../../src/lib/social/one-post";
import { replenish, type Ledger, type Policy, type Store } from "../../src/lib/social/publisher";
import { BufferProvider } from "../../src/lib/social/buffer";
import { assertPublicLedger } from "../../src/lib/social/github-store";
import { publicAttributionSnapshot } from "../../app/lib/attributionPrivacy";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const catalogue = read("config/owned-social-one-posts.json");
const manifest = read("public/social/owned-launch-v2/asset-manifest.json");
const id = "19-occupancy-context", now = new Date("2026-11-16T15:00:00Z"), at = "2026-11-16T17:00:00Z";
const item = () => buildOnePost(catalogue, manifest, id, at);
const inventory = () => ({ complete: true, posts: [], disconnected: [] });
const policy = (): Policy => {
  const p = read("config/owned-social-policy.json");
  // Synthetic current admission only; NEVER refresh the real policy/evidence.
  p.channels[0].capability.observedAt = now.toISOString();
  p.channels[0].capability.recheckAfter = "2026-11-17T00:00:00Z";
  p.entitlement.verifiedAt = now.toISOString(); p.entitlement.expiresAt = "2026-11-17T00:00:00Z";
  return p;
};
class Memory implements Store {
  value: Ledger = { revision: 0, intents: [] };
  async read() { return structuredClone(this.value); }
  async compareAndSwap(expected: number, next: Ledger) { assertPublicLedger(next); if (this.value.revision !== expected) return false; this.value = structuredClone(next); return true; }
}
function native(args: string[], scheduled = false) {
  const code = "globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};process.argv=['node','run',..." + JSON.stringify(args) + "];await import('./scripts/social/run.mjs')";
  return spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", code], {
    encoding: "utf8", timeout: 10000,
    // Do not inherit ambient Production keys required by the project's global type.
    env: { PATH: process.env.PATH, GITHUB_EVENT_NAME: scheduled ? "schedule" : "", AMM_SOCIAL_BUFFER_KEY: "", AMM_SOCIAL_STATE_TOKEN: "", AMM_SOCIAL_OPERATOR_SIGNALS_ENABLED: "false" } as unknown as NodeJS.ProcessEnv,
  });
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe("Canonical one-post preparation, never recurring reserve", () => {
  it("pins the exact approved JPEG and preserves all 100 prior manifest records", () => {
    const bytes = readFileSync("public/social/owned-launch-v2/" + catalogue.posts[0].asset);
    expect(bytes.length).toBe(226756);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("2edfd1952b165dd2428646ce780e77ebed7738a9ab5ba1a3d1a2bfe70b19a85e");
    const old = manifest.files.filter((f: { name: string }) => f.name !== catalogue.posts[0].asset);
    expect(old).toHaveLength(100);
    expect(createHash("sha256").update(JSON.stringify(old)).digest("hex")).toBe("a04f376a786a1c26bdebf5e4364a8608b7df5f56390e894a971ae841dae40907");
  });
  it("builds one image with full caption, existing attribution and mandatory native disclosure", () => {
    const i = item(); expect(i.assets).toHaveLength(1); expect(i.assets[0].type).toBe("image");
    expect(i.assets[0].url).toBe("https://www.askmagicmike.com/social/owned-launch-v2/19-occupancy-context-feed.jpg");
    expect(i.text).toBe(catalogue.posts[0].text); expect(i.text).toContain("Illustrative brand imagery—not a listing.");
    expect(i.requiresAiDisclosure).toBe(true); expect(i.dueAt).toBe("2026-11-16T17:00:00.000Z");
    expect(publicAttributionSnapshot({ source: "instagram", medium: "organic_social", campaign: "amm_seller_buyer_launch_2026", content: "seller_instagram" })).toEqual({ source: "instagram", medium: "organic_social", campaign: "amm_seller_buyer_launch_2026", content: "seller_instagram" });
    expect(read("config/owned-social-content.json").concepts.some((c: { id: string }) => c.id === id)).toBe(false);
  });
  it.each(["", "2026-11-16", "2026-11-16T12:00:00-05:00", "2026-02-30T17:00:00Z"])("refuses missing/ambiguous/invalid time %s without choosing a new slot", at => expect(() => buildOnePost(catalogue, manifest, id, at)).toThrow("explicit_utc_time"));
  it("rejects unknown/duplicate identities and mismatched manifest hashes", () => {
    expect(() => buildOnePost(catalogue, manifest, "other", at)).toThrow("identity");
    expect(() => buildOnePost({ ...catalogue, posts: [...catalogue.posts, catalogue.posts[0]] }, manifest, id, at)).toThrow("identity");
    const changed = structuredClone(manifest); changed.files.find((f: { name: string }) => f.name === catalogue.posts[0].asset).sha256 = "a".repeat(64);
    expect(() => buildOnePost(catalogue, changed, id, at)).toThrow("manifest_mismatch");
  });
  it("never refreshes stale real entitlement or capability evidence", () => {
    const result = selectOnePost(read("config/owned-social-policy.json"), item(), { revision: 0, intents: [] }, inventory(), now);
    expect(result.selected).toEqual([]); expect(result.held[0]).toContain("capability_recheck_required");
    const p = policy(); p.entitlement = null;
    expect(selectOnePost(p, item(), { revision: 0, intents: [] }, inventory(), now).held[0]).toContain("zero_cost_entitlement_unverified");
  });
  it("keeps the approved exact time and holds an elapsed slot instead of re-dating it", () => {
    const p = policy(), i = item(); expect(selectOnePost(p, i, { revision: 0, intents: [] }, inventory(), now).selected[0].dueAt).toBe(i.dueAt);
    expect(selectOnePost(p, i, { revision: 0, intents: [] }, inventory(), new Date(at)).held[0]).toContain("schedule_outside_window");
  });
  it("preserves durable pause, incomplete inventory, UNKNOWN and occupied-slot holds", () => {
    const ledger: Ledger = { revision: 0, intents: [] }, i = item();
    expect(selectOnePost(policy(), i, { ...ledger, masterPaused: true }, inventory(), now).selected).toEqual([]);
    expect(selectOnePost(policy(), i, ledger, { ...inventory(), complete: false }, now).selected).toEqual([]);
    const pending = { key: "pending", item: i, channelId: policy().channels[0].id, state: "unknown" as const, updatedAt: now.toISOString() };
    expect(selectOnePost(policy(), i, { ...ledger, intents: [pending] }, inventory(), now).held[0]).toContain("unresolved_provider_result");
    const remote = { id: "existing", channelId: pending.channelId, dueAt: i.dueAt, status: "scheduled", text: "Other", assets: [] };
    expect(selectOnePost(policy(), i, ledger, { ...inventory(), posts: [remote] }, now).selected).toEqual([]);
  });
  it("keeps a consumed content identity consumed even at another time", () => {
    const i = item(), ledger: Ledger = { revision: 0, intents: [{ key: "used", item: i, channelId: policy().channels[0].id, state: "cancelled", updatedAt: now.toISOString() }] };
    expect(selectOnePost(policy(), { ...i, dueAt: "2026-11-16T18:00:00.000Z" }, ledger, inventory(), now).held[0]).toContain("already_reserved");
  });
  it("holds identical remote content at a different timestamp even with an empty ledger", () => {
    const i = item(), ledger: Ledger = { revision: 0, intents: [] };
    const remote = { id: "existing-native", channelId: policy().channels[0].id, text: i.text, assets: i.assets.map(a => a.url), dueAt: "2026-11-17T17:00:00.000Z", status: "scheduled" };
    const result = selectOnePost(policy(), i, ledger, { ...inventory(), posts: [remote] }, now);
    expect(result.selected).toEqual([]); expect(result.held[0]).toContain("remote_content_already_present");
    expect(i.dueAt).toBe("2026-11-16T17:00:00.000Z");
  });
  it("reports another ledger item's occupied exact slot without silently skipping or re-dating", () => {
    const i = item(), ledger: Ledger = { revision: 0, intents: [{ key: "other", item: { ...i, id: "other-content" }, channelId: policy().channels[0].id, state: "scheduled", updatedAt: now.toISOString() }] };
    const before = structuredClone(ledger);
    const result = selectOnePost(policy(), i, ledger, inventory(), now);
    expect(result.selected).toEqual([]); expect(result.held[0]).toContain("ledger_slot_already_reserved");
    expect(ledger).toEqual(before); expect(i.dueAt).toBe("2026-11-16T17:00:00.000Z");
  });
  it("reuses the actual CAS publisher and automatic Buffer create/readback with one media asset", async () => {
    const s = new Memory(), i = item(), p = policy(), c = p.channels[0]; let post: Record<string, unknown> | null = null;
    const transport = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body));
      if (body.query.includes("channel(input")) return Response.json({ data: { channel: { id: c.id, name: c.accountId, organizationId: "synthetic-org", service: "instagram", type: "business", isDisconnected: false, isLocked: false } } });
      if (body.query.includes("posts(input")) return Response.json({ data: { posts: { edges: post ? [{ node: post }] : [], pageInfo: { hasNextPage: false } } } });
      if (body.query.includes("post(input")) return Response.json({ data: { post } });
      expect(body.query.startsWith("mutation")).toBe(true); expect(s.value.intents[0].state).toBe("processing");
      const input = body.variables.input; expect(input.assets).toHaveLength(1); expect(input.text).toBe(i.text);
      expect(input.dueAt).toBe(i.dueAt); expect(input.metadata.instagram).toEqual({ type: "post", shouldShareToFeed: true, isAiGenerated: true });
      expect(input.schedulingType).toBe("automatic"); expect(input.mode).toBe("customScheduled");
      post = { id: "synthetic-post", channelId: c.id, text: input.text, dueAt: input.dueAt, status: "scheduled", schedulingType: "automatic", assets: [{ source: i.assets[0].url }], metadata: { isAiGenerated: true } };
      return Response.json({ data: { createPost: { __typename: "PostActionSuccess", post } } });
    });
    const provider = new BufferProvider("synthetic-only", "synthetic-org", p.channels, transport as typeof fetch);
    expect((await replenish({ policy: p, items: [i], store: s, provider, now })).created).toBe(1);
    expect(s.value.intents[0].state).toBe("scheduled");
    await replenish({ policy: p, items: [i], store: s, provider, now });
    expect(transport.mock.calls.filter(([, o]) => JSON.parse(String(o?.body)).query.startsWith("mutation"))).toHaveLength(1);
  });
  it("plans through the native runner without a network or live binding", () => {
    const result = native(["--one-post=" + id, "--at=" + at, "--summary"]);
    expect(result.status).toBe(0); const output = JSON.parse(result.stdout);
    expect(output.status).toBe("PREPARED_NOT_SCHEDULED"); expect(output.variants).toBe(1);
    expect(output.selected).toEqual([]); expect(output.holds[0].code).toContain("capability_recheck_required");
    const ordinary = native(["--summary"]); expect(ordinary.status).toBe(0); expect(JSON.parse(ordinary.stdout).variants).toBe(54);
  });
  it("refuses one-post recurrence, missing time, duplicate flags and non-execution modes before any provider call", () => {
    for (const [args, scheduled] of [
      [["--one-post=" + id, "--at=" + at], true], [["--one-post=" + id], false],
      [["--one-post=" + id, "--one-post=" + id, "--at=" + at], false],
      [["--observe", "--one-post=" + id, "--at=" + at], false],
    ] as [string[], boolean][]) {
      const result = native(args, scheduled); expect(result.status).toBe(2); expect(result.stdout).not.toContain("NETWORK_FORBIDDEN");
      expect(JSON.parse(result.stdout).code).toContain("one_post_");
    }
  });
});
