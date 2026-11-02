import type { Channel, Intent, Provider, RemotePost, PublicationState } from "./publisher";
import { requiresNativeAiDisclosure } from "./publisher";

// Current GraphQL API, verified against https://developers.buffer.com/reference.html.
// No legacy REST calls, experimental analytics, customer data, automatic retries,
// or raw provider error/credential output. Caller supplies a dedicated binding.
const fields = "id channelId text dueAt status externalLink assets { source }";
export class BufferProvider implements Provider {
  private calls = 0;
  private key: string; private organizationId: string; private channels: Pick<Channel, "id" | "platform" | "accountId">[]; private transport: typeof fetch;
  constructor(key: string, organizationId: string, channels: Pick<Channel, "id" | "platform" | "accountId">[], transport: typeof fetch = fetch) {
    this.key = key; this.organizationId = organizationId; this.channels = channels; this.transport = transport;
    if (!key || !organizationId || !channels.length || channels.length > 3) throw new Error("buffer_binding_missing");
  }
  private async request(query: string, variables: Record<string, unknown>) {
    if (++this.calls > 50) throw new Error("buffer_run_request_cap");
    const r = await this.transport("https://api.buffer.com", { method: "POST", redirect: "error", headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error(r.status === 429 ? "buffer_rate_limited_no_retry" : r.status === 401 || r.status === 403 ? "buffer_authorization_denied" : "buffer_http_result_unknown");
    const body = await r.json();
    if (body.errors?.length || !body.data) throw new Error("buffer_graphql_result_unknown");
    return body.data;
  }
  private async verifyChannel(id: string) {
    const expected = this.channels.find(c => c.id === id);
    const d = await this.request("query($input:ChannelInput!){channel(input:$input){id service serviceId type isDisconnected isLocked organizationId}}", { input: { id } });
    if (!expected || d.channel?.id !== id || d.channel.organizationId !== this.organizationId || d.channel.service !== expected.platform || d.channel.serviceId !== expected.accountId || (expected.platform === "facebook" && d.channel.type !== "page") || (expected.platform === "instagram" && d.channel.type !== "business")) throw new Error("buffer_account_identity_mismatch");
    return d.channel;
  }
  async inventory() {
    const posts: RemotePost[] = [], disconnected: string[] = [];
    const channelIds = this.channels.map(c => c.id);
    for (const id of channelIds) {
      const channel = await this.verifyChannel(id);
      if (channel.isDisconnected || channel.isLocked) disconnected.push(id);
    }
    let after: string | null = null;
    for (let page = 0; page < 5; page++) {
      const d = await this.request(`query($input:PostsInput!,$after:String){posts(input:$input,first:100,after:$after){edges{node{${fields}}}pageInfo{hasNextPage endCursor}}}`, { input: { organizationId: this.organizationId, filter: { channelIds } }, after });
      const p = d.posts;
      if (!p?.pageInfo || !Array.isArray(p.edges)) throw new Error("buffer_inventory_invalid");
      for (const { node: n } of p.edges) {
        if (!n?.id || !channelIds.includes(n.channelId) || !Array.isArray(n.assets)) throw new Error("buffer_post_scope_invalid");
        posts.push({ id: n.id, channelId: n.channelId, text: n.text, dueAt: n.dueAt ? new Date(n.dueAt).toISOString() : null, status: n.status, assets: n.assets.map((a: { source: string }) => a.source), permalink: n.externalLink || undefined });
      }
      if (!p.pageInfo.hasNextPage) return { complete: true, posts, disconnected };
      if (!p.pageInfo.endCursor || p.pageInfo.endCursor === after) throw new Error("buffer_pagination_invalid");
      after = p.pageInfo.endCursor;
    }
    return { complete: false, posts, disconnected };
  }
  async create(intent: Intent) {
    if (!this.channels.some(c => c.id === intent.channelId)) throw new Error("buffer_channel_denied");
    const channel = await this.verifyChannel(intent.channelId);
    if (channel.isDisconnected || channel.isLocked) throw new Error("buffer_authorization_revoked");
    const item = intent.item;
    // The current API exposes this label for Instagram and TikTok video, not
    // Facebook or TikTok photos. Never silently mark concept imagery as false.
    const unsupportedLabel = item.platform === "facebook" || (item.platform === "tiktok" && item.assets.some(a => a.type !== "video"));
    const disclose = requiresNativeAiDisclosure(item);
    if (disclose && unsupportedLabel) throw new Error("native_ai_disclosure_required_for_this_format");
    const metadata = item.platform === "instagram" ? { instagram: { type: item.assets.some(a => a.type === "video") ? "reel" : "post", shouldShareToFeed: true, isAiGenerated: disclose } } : item.platform === "facebook" ? { facebook: { type: item.assets.some(a => a.type === "video") ? "reel" : "post" } } : { tiktok: { isAiGenerated: disclose } };
    const input = { channelId: intent.channelId, text: item.text, assets: item.assets.map(a => a.type === "image" ? { image: { url: a.url, metadata: { altText: a.alt } } } : { video: { url: a.url, metadata: { thumbnailOffset: 1000 } } }), dueAt: item.dueAt, mode: "customScheduled", schedulingType: "automatic", needsApproval: false, saveToDraft: false, aiAssisted: item.aiAssisted, source: "amm-owned-social-v1", metadata };
    const d = await this.request(`mutation($input:CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{${fields}}}}}`, { input });
    const n = d.createPost?.post;
    if (d.createPost?.__typename !== "PostActionSuccess" || !n?.id || n.channelId !== intent.channelId) throw new Error("buffer_create_not_confirmed");
    const state: PublicationState = n.status === "sent" ? "published" : ["scheduled", "buffer"].includes(n.status) ? "scheduled" : "processing";
    return { id: n.id, state, permalink: n.externalLink || undefined };
  }
  async cancel(id: string) {
    // Validate ownership/current state again immediately before remote removal.
    const d = await this.request(`query($input:PostInput!){post(input:$input){${fields}}}`, { input: { id } });
    if (!d.post || !this.channels.some(c => c.id === d.post.channelId) || !["scheduled", "buffer", "draft"].includes(d.post.status)) throw new Error("buffer_cancel_state_changed");
    await this.verifyChannel(d.post.channelId);
    const result = await this.request("mutation($input:DeletePostInput!){deletePost(input:$input){__typename}}", { input: { id } });
    if (result.deletePost?.__typename !== "DeletePostSuccess") throw new Error("buffer_cancel_unconfirmed");
  }
}
