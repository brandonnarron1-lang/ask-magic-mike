// Deterministic PURE-module checks only: no RN runtime, server, network or model.
// Transpile in memory using the existing compiler; no install/cache/output.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("../../node_modules/typescript");
const root = path.resolve(__dirname, "../..");
const allowed = new Set([
  ...["contracts.ts", "localPlan.ts", "transport.ts"].map(file => path.join(__dirname, file)),
  ...["app/lib/groundedConciergeContract.ts", "app/lib/experienceContract.ts", "app/lib/consumerInterests.ts", "app/lib/buyerInterest.ts",
    "app/lib/client/publicIntakeReview.ts", "app/lib/leadContactValidation.ts", "config/experience-contract.v1.json"].map(file => path.join(root, file)),
]);
const modules = new Map();
function load(file) {
  assert.ok(allowed.has(file), "No unreviewed/server module may enter the pure dependency graph");
  if (modules.has(file)) return modules.get(file).exports;
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  const result = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
  const loadedModule = { exports: {} }; modules.set(file, loadedModule);
  new Function("require", "module", "exports", result.outputText)(specifier => {
    assert.ok(specifier.startsWith("."), "No native/server package dependency in pure modules");
    const target = path.resolve(path.dirname(file), specifier);
    return load(target.endsWith(".json") ? target : `${target}.ts`);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const contracts = load(path.join(__dirname, "contracts.ts"));
const local = load(path.join(__dirname, "localPlan.ts"));
const { R2Client, readCurrentAnswer, readFeedback } = load(path.join(__dirname, "transport.ts"));
const now = Date.parse("2026-10-19T12:00:00Z");
const answerId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
const scope = "33333333-3333-4333-8333-333333333333";
const sourceRefs = [{ sourceId: "ourtown-experience", versionId: "44444444-4444-4444-8444-444444444444", revision: 3 }];
// Synthetic wire fixtures, NEVER displayed as a current/live model response.
const answer = () => ({ answerId, revision: 1, currentSourceValidity: "valid", sourceRefs,
  mode: "approved_source", message: "SYNTHETIC approved service guidance.", limitation: "SYNTHETIC; not Mike personally.",
  citations: [{ id: "offer-buyer", title: "Synthetic service source", url: "https://www.askmagicmike.com/api/experience/v1", version: "synthetic-v1", asOf: "2026-10-19T11:00:00Z" }] });
const feedback = () => ({ id: "55555555-5555-4555-8555-555555555555", kind: "helpful", category: null, status: "open", revision: 1,
  createdAt: "2026-10-19T11:30:00Z", expiresAt: "2026-10-20T11:30:00Z" });
const ok = body => ({ status: 200, body });
function harness(responses, store = local.sessionStore(), onRequest = () => {}) {
  const calls = [];
  const qa = { kind: "verified-isolated-qa", origin: "https://synthetic.invalid", verificationReceipt: "synthetic-test-only", localScopeId: scope,
    session: { audience: "consumer-or-guest", async request(input) {
      calls.push(input); await onRequest(input);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      assert.ok(next, "Unexpected network attempt in deterministic adapter");
      return next;
    } } };
  const client = new R2Client(store, qa, () => requestId, () => now);
  return { client, calls, store, qa };
}
async function asked(responses = [], store, onRequest) {
  const h = harness([ok(answer()), ...responses], store, onRequest);
  await h.client.restore(); await h.client.ask("How do I prepare a buying plan?"); return h;
}

test("pure TypeScript contracts and transport typecheck without emitted files", () => {
  const options = { noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, resolveJsonModule: true, esModuleInterop: true, types: [], lib: ["lib.es2022.d.ts", "lib.dom.d.ts"] };
  const program = ts.createProgram(["contracts.ts", "localPlan.ts", "transport.ts"].map(file => path.join(__dirname, file)), options);
  const errors = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => "\n" }));
});
test("uses the actual bundled public contracts and guest validator", () => {
  assert.equal(contracts.PUBLIC_KNOWLEDGE_VERSION, "amm.public-knowledge.v1");
  assert.equal(contracts.experienceDestination("compare"), "/sell?seller_option=compare");
  const p = local.addInterest(local.emptyPlan(now), "search", "Declared area", "Declared budget", "local-1");
  assert.equal(p.interests[0].provenance, "user_reported_unverified");
  assert.equal(p.interests[0].declared.budget_range, "Declared budget");
  assert.deepEqual(local.readPlan(JSON.stringify(p), now), p);
});
test("local references reject links, duplicate IDs, controls and overflow", () => {
  const p = local.emptyPlan(now);
  for (const value of ["https://example.invalid/?email=private", "//example.invalid", "bad\u0000reference", "x".repeat(501)]) {
    assert.throws(() => local.addInterest(p, "property", value, "", "local-1"));
  }
  let full = p;
  for (let i = 1; i <= 8; i++) full = local.addInterest(full, "search", "Declared area", "", `local-${i}`);
  assert.throws(() => local.addInterest(full, "search", "Ninth", "", "local-9"));
  assert.throws(() => local.addInterest(full, "search", "Duplicate", "", "local-1"));
});
test("local plan roundtrip, explicit delete and expiry are device-only", async () => {
  const store = local.sessionStore();
  const p = { ...local.emptyPlan(now), needs: "Declared needs", sellerDone: [0] };
  await local.savePlan(store, p, now);
  assert.deepEqual(await local.loadPlan(store, now), p);
  assert.deepEqual((await local.loadPlan(store, now + local.LOCAL_RETENTION_MS + 1)).interests, []);
  assert.equal(await store.getItem("amm-r3-local-plan-v1"), null);
  await local.savePlan(store, p, now); await local.deletePlan(store);
  assert.equal((await local.loadPlan(store, now)).needs, "");
});
test("comparison selection survives a local reload and rejects unknown IDs", async () => {
  const store = local.sessionStore();
  let p = local.addInterest(local.emptyPlan(now), "search", "Area one", "", "local-1");
  p = local.addInterest(p, "property", "Reference two", "", "local-2");
  p.compareIds = ["local-1", "local-2"];
  await local.savePlan(store, p, now);
  assert.deepEqual((await local.loadPlan(store, now)).compareIds, p.compareIds);
  assert.throws(() => local.readPlan(JSON.stringify({ ...p, compareIds: ["not-saved"] }), now));
});
test("untrusted persistence is revalidated and not overwritten on malformed read", async () => {
  const store = local.sessionStore();
  await store.setItem("amm-r3-local-plan-v1", "malformed-private-data");
  await assert.rejects(local.loadPlan(store, now));
  assert.equal(await store.getItem("amm-r3-local-plan-v1"), "malformed-private-data");
  const p = local.addInterest(local.emptyPlan(now), "search", "Area", "", "local-1");
  p.interests[0].provenance = "verified";
  assert.throws(() => local.readPlan(JSON.stringify(p), now));
});
test("default disconnected client has no transport or automatic calls", async () => {
  const c = new R2Client(local.sessionStore()); await c.restore();
  assert.equal(c.connected, false); assert.equal(c.snapshot().answer, null);
  await assert.rejects(c.ask("Buying plan"), /binding/);
});
test("binding rejects plaintext, credentials, paths and staff audiences", () => {
  const { qa, store } = harness([]);
  for (const origin of ["http://synthetic.invalid", "https://synthetic.invalid/api", "https://user:password@synthetic.invalid"]) {
    assert.throws(() => new R2Client(store, { ...qa, origin }));
  }
  assert.throws(() => new R2Client(store, { ...qa, session: { ...qa.session, audience: "staff" } }));
});
test("chat uses actual alias/version and persists only opaque receipt, not text", async () => {
  const { client, calls, store } = await asked();
  assert.equal(calls.length, 1); assert.equal(calls[0].path, "/api/chat/message");
  assert.deepEqual(JSON.parse(calls[0].body), { message: "How do I prepare a buying plan?", knowledge_version: contracts.PUBLIC_KNOWLEDGE_VERSION });
  assert.deepEqual(client.snapshot().answer.sourceRefs, sourceRefs);
  const journal = await store.getItem(`amm-r3-receipts-v1.${scope}`);
  assert.ok(!journal.includes("guidance")); assert.ok(!journal.includes("buying plan"));
  client.hideAnswer(); assert.equal(client.snapshot().answer, null);
  assert.equal(client.snapshot().receipt.answerId, answerId);
});
test("rejects legacy/model fallback, missing receipt, bad citations and source refs", () => {
  const a = answer();
  for (const raw of [{ message: "uncited model text", mode: "responses_api" }, { ...a, answerId: null }, { ...a, revision: 0 },
    { ...a, currentSourceValidity: "source_invalid" }, { ...a, citations: [] }, { ...a, sourceRefs: [] },
    { ...a, citations: [{ ...a.citations[0], url: "https://evil.invalid/?private=value" }] },
    { ...a, citations: [{ ...a.citations[0], asOf: "not-a-date" }] }]) assert.throws(() => readCurrentAnswer(raw));
});
test("explicit scoped recheck reads real nested reply and feedback shape", async () => {
  const h = await asked([ok({ ok: true, answerId, revision: 1, currentSourceValidity: "valid", reply: answer() }), ok({ ok: true, feedback: [feedback()] })]);
  h.client.hideAnswer(); await h.client.recheck();
  assert.equal(h.calls[1].path, `/api/intelligence/answers?id=${answerId}`);
  assert.equal(h.calls[2].path, `/api/intelligence/feedback?answerId=${answerId}&revision=1`);
  assert.equal(h.client.snapshot().feedback[0].id, feedback().id);
});
for (const status of [401, 403, 404, 429, 503]) test(`HTTP ${status} clears previously released answer`, async () => {
  const h = await asked([{ status, body: { error: "private server detail" } }]);
  await assert.rejects(h.client.recheck());
  assert.equal(h.client.snapshot().answer, null); assert.deepEqual(h.client.snapshot().feedback, []);
  assert.ok(!h.client.snapshot().notice.includes("private server detail"));
});
test("source invalid suppresses historical text and does not request feedback", async () => {
  const h = await asked([ok({ ok: true, answerId, revision: 1, currentSourceValidity: "source_invalid", message: "historical" })]);
  await assert.rejects(h.client.recheck());
  assert.equal(h.client.snapshot().validity, "source_invalid"); assert.equal(h.client.snapshot().answer, null); assert.equal(h.calls.length, 2);
});
test("recheck rejects a copied/mismatched receipt or changed revision", async () => {
  const h = await asked([ok({ ok: true, ...answer(), revision: 2, reply: answer() })]);
  await assert.rejects(h.client.recheck()); assert.equal(h.client.snapshot().answer, null);
});
test("feedback persists key before POST and validates actual acknowledgment", async () => {
  const store = local.sessionStore();
  const h = await asked([ok({ ok: true, replayed: false, feedback: feedback() })], store, async input => {
    if (input.path === "/api/intelligence/feedback") {
      const journal = JSON.parse(await store.getItem(`amm-r3-receipts-v1.${scope}`));
      assert.equal(journal.pending.requestId, requestId);
      assert.deepEqual(JSON.parse(input.body), journal.pending);
    }
  });
  await h.client.feedback("helpful");
  assert.equal(h.client.snapshot().pending, null); assert.equal(h.client.snapshot().feedback[0].id, feedback().id);
});
test("ambiguous feedback survives reload; changed payload blocked; exact retry only", async () => {
  const h = await asked([Error("ambiguous after server commit")]);
  await assert.rejects(h.client.feedback("helpful"));
  await assert.rejects(h.client.feedback("not_helpful"), /saved request/);
  const pendingBody = h.calls[1].body;
  const h2 = harness([ok({ ok: true, replayed: true, feedback: feedback() })], h.store);
  await h2.client.restore(); assert.equal(h2.calls.length, 0); assert.equal(h2.client.snapshot().answer, null);
  await h2.client.retryFeedback();
  assert.equal(h2.calls[0].body, pendingBody); assert.equal(h2.client.snapshot().pending, null);
});
test("repeated failure and 409 never rotate an ambiguous key", async () => {
  const h = await asked([Error("ambiguous"), { status: 409, body: { ok: false } }, Error("offline")]);
  await assert.rejects(h.client.feedback("helpful"));
  await assert.rejects(h.client.retryFeedback()); await assert.rejects(h.client.retryFeedback());
  assert.equal(h.calls[1].body, h.calls[2].body); assert.equal(h.calls[2].body, h.calls[3].body);
  assert.equal(h.client.snapshot().pending.requestId, requestId);
});
test("failed protected-store write prevents any feedback send", async () => {
  const store = local.sessionStore(); const h = await asked([], store);
  store.setItem = async () => { throw Error("store unavailable"); };
  await assert.rejects(h.client.feedback("helpful")); assert.equal(h.calls.length, 1);
});
test("failed local ack write retains the already accepted server request key", async () => {
  const store = local.sessionStore(); const original = store.setItem;
  const h = await asked([ok({ ok: true, replayed: false, feedback: feedback() }), ok({ ok: true, replayed: true, feedback: feedback() })], store);
  let writes = 0;
  store.setItem = async (key, value) => { if (++writes === 2) throw Error("ack write failed"); await original(key, value); };
  await assert.rejects(h.client.feedback("helpful")); assert.equal(h.client.snapshot().pending.requestId, requestId);
  await h.client.retryFeedback(); assert.equal(h.calls[1].body, h.calls[2].body); assert.equal(h.client.snapshot().pending, null);
});
test("mismatched or malformed feedback acknowledgment leaves retry identity intact", async () => {
  const h = await asked([ok({ ok: true, replayed: false, feedback: { ...feedback(), kind: "not_helpful" } })]);
  await assert.rejects(h.client.feedback("helpful")); assert.equal(h.client.snapshot().pending.requestId, requestId);
  for (const raw of [{ ...feedback(), id: "forged" }, { ...feedback(), expiresAt: "2026-10-18T00:00:00Z" }, { ...feedback(), category: "other" }]) assert.throws(() => readFeedback(raw, now));
});
test("exact report replay accepts current staff classification without changing the pending payload", async () => {
  const h = await asked([Error("acknowledgment lost"), ok({ ok: true, replayed: true,
    feedback: { ...feedback(), kind: "report", category: "unsupported_citation", revision: 2 } })]);
  await assert.rejects(h.client.feedback("report", "incorrect_claim"));
  const body = h.calls[1].body;
  await h.client.retryFeedback();
  assert.equal(h.calls[2].body, body); assert.equal(h.client.snapshot().pending, null);
  assert.equal(h.client.snapshot().feedback[0].category, "unsupported_citation");
});
test("small device-clock skew accepts server receipts, but far-future or expired data stays rejected", () => {
  const receipt = { ...feedback(), createdAt: new Date(now + 10000).toISOString(), expiresAt: new Date(now + 600000).toISOString() };
  assert.equal(readFeedback(receipt, now).id, receipt.id);
  assert.throws(() => readFeedback({ ...receipt, createdAt: new Date(now + 180000).toISOString() }, now));
  assert.throws(() => readFeedback({ ...receipt, expiresAt: new Date(now - 1).toISOString() }, now));
});
test("a different local session scope cannot restore another scope's receipts", async () => {
  const h = await asked([Error("ambiguous")]); await assert.rejects(h.client.feedback("helpful"));
  const c = new R2Client(h.store, { ...h.qa, localScopeId: "66666666-6666-4666-8666-666666666666" }, () => requestId, () => now);
  await c.restore(); assert.equal(c.snapshot().receipt, null); assert.equal(c.snapshot().pending, null);
});
test("untrusted pending journal cannot add fields or change answer binding", async () => {
  const h = await asked([Error("ambiguous")]); await assert.rejects(h.client.feedback("helpful"));
  const key = `amm-r3-receipts-v1.${scope}`;
  const journal = JSON.parse(await h.store.getItem(key));
  await h.store.setItem(key, JSON.stringify({ ...journal, pending: { ...journal.pending, privateField: "never send" } }));
  await assert.rejects(harness([], h.store).client.restore());
  await h.store.setItem(key, JSON.stringify({ ...journal, pending: { ...journal.pending, revision: 2 } }));
  await assert.rejects(harness([], h.store).client.restore());
});
test("background/tab epoch fence suppresses a late answer without replay", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = harness([ok(answer())], local.sessionStore(), () => gate);
  await h.client.restore(); const inflight = h.client.ask("Buying plan");
  h.client.hideAnswer(); release(); await inflight;
  assert.equal(h.client.snapshot().answer, null); assert.equal(h.calls.length, 1);
});
test("a concurrent interaction cannot double-submit feedback", async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const h = await asked([ok({ ok: true, replayed: false, feedback: feedback() })], local.sessionStore(), input => input.path === "/api/intelligence/feedback" ? gate : undefined);
  const inflight = h.client.feedback("helpful");
  await assert.rejects(h.client.feedback("not_helpful"));
  release(); await inflight; assert.equal(h.calls.length, 2);
});
test("App source parses as TSX; NOT a native typecheck or rendering test", () => {
  const result = ts.transpileModule(fs.readFileSync(path.join(__dirname, "App.tsx"), "utf8"), {
    fileName: "App.tsx", reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  assert.deepEqual(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), []);
});
