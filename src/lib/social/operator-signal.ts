import type { Incident } from "./operations";

const repository = "brandonnarron1-lang/ask-magic-mike";
const endpoint = `https://api.github.com/repos/${repository}/issues`;
const marker = "<!-- amm-owned-instagram-operator-v1 -->";
const title = "Ask Magic Mike Instagram publisher — operator action";

/** Existing GitHub Issues is the visible operator channel, not the lead outbox.
 * Read-before-write + stable content deduplicate even after an ambiguous POST.
 * No provider error bodies, credentials, lead/contact data, or per-run comments.
 * A confirmed issue is a signal, NOT proof of email/push receipt by Brandon. */
export async function signalOperator(options: {
  token: string; repository: string; incidents: Incident[]; transport?: typeof fetch;
}): Promise<{ status: "CREATED" | "UPDATED" | "UNCHANGED" | "NO_INCIDENT"; url?: string }> {
  if (!options.token || options.repository !== repository) throw Error("operator_signal_binding_invalid");
  const active = options.incidents.filter(i => !i.resolvedAt).sort((a, b) => a.id.localeCompare(b.id));
  for (const i of active) if (!/^[a-f0-9]{64}$/.test(i.id) || !/^[a-z0-9_:.-]{1,150}$/.test(i.code) || !/^[a-zA-Z0-9_-]{1,100}$/.test(i.channelId) || !Number.isFinite(Date.parse(i.firstSeen))) throw Error("operator_signal_private_payload_rejected");
  const body = `${marker}\n\n${active.length ? "INTERVENTION REQUIRED — publishing is held for the affected scope." : "RESOLVED — no current actionable incident is reported."}\n\n` +
    active.map(i => `- ${i.code} · scope ${i.channelId} · incident ${i.id}`).join("\n") +
    "\n\nUse the existing owned-social status/reconciliation procedure. UNKNOWN provider outcomes must not be replayed. A saved issue is not personal notification receipt.\n\n[Workflow history](https://github.com/" + repository + "/actions/workflows/owned-social.yml)";
  const transport = options.transport || fetch;
  async function request(url: string, method = "GET", value?: unknown) {
    const r = await transport(url, { method, headers: { Authorization: `Bearer ${options.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" }, ...(value ? { body: JSON.stringify(value) } : {}), redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw Error("operator_signal_unconfirmed_no_retry");
    return { data: await r.json(), more: /rel="next"/.test(r.headers.get("link") || "") };
  }
  // Use authoritative current issue inventory, not the eventually indexed
  // search API. Bound it and fail closed rather than risk a duplicate signal.
  const entries: { title?: string; body?: string; number?: number; html_url?: string; state?: string }[] = [];
  let complete = false;
  for (let page = 1; page <= 5; page++) {
    const found = await request(`${endpoint}?state=all&sort=updated&direction=desc&per_page=100&page=${page}`);
    if (!Array.isArray(found.data)) throw Error("operator_signal_inventory_incomplete");
    entries.push(...found.data);
    if (!found.more) { complete = true; break; }
  }
  if (!complete) throw Error("operator_signal_inventory_incomplete");
  const candidates = entries.filter(i => i.title === title && i.body?.startsWith(marker));
  if (candidates.length > 1) throw Error("operator_signal_identity_conflict");
  const old = candidates[0];
  if (!old && !active.length) return { status: "NO_INCIDENT" };
  const state = active.length ? "open" : "closed";
  if (old?.body === body && old.state === state) return { status: "UNCHANGED", url: old.html_url };
  let number: number;
  let status: "CREATED" | "UPDATED";
  if (old) {
    if (typeof old.number !== "number" || !Number.isSafeInteger(old.number) || old.number < 1) throw Error("operator_signal_identity_conflict");
    number = old.number; status = "UPDATED";
    await request(`${endpoint}/${number}`, "PATCH", { body, state });
  } else {
    const created = await request(endpoint, "POST", { title, body, assignees: ["brandonnarron1-lang"] });
    number = created.data.number; status = "CREATED";
    if (!Number.isSafeInteger(number) || number < 1) throw Error("operator_signal_create_unknown_no_retry");
  }
  const verified = (await request(`${endpoint}/${number}`)).data;
  if (verified.title !== title || verified.body !== body || verified.state !== state || verified.html_url !== `https://github.com/${repository}/issues/${number}`) throw Error("operator_signal_readback_unconfirmed");
  return { status, url: verified.html_url };
}
