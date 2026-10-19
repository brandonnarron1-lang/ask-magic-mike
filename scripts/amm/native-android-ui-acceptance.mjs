#!/usr/bin/env node
// Exact task-owned emulator + fresh local SQL observer only. No provider,
// Production target, Metro, arbitrary device, replay or public intake action.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { android, assertOwnedBinaryAndroid, androidOpenBinary, androidTap, androidEnter, androidVisible, androidScreenshot, hierarchy } from "../../tests/support/android-native-ui.ts";
const [receiptPath, fixtureDir] = process.argv.slice(2);
if (!receiptPath || !fixtureDir || process.argv.length !== 4) throw Error("exact_build_receipt_and_private_fixture_directory_required");
const dir = resolve(fixtureDir);
if (!dir.startsWith(resolve(".amm-run") + "/")) throw Error("private_fixture_directory_required");
const build = JSON.parse(readFileSync(receiptPath, "utf8")), ready = JSON.parse(readFileSync(join(dir, "native-ready.json"), "utf8"));
if (build.platform !== "android" || build.applicationId !== "com.askmagicmike.r3preview" || build.backend.kind !== "verified-local-loopback"
  || build.backend.origin !== ready.descriptor.androidOrigin || build.backend.scope !== ready.descriptor.localScopeId
  || ready.noSend !== true || ready.descriptor.expiresAt <= Date.now() || ready.platform !== "android"
  || createHash("sha256").update(readFileSync(build.artifact)).digest("hex") !== build.sha256) throw Error("fresh_verified_android_binary_binding_required");
const device = assertOwnedBinaryAndroid();
const stages = [];
const stage = (name, facts = {}) => { stages.push({ at: new Date().toISOString(), name, ...facts }); writeFileSync(join(dir, "android-ui-stages.json"), JSON.stringify(stages, null, 2), { mode: 0o600 }); console.log(name); };
const proof = { scope: ready.descriptor.localScopeId, platform: "android", binarySha256: build.sha256, observation: "actual-own-binary-ui" };
const previousFont = android(["shell", "settings", "get", "system", "font_scale"]);
try {
  android(["shell", "settings", "put", "system", "font_scale", "1"]); androidOpenBinary();
  await androidVisible("Your next step, at your pace");
  await androidVisible("Synthetic QA connection · no customer messages.");
  stage("OWN_BINARY_RENDERED", { device, metro: false, build: build.sha256 });
  await androidTap("My Plan"); await androidTap("Delete local saved interests + plan", true);
  await androidTap("Saved"); await androidEnter("Desired area (500 characters)", "SYNTHETIC Wilson"); await androidTap("Save locally — sends nothing", true);
  await androidTap("Saved"); await androidEnter("Desired area (500 characters)", "SYNTHETIC Elm City"); await androidTap("Save locally — sends nothing", true);
  await androidTap("Select for comparison", true); await androidTap("Select for comparison", true);
  await androidVisible("Comparison — your declarations only", { scroll: true }); androidScreenshot(join(dir, "android-comparison.png"));
  await androidTap("My Plan"); await androidEnter("Buying needs (1,000 characters; one paragraph)", "SYNTHETIC yard preference"); await androidTap("Save my plan locally", true);
  androidOpenBinary(); await androidVisible("Your next step, at your pace"); await androidTap("My Plan"); await androidVisible("SYNTHETIC yard preference", { scroll: true });
  await androidTap("Saved"); await androidVisible("SYNTHETIC Wilson", { scroll: true }); await androidVisible("SYNTHETIC Elm City", { scroll: true });
  stage("PRIVATE_PLAN_COMPARISON_RESTART_PASS");
  await androidTap("Ask Mike"); await androidEnter("Public process question (2,000 characters)", "How do I buy a home"); await androidTap("Ask Mike’s assistant", true);
  await androidVisible("Source-supported guidance", { scroll: true }); await androidVisible("Our Town: approved service and intake requirements", { scroll: true }); androidScreenshot(join(dir, "android-cited-answer.png"));
  await androidTap("Helpful", true); await androidVisible("Recorded: helpful · open · review revision 1", { scroll: true }); androidScreenshot(join(dir, "android-feedback.png"));
  androidOpenBinary(); await androidVisible("Your next step, at your pace"); await androidTap("Ask Mike"); await androidTap("Recheck saved answer + feedback", true);
  await androidVisible("Recorded: helpful · open · review revision 1", { scroll: true }); androidScreenshot(join(dir, "android-recheck.png"));
  stage("CITED_ANSWER_FEEDBACK_RECEIPT_RESTART_PASS");
  writeFileSync(join(dir, "ui-feedback-complete.json"), JSON.stringify({ ...proof, at: new Date().toISOString(), assertions: ["saved-comparison-plan", "restart-persistence", "cited-answer", "feedback", "receipt-recheck"], screenshots: ["android-comparison.png", "android-feedback.png", "android-recheck.png"] }, null, 2), { mode: 0o600 });
  const deadline = Date.now() + 60000;
  while (!existsSync(join(dir, "native-revoked.json"))) { if (Date.now() > deadline) throw Error("isolated_revocation_observer_not_ready"); await new Promise(r => setTimeout(r, 500)); }
  const revoked = JSON.parse(readFileSync(join(dir, "native-revoked.json"), "utf8")); if (revoked.scope !== proof.scope) throw Error("revocation_scope_mismatch");
  await androidTap("Home"); await androidTap("Ask Mike"); await androidTap("Recheck saved answer + feedback", true);
  await androidVisible("Answer unavailable or unverified. Recheck explicitly. Asking again is a new request, not a recovered receipt.");
  if (hierarchy().nodes.some(n => n.text === "Source-supported guidance" || n.text === "Recorded: helpful · open · review revision 1")) throw Error("revoked_native_answer_leak");
  androidScreenshot(join(dir, "android-revoked.png"));
  android(["shell", "settings", "put", "system", "font_scale", "2"]); await androidTap("My Plan"); await androidVisible("SYNTHETIC yard preference", { scroll: true });
  await androidVisible("Save my plan locally", { scroll: true }); androidScreenshot(join(dir, "android-plan-200percent.png"));
  stage("REVOCATION_LOCAL_PLAN_AND_200PERCENT_PASS");
  writeFileSync(join(dir, "ui-revocation-complete.json"), JSON.stringify({ ...proof, at: new Date().toISOString(), assertions: ["revoked-answer-hidden", "local-plan-retained", "no-automatic-retry"], screenshots: ["android-revoked.png", "android-plan-200percent.png"] }, null, 2), { mode: 0o600 });
} finally { if (/^\d+(\.\d+)?$/.test(previousFont)) android(["shell", "settings", "put", "system", "font_scale", previousFont]); }
