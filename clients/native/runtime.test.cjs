const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const allowed = new Set(["protectedStore", "nativeHttp", "qaBinding", "betaBinding"]);
const loaded = new Map();
function load(name) {
  assert.ok(allowed.has(name));
  if (loaded.has(name)) return loaded.get(name);
  const out = ts.transpileModule(fs.readFileSync(path.join(__dirname, `${name}.ts`), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", out.outputText)(s => { assert.ok(s.startsWith("./")); return load(s.slice(2)); }, loadedModule, loadedModule.exports);
  loaded.set(name, loadedModule.exports); return loadedModule.exports;
}
const { createProtectedStore, CHUNK_BYTES, MAX_CHUNKS, MAX_PROTECTED_BYTES, utf8Bytes } = load("protectedStore");
const { createGuestSessionAdapter, MAX_RESPONSE_BYTES } = load("nativeHttp");
const { localQaBinding } = load("qaBinding");
const key = "amm-r3-local-plan-v1";
function nativeDriver() {
  const values = new Map(); const ops = [];
  const driver = {
    fail: () => false,
    async get(k) { ops.push(["get", k]); if (driver.fail("get", k)) throw Error("native refused"); return values.get(k) ?? null; },
    async set(k, v) { ops.push(["set", k]); assert.ok(utf8Bytes(v) <= CHUNK_BYTES); if (driver.fail("set", k)) throw Error("native refused"); values.set(k, v); },
    async remove(k) { ops.push(["remove", k]); if (driver.fail("remove", k)) throw Error("native refused"); values.delete(k); },
  };
  return { driver, values, ops, store: createProtectedStore(driver) };
}
test("bounded multi-byte chunks roundtrip a 24K-character plan and 3K journal", async () => {
  const h = nativeDriver(); const value = "😀".repeat(11500);
  await h.store.setItem(key, value); assert.equal(await h.store.getItem(key), value);
  await h.store.setItem("amm-r3-receipts-v1.disconnected", "x".repeat(3000));
  assert.equal((await h.store.getItem("amm-r3-receipts-v1.disconnected")).length, 3000);
  assert.ok([...h.values.values()].every(v => utf8Bytes(v) <= CHUNK_BYTES));
});
test("oversize, unpaired surrogate and invalid key reject before a native mutation", async () => {
  const h = nativeDriver();
  await assert.rejects(h.store.setItem(key, "x".repeat(MAX_PROTECTED_BYTES + 1)));
  await assert.rejects(h.store.setItem(key, "\ud800"));
  await assert.rejects(h.store.setItem("../staff", "secret"));
  assert.equal(h.ops.length, 0);
});
test("every precommit chunk failure retains complete prior committed value", async () => {
  const h = nativeDriver(); await h.store.setItem(key, "old private value");
  for (const suffix of [".b1.0", ".b1.1", ".head"]) {
    h.driver.fail = (op, k) => op === "set" && k.endsWith(suffix);
    await assert.rejects(h.store.setItem(key, "z".repeat(3000)));
    h.driver.fail = () => false;
    assert.equal(await createProtectedStore(h.driver).getItem(key), "old private value");
  }
});
test("ambiguous manifest acknowledgement exposes only complete new value", async () => {
  const h = nativeDriver(); await h.store.setItem(key, "old");
  const nativeSet = h.driver.set;
  h.driver.set = async (k, v) => { await nativeSet(k, v); if (k.endsWith(".head")) throw Error("ack lost"); };
  await assert.rejects(h.store.setItem(key, "complete new"));
  assert.equal(await createProtectedStore(h.driver).getItem(key), "complete new");
});
test("serialized writes/read and bounded two-bank storage; explicit deletion clears all", async () => {
  const h = nativeDriver();
  await Promise.all(Array.from({ length: 10 }, (_, i) => h.store.setItem(key, `value-${i}`)));
  assert.equal(await h.store.getItem(key), "value-9");
  assert.ok(h.values.size <= 2 * MAX_CHUNKS + 1);
  await h.store.removeItem(key); assert.equal(h.values.size, 0); assert.equal(await h.store.getItem(key), null);
});
test("corrupt manifest/missing chunk/native refusal never falls back or overwrites", async () => {
  const h = nativeDriver(); await h.store.setItem(key, "protected");
  h.values.delete(`r3.${key}.b0.0`); await assert.rejects(h.store.getItem(key));
  h.values.set(`r3.${key}.head`, "{}"); await assert.rejects(h.store.setItem(key, "overwrite"));
  h.driver.fail = () => true; await assert.rejects(h.store.getItem(key));
});
test("failed erase rejects, unpublishes immediately and can be retried", async () => {
  const h = nativeDriver(); await h.store.setItem(key, "protected");
  h.driver.fail = (op, k) => op === "remove" && k.endsWith(".b0.0");
  await assert.rejects(h.store.removeItem(key)); h.driver.fail = () => false;
  assert.equal(await h.store.getItem(key), null); assert.ok(h.values.size > 0);
  await h.store.removeItem(key); assert.equal(h.values.size, 0);
});

const scope = "33333333-3333-4333-8333-333333333333";
const answerId = "11111111-1111-4111-8111-111111111111";
const descriptor = { kind: "verified-isolated-qa", origin: "https://synthetic.invalid", verificationReceipt: "SYNTHETIC_TEST_ONLY",
  localScopeId: scope, expiresAt: Date.now() + 3600000 };
const cookieValue = "g".repeat(43);
const setCookie = `amm-r2-guest=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;
const input = { origin: descriptor.origin, path: "/api/chat/message", method: "POST", body: '{"message":"SYNTHETIC"}' };
function response(body = { ok: true }, cookies = []) {
  const bytes = new TextEncoder().encode(typeof body === "string" ? body : JSON.stringify(body));
  let sent = false;
  return { status: 200, url: descriptor.origin + input.path, redirected: false,
    headers: { get: k => k === "content-type" ? "application/json; charset=utf-8" : null, getSetCookie: () => cookies },
    body: { getReader: () => ({ async read() { if (sent) return { done: true }; sent = true; return { done: false, value: bytes }; },
      async cancel() {}, releaseLock() {} }) } };
}
function httpHarness(responses = [], config = descriptor, options = {}) {
  const h = nativeDriver(); const calls = [];
  const fetch = async (url, init) => { calls.push({ url, init }); assert.ok(responses.length); const r = responses.shift(); return typeof r === "function" ? r(url, init) : r; };
  return { ...h, calls, fetch, adapter: createGuestSessionAdapter(config, h.store, fetch, options) };
}
test("adapter creation is disconnected/no IO; invalid or expired descriptors fail", () => {
  const h = httpHarness(); assert.equal(h.ops.length, 0); assert.equal(h.calls.length, 0);
  for (const delta of [{ origin: "http://synthetic.invalid" }, { origin: "https://synthetic.invalid/" }, { expiresAt: 0 }, { localScopeId: "staff" }, { verificationReceipt: "" }]) {
    assert.throws(() => httpHarness([], { ...descriptor, ...delta }));
  }
});
test("verified local loopback is explicit, platform-specific and disconnected until an action", async () => {
  for (const [platform, origin] of [["ios", "http://127.0.0.1:3301"], ["android", "http://10.0.2.2:3301"]]) {
    const local = { ...descriptor, kind: "verified-local-loopback", platform, origin };
    const h = httpHarness([{ ...response(), url: origin + input.path }], local);
    assert.equal(h.calls.length, 0); assert.equal(h.ops.length, 0);
    await h.adapter.request({ ...input, origin });
    assert.equal(h.calls[0].url, origin + input.path); assert.equal(h.calls[0].init.credentials, "omit");
    assert.equal(h.calls[0].init.headers.Origin, undefined);
  }
  for (const delta of [{ platform: "android", origin: "http://127.0.0.1:3301" }, { platform: "ios", origin: "http://10.0.2.2:3301" },
    { origin: "http://localhost:3301" }, { origin: "http://192.168.1.2:3301" }, { origin: "http://127.0.0.2:3301" },
    { origin: "https://127.0.0.1:3301" }, { origin: "http://127.0.0.1:3301/" }, { origin: "http://127.0.0.1" }, { origin: "http://127.0.0.1:22" }]) {
    assert.throws(() => httpHarness([], { ...descriptor, kind: "verified-local-loopback", platform: "ios", origin: "http://127.0.0.1:3301", ...delta }));
  }
});
test("guest cookie remains isolated on explicitly verified synthetic HTTP loopback", async () => {
  const origin = "http://127.0.0.1:3301";
  const config = { ...descriptor, kind: "verified-local-loopback", platform: "ios", origin };
  const h = httpHarness([{ ...response({}, [setCookie]), url: origin + input.path }, { ...response(), url: origin + input.path }], config);
  await h.adapter.request({ ...input, origin }); await h.adapter.request({ ...input, origin });
  assert.equal(h.calls[1].init.headers.Cookie, `amm-r2-guest=${cookieValue}`);
  assert.equal(h.calls[1].init.headers.Origin, undefined);
});
test("guest jar persists securely across adapters, never uses OS jar or browser spoof headers", async () => {
  const h = httpHarness([response({ ok: true }, [setCookie]), response()]);
  await h.adapter.request(input);
  const second = createGuestSessionAdapter(descriptor, h.store, h.fetch);
  await second.request(input);
  assert.equal(h.calls[0].init.headers.Cookie, undefined);
  assert.equal(h.calls[1].init.headers.Cookie, `amm-r2-guest=${cookieValue}`);
  for (const c of h.calls) {
    assert.equal(c.init.credentials, "omit"); assert.equal(c.init.redirect, "manual");
    assert.equal(c.init.headers.Origin, undefined); assert.equal(c.init.headers.Referer, undefined); assert.equal(c.init.headers.Authorization, undefined);
  }
  assert.ok(h.values.size > 0);
});
test("actual RN Headers.get single-cookie fallback works without getSetCookie", async () => {
  const r = response(); delete r.headers.getSetCookie;
  r.headers.get = name => name === "set-cookie" ? setCookie : name === "content-type" ? "application/json" : null;
  const h = httpHarness([r, response()]); await h.adapter.request(input); await h.adapter.request(input);
  assert.equal(h.calls[1].init.headers.Cookie, `amm-r2-guest=${cookieValue}`);
});
const pendingBody = JSON.stringify({ answerId, revision: 1, requestId: "22222222-2222-4222-8222-222222222222", kind: "helpful", category: null, comment: "" });
const tokenPath = `/api/native/v1/feedback-token?answerId=${answerId}&revision=1`;
const feedbackInput = { ...input, path: "/api/intelligence/feedback", body: pendingBody };
const nativeToken = (token = "SYNTHETIC_CSRF_TOKEN_NOT_REAL") => ({ ...response({ ok: true, token, expiresAt: new Date(Date.now() + 240000).toISOString() }), url: descriptor.origin + tokenPath });
const nativeFeedback = () => ({ ...response({ ok: true, replayed: false }), url: descriptor.origin + "/api/native/v1/feedback" });
test("logical feedback uses fresh native token then original exact body/header, never web POST", async () => {
  const h = httpHarness([nativeToken(), nativeFeedback()]);
  const result = await h.adapter.request(feedbackInput);
  assert.equal(result.body.ok, true); assert.equal(h.calls.length, 2);
  assert.equal(h.calls[0].url, descriptor.origin + tokenPath); assert.equal(h.calls[0].init.method, "GET");
  assert.equal(h.calls[1].url, descriptor.origin + "/api/native/v1/feedback");
  assert.equal(h.calls[1].init.body, pendingBody); assert.equal(h.calls[1].init.headers["x-amm-feedback-csrf"], "SYNTHETIC_CSRF_TOKEN_NOT_REAL");
  assert.equal(h.calls[1].init.headers.Origin, undefined); assert.equal(h.calls[1].init.headers.Referer, undefined);
  assert.equal(h.values.size, 0, "CSRF token is never cached in protected storage");
});
test("explicit identical feedback retry fetches another token but preserves exact body/key", async () => {
  const h = httpHarness([nativeToken("SYNTHETIC_TOKEN_FIRST_VALUE"), nativeFeedback(), nativeToken("SYNTHETIC_TOKEN_SECOND_VALUE"), nativeFeedback()]);
  await h.adapter.request(feedbackInput); await h.adapter.request(feedbackInput);
  assert.equal(h.calls.length, 4); assert.equal(h.calls[1].init.body, h.calls[3].init.body);
  assert.notEqual(h.calls[1].init.headers["x-amm-feedback-csrf"], h.calls[3].init.headers["x-amm-feedback-csrf"]);
});
test("failed/malformed/expired native token permits zero feedback POSTs", async () => {
  const invalid = [
    { ...nativeToken(), status: 403 },
    { ...response({ ok: true, token: "SYNTHETIC_TOKEN_EXPIRED", expiresAt: new Date(0).toISOString() }), url: descriptor.origin + tokenPath },
    { ...response({ ok: true, token: "bad\r\nheader", expiresAt: new Date(Date.now() + 10000).toISOString() }), url: descriptor.origin + tokenPath },
    { ...response({ ok: true, token: "SYNTHETIC_TOKEN_TOO_LONG_LIFETIME", expiresAt: new Date(Date.now() + 600000).toISOString() }), url: descriptor.origin + tokenPath },
  ];
  for (const r of invalid) { const h = httpHarness([r]); await assert.rejects(h.adapter.request(feedbackInput)); assert.equal(h.calls.length, 1); }
  const h = httpHarness(); await assert.rejects(h.adapter.request({ ...feedbackInput, body: "{}" })); assert.equal(h.calls.length, 0);
});
test("native feedback rejection is not automatically retried with a new token", async () => {
  const h = httpHarness([nativeToken(), { ...nativeFeedback(), status: 409 }]);
  await assert.rejects(h.adapter.request(feedbackInput)); assert.equal(h.calls.length, 2);
});
test("fresh five-minute server token tolerates ten seconds of device lag; server lifetime remains authoritative", async () => {
  const laggedNow = Date.now() - 10000;
  const responseWithFullLifetime = { ...response({ ok: true, token: "SYNTHETIC_TOKEN_WITH_SERVER_CLOCK", expiresAt: new Date(laggedNow + 310000).toISOString() }), url: descriptor.origin + tokenPath };
  const h = httpHarness([responseWithFullLifetime, nativeFeedback()], descriptor, { now: () => laggedNow });
  await h.adapter.request(feedbackInput); assert.equal(h.calls.length, 2);
});
test("native token preflight shares the finite overall deadline and suppresses a late POST", async () => {
  let release; const h = httpHarness([() => new Promise(resolve => { release = resolve; })], descriptor, { timeoutMs: 10 });
  await assert.rejects(h.adapter.request(feedbackInput)); release(nativeToken());
  await new Promise(resolve => setImmediate(resolve)); assert.equal(h.calls.length, 1); assert.equal(h.calls[0].init.signal.aborted, true);
});
test("scope switches do not inherit guest cookies, disposed session cannot request", async () => {
  const h = httpHarness([response({}, [setCookie]), response()]); await h.adapter.request(input);
  const other = createGuestSessionAdapter({ ...descriptor, localScopeId: "44444444-4444-4444-8444-444444444444" }, h.store, h.fetch);
  await other.request(input); assert.equal(h.calls[1].init.headers.Cookie, undefined);
  h.adapter.dispose(); await assert.rejects(h.adapter.request(input));
});
test("bound origin and canonical path/method/body bounds fail before network", async () => {
  const h = httpHarness();
  for (const delta of [{ origin: "https://other.invalid" }, { path: "/api/admin/session" }, { path: "//other.invalid" }, { path: "/api/chat/message?secret=x" },
    { path: "/api/intelligence/answers?id=forged", method: "GET", body: undefined }, { body: "x".repeat(16385) }, { method: "GET" }]) {
    await assert.rejects(h.adapter.request({ ...input, ...delta }));
  }
  assert.equal(h.calls.length, 0);
});
test("canonical answer and feedback reads accepted, no invented lookup or automatic request", async () => {
  const paths = [`/api/intelligence/answers?id=${answerId}`, `/api/intelligence/feedback?answerId=${answerId}&revision=1`];
  const h = httpHarness(paths.map(p => ({ ...response(), url: descriptor.origin + p })));
  for (const p of paths) await h.adapter.request({ origin: descriptor.origin, path: p, method: "GET" });
  assert.equal(h.calls.length, 2);
});
test("staff/account/invalid guest cookies never enter protected jar", async () => {
  for (const c of ["amm-staff=secret; Secure; HttpOnly", "__Secure-amm-consumer.session=secret; Secure; HttpOnly", setCookie.replace("; Secure", ""),
    setCookie + "; Domain=synthetic.invalid", setCookie.replace(cookieValue, "bad"), setCookie + "\r\nX-secret: bad"]) {
    const h = httpHarness([response({}, [c])]); await assert.rejects(h.adapter.request(input)); assert.equal(h.values.size, 0);
  }
});
test("redirect/auth/origin rejection is not retried or bypassed", async () => {
  for (const delta of [{ status: 302 }, { redirected: true }, { url: "https://other.invalid" }, { status: 401 }, { status: 403 }]) {
    const h = httpHarness([{ ...response(), ...delta }]); await assert.rejects(h.adapter.request(input)); assert.equal(h.calls.length, 1);
  }
});
test("bounded JSON rejects oversized/chunked, malformed and non-JSON replies", async () => {
  const variants = [response("x".repeat(MAX_RESPONSE_BYTES + 1)), response("{broken"), response("\"valid\"")];
  variants[2].headers.get = () => "text/html";
  for (const r of variants) { const h = httpHarness([r]); await assert.rejects(h.adapter.request(input)); }
});
test("protected cookie commit failure withholds acknowledgment", async () => {
  const h = httpHarness([response({}, [setCookie])]); h.driver.fail = (op) => op === "set";
  await assert.rejects(h.adapter.request(input)); assert.equal(h.calls.length, 1);
});
test("deadline includes hanging native headers and hanging body; aborts with no retry", async () => {
  for (const stalled of [() => new Promise(() => {}), () => { const r = response(); r.body.getReader = () => ({ read: () => new Promise(() => {}), cancel: async () => {}, releaseLock() {} }); return r; }]) {
    const h = httpHarness([stalled], descriptor, { timeoutMs: 15 });
    await assert.rejects(h.adapter.request(input)); assert.equal(h.calls.length, 1); assert.equal(h.calls[0].init.signal.aborted, true);
  }
});
test("dispose suppresses late native response and all cookie commits", async () => {
  let release; const h = httpHarness([() => new Promise(resolve => { release = resolve; })]);
  const pending = h.adapter.request(input);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  h.adapter.dispose(); release(response({}, [setCookie])); await assert.rejects(pending); assert.equal(h.values.size, 0);
});
test("explicit clear removes only scoped guest cookie and fences the old adapter", async () => {
  const h = httpHarness([response({}, [setCookie])]); await h.adapter.request(input);
  await h.adapter.clear(); assert.equal(h.values.size, 0); await assert.rejects(h.adapter.request(input));
});
test("default binding is absent and the explicit fixture cannot select remote/customer data", () => {
  assert.equal(localQaBinding(undefined, "ios"), undefined);
  assert.equal(localQaBinding("", "android"), undefined);
  const d = { kind: "verified-local-loopback", iosOrigin: "http://127.0.0.1:35123", androidOrigin: "http://10.0.2.2:35123",
    verificationReceipt: "local-postgres:" + "a".repeat(64), localScopeId: scope, expiresAt: Date.now() + 3600000 };
  assert.equal(localQaBinding(JSON.stringify(d), "android").origin, d.androidOrigin);
  assert.equal(localQaBinding(JSON.stringify(d), "ios").origin, d.iosOrigin);
  for (const patch of [{ iosOrigin: "https://www.askmagicmike.com" }, { androidOrigin: "http://192.168.1.20:35123" },
    { iosOrigin: "http://127.0.0.1:35124" }, { expiresAt: 0 }, { expiresAt: Date.now() + 7 * 3600000 },
    { verificationReceipt: "assumed-isolated" }, { password: "never-accepted" }]) assert.throws(() => localQaBinding(JSON.stringify({ ...d, ...patch }), "ios"));
  assert.throws(() => localQaBinding(JSON.stringify(d), "web"));
});
test("entry uses existing App and native primitives with QA absent by default", () => {
  const entry = fs.readFileSync(path.join(__dirname, "index.tsx"), "utf8");
  const runtime = fs.readFileSync(path.join(__dirname, "nativeRuntime.ts"), "utf8");
  assert.match(entry, /import App from "\.\/App"/); assert.match(entry, /createNativeRuntime\(descriptor\)/);
  assert.match(entry, /localQaBinding\(process\.env\.EXPO_PUBLIC_AMM_NATIVE_QA_BINDING, Platform\.OS\)/);
  assert.match(runtime, /Crypto\.randomUUID\(\)/); assert.match(runtime, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.doesNotMatch(runtime, /AsyncStorage|sessionStore|https:\/\//);
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "app.json")));
  assert.equal(config.expo.ios.bundleIdentifier, 'com.askmagicmike.r3preview');
  assert.equal(config.expo.android.package, 'com.askmagicmike.r3preview');
  assert.equal(config.expo.android.allowBackup, false);
  assert.equal(config.expo.updates.enabled, false);
  assert.equal(config.expo.extra?.eas, undefined); // local QA identity, not a fabricated store/project identity
  assert.deepEqual(config.expo.android.blockedPermissions, ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.VIBRATE']);
});
