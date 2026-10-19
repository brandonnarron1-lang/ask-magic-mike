const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
const modules = new Map();
function load(name) {
  assert.ok(["nativeHttp", "protectedStore", "betaBinding"].includes(name));
  if (modules.has(name)) return modules.get(name);
  const m = { exports: {} };
  new Function("require", "module", "exports", ts.transpileModule(fs.readFileSync(path.join(__dirname, name + ".ts"), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText)(s => load(s.slice(2)), m, m.exports);
  modules.set(name, m.exports); return m.exports;
}
const { internalBetaBinding } = load("betaBinding");
const { createGuestSessionAdapter } = load("nativeHttp");
const start = Date.now(), descriptor = { kind: "connected-internal-beta", origin: "https://amm-internal-beta-000000000000.vercel.app",
  createdAt: start, expiresAt: start + 7 * 86400000, source: "a".repeat(40),
  localScopeId: "33333333-3333-4333-8333-333333333333", verificationReceipt: "beta-provenance:" + "b".repeat(64) };
const input = { origin: descriptor.origin, path: "/api/chat/message", method: "POST", body: '{"message":"SYNTHETIC"}' };
function harness(d = descriptor) {
  let now = start; const values = new Map(), calls = [];
  const store = { getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { values.set(k, v); }, removeItem: async k => { values.delete(k); } };
  const adapter = createGuestSessionAdapter(d, store, async (url, init) => {
    calls.push({ url, init }); let done = false;
    return { status: 200, url, redirected: false, headers: { get: n => n === "content-type" ? "application/json" : null },
      body: { getReader: () => ({ read: async () => { if (done) return { done: true }; done = true; return { done: false, value: new TextEncoder().encode('{"ok":true}') }; }, cancel: async () => {}, releaseLock() {} }) } };
  }, { now: () => now });
  return { adapter, values, calls, clock: v => { now = v; } };
}
test("beta descriptor is separate, exact HTTPS, bounded and credential-free", () => {
  assert.deepEqual(internalBetaBinding(JSON.stringify(descriptor)), descriptor);
  assert.equal(internalBetaBinding(undefined), undefined);
  for (const delta of [{ origin: "https://www.askmagicmike.com" }, { origin: "http://127.0.0.1:3301" }, { kind: "verified-local-loopback" },
    { expiresAt: descriptor.expiresAt + 1 }, { source: "short" }, { token: "DO_NOT_EMBED" }, { origin: descriptor.origin + "/" }]) {
    assert.throws(() => internalBetaBinding(JSON.stringify({ ...descriptor, ...delta })));
  }
});
test("no credential, automatic request, OS jar or Production fallback exists", async () => {
  const h = harness(); assert.equal(h.values.size, 0);
  await assert.rejects(h.adapter.request(input)); assert.equal(h.calls.length, 0);
  await h.adapter.admit("g".repeat(43)); assert.equal(h.calls.length, 0);
  await h.adapter.request(input);
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].url, descriptor.origin + "/api/native/beta/v1/api/chat/message");
  assert.equal(h.calls[0].init.headers.Cookie, "amm-r2-guest=" + "g".repeat(43));
  for (const name of ["Origin", "Referer", "Authorization", "x-vercel-protection-bypass"]) assert.equal(h.calls[0].init.headers[name], undefined);
  assert.equal(h.calls[0].init.credentials, "omit"); assert.equal(h.calls[0].init.redirect, "manual");
});
test("restart retains exact individual access; replacement cannot rearm a revoked identity", async () => {
  const h = harness(); await h.adapter.admit("g".repeat(43));
  await h.adapter.admit("g".repeat(43)); await assert.rejects(h.adapter.admit("z".repeat(43)));
  await h.adapter.request(input); assert.equal(h.calls[0].init.headers.Cookie, "amm-r2-guest=" + "g".repeat(43));
});
test("expiry/dispose refuse before network and retain private storage", async () => {
  const h = harness(); await h.adapter.admit("g".repeat(43)); const saved = [...h.values];
  h.clock(descriptor.expiresAt); await assert.rejects(h.adapter.request(input)); await assert.rejects(h.adapter.admit("g".repeat(43)));
  assert.equal(h.calls.length, 0); assert.deepEqual([...h.values], saved);
  const expired = harness({ ...descriptor, createdAt: start - 8 * 86400000, expiresAt: start - 86400000 });
  await assert.rejects(expired.adapter.request(input)); assert.equal(expired.calls.length, 0);
});
