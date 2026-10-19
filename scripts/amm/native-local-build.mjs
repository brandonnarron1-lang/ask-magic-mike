#!/usr/bin/env node
// LOCAL packaging only. No device launch, EAS, upload, OTA, account or send.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, copyFileSync, existsSync, realpathSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { localQaBinding } from "../../clients/native/qaBinding.ts";
import { internalBetaBinding } from "../../clients/native/betaBinding.ts";
import { androidBetaSigning } from "./native-beta-signing.mjs";

const platform = process.argv[2];
if (!["ios", "android"].includes(platform) || process.argv.length !== 3) throw Error("explicit_platform_ios_or_android_required");
if (Number(process.versions.node.split(".")[0]) !== 24) throw Error("pinned_node24_required");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../.."), native = join(root, "clients/native");
const buildRoot = process.env.AMM_NATIVE_BUILD_ROOT;
if (!buildRoot || !buildRoot.startsWith("/") || buildRoot === "/" || buildRoot === process.env.HOME || buildRoot === root) throw Error("explicit_task_owned_build_root_required");
mkdirSync(buildRoot, { recursive: true });
if (realpathSync(buildRoot).includes("WYTS") || realpathSync(buildRoot).includes("PropertyLens")) throw Error("other_project_build_root_rejected");
const descriptorPath = process.env.AMM_NATIVE_QA_DESCRIPTOR_FILE;
const raw = descriptorPath ? readFileSync(descriptorPath, "utf8") : undefined;
const qa = localQaBinding(raw, platform);
const betaRaw = process.env.AMM_NATIVE_BETA_DESCRIPTOR_FILE ? readFileSync(process.env.AMM_NATIVE_BETA_DESCRIPTOR_FILE, "utf8") : undefined;
const beta = internalBetaBinding(betaRaw);
if (qa && beta) throw Error("mixed_native_venues_refused");
if (beta && beta.expiresAt <= Date.now()) throw Error("expired_beta_build_refused");
const binding = beta ?? qa;
const mode = beta ? `internal-beta-${platform}-${beta.localScopeId}` : qa ? `synthetic-${platform}-${qa.localScopeId}` : "disconnected";
const out = join(buildRoot, "artifacts", mode, String(Date.now())); mkdirSync(out, { recursive: true });
const log = join(out, `build-${platform}-${Date.now()}.log`); writeFileSync(log, "", { mode: 0o600 });
const env = {
  PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: "en_US.UTF-8", CI: "1",
  NODE_BINARY: process.execPath, NODE_OPTIONS: "--dns-result-order=ipv4first", EXPO_OFFLINE: "1", EXPO_NO_TELEMETRY: "1", EXPO_NO_DOTENV: "1",
  COCOAPODS_DISABLE_STATS: "true", CP_HOME_DIR: join(buildRoot, "cocoapods"), CP_CACHE_DIR: join(buildRoot, "cocoapods/cache"),
  ...(qa ? { EXPO_PUBLIC_AMM_NATIVE_QA_BINDING: raw } : {}),
  ...(beta ? { EXPO_PUBLIC_AMM_NATIVE_BETA_BINDING: betaRaw, AMM_NATIVE_BETA_VERSION_CODE: process.env.AMM_NATIVE_BETA_VERSION_CODE || "1" } : {}),
  ...(platform === "android" ? { JAVA_HOME: process.env.JAVA_HOME, ANDROID_HOME: process.env.ANDROID_HOME, ANDROID_SDK_ROOT: process.env.ANDROID_HOME,
    GRADLE_USER_HOME: join(buildRoot, "gradle") } : {}),
}; // No server env, model/database key, account/session or provider credential.
async function run(command, args, cwd = native) {
  appendFileSync(log, JSON.stringify({ command, args, cwd }) + "\n");
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", bytes => appendFileSync(log, bytes));
  const timer = setTimeout(() => child.kill("SIGTERM"), 25 * 60000);
  const exit = await new Promise((done, fail) => { child.on("error", fail); child.on("exit", done); }); clearTimeout(timer);
  if (exit !== 0) throw Error(`native_build_failed:${exit};see ${log}`);
}
const start = Date.now();
function assertBundleBinding(bytes) {
  if (binding ? !bytes.includes(Buffer.from(binding.localScopeId)) : /(?:local-postgres|beta-provenance):[a-f0-9]{64}/.test(bytes.toString("latin1"))) throw Error("compiled_bundle_backend_identity_mismatch");
}
await run("pnpm", ["exec", "expo", "prebuild", "--platform", platform, "--no-install", "--skip-dependency-update", "react,react-native"]);
let artifact, ownerSigning;
if (platform === "ios") {
  // A Simulator-only entitlement input lets Xcode embed simulated entitlements
  // into __TEXT and keep the host ad-hoc signature unrestricted. Do NOT manually
  // codesign restricted iOS entitlements onto a macOS-executed Simulator image.
  copyFileSync(join(native, "Podfile.lock"), join(native, "ios/Podfile.lock"));
  await run("pod", ["install", "--deployment"], join(native, "ios"));
  const derived = join(buildRoot, "DerivedData");
  await run("xcodebuild", ["-workspace", "AskMagicMikeR3prototype.xcworkspace", "-scheme", "AskMagicMikeR3prototype", "-configuration", "Release",
    "-sdk", "iphonesimulator", "-destination", "generic/platform=iOS Simulator", "ARCHS=arm64", "-jobs", "2", "CODE_SIGNING_ALLOWED=YES", "CODE_SIGN_IDENTITY=-",
    `CODE_SIGN_ENTITLEMENTS=${join(native, beta ? "beta-simulator.entitlements" : "simulator.entitlements")}`, "-derivedDataPath", derived, "build"], join(native, "ios"));
  const app = join(derived, "Build/Products/Release-iphonesimulator/AskMagicMikeR3prototype.app");
  if (!existsSync(join(app, "main.jsbundle"))) throw Error("bundled_javascript_missing");
  assertBundleBinding(readFileSync(join(app, "main.jsbundle")));
  artifact = join(out, "AskMagicMike-ios-simulator-arm64.app.zip");
  await run("ditto", ["-ck", "--keepParent", app, artifact]);
} else {
  if (!env.JAVA_HOME || !env.ANDROID_HOME) throw Error("explicit_existing_jdk_and_sdk_required");
  const manifest = join(native, "android/app/src/main/AndroidManifest.xml");
  let xml = readFileSync(manifest, "utf8").replace(/ android:networkSecurityConfig="@xml\/amm_local_qa_network"/g, "");
  if (qa) {
    // This allowance exists ONLY in the QA-target artifact and ONLY for the
    // emulator's loopback alias. No global cleartext/network guard disablement.
    const resources = join(native, "android/app/src/main/res/xml"); mkdirSync(resources, { recursive: true });
    writeFileSync(join(resources, "amm_local_qa_network.xml"), '<?xml version="1.0" encoding="utf-8"?><network-security-config><base-config cleartextTrafficPermitted="false"/><domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">10.0.2.2</domain></domain-config></network-security-config>');
    xml = xml.replace('<application ', '<application android:networkSecurityConfig="@xml/amm_local_qa_network" ');
  }
  writeFileSync(manifest, xml);
  if (beta) {
    ownerSigning = androidBetaSigning(process.env.AMM_NATIVE_BETA_SIGNING_DIR, env.JAVA_HOME);
    Object.assign(env, { AMM_ANDROID_BETA_KEYSTORE: ownerSigning.keystore, AMM_ANDROID_BETA_PASSWORD: ownerSigning.password });
  }
  const gradlePath = join(native, "android/app/build.gradle");
  let gradle = readFileSync(gradlePath, "utf8").replace(/\n\/\/ AMM_BETA_SIGNING_BEGIN[\s\S]*?\/\/ AMM_BETA_SIGNING_END\n/g, "\n");
  if (beta) gradle += `\n// AMM_BETA_SIGNING_BEGIN
android.signingConfigs.create("ammOwnerBeta") {
  storeFile file(System.getenv("AMM_ANDROID_BETA_KEYSTORE"))
  storePassword System.getenv("AMM_ANDROID_BETA_PASSWORD")
  keyAlias "amm-owner-beta"
  keyPassword System.getenv("AMM_ANDROID_BETA_PASSWORD")
}
android.buildTypes.release.signingConfig = android.signingConfigs.ammOwnerBeta
// AMM_BETA_SIGNING_END\n`;
  writeFileSync(gradlePath, gradle);
  await run(process.env.AMM_NATIVE_GRADLE_BIN || "./gradlew", ["app:assembleRelease", "--no-daemon", "--no-parallel", "--max-workers=2", "--rerun-tasks", "-PreactNativeArchitectures=arm64-v8a", "-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=768m"], join(native, "android"));
  artifact = join(out, beta ? "AskMagicMike-android-arm64-internal-beta.apk" : "AskMagicMike-android-arm64-test-release.apk");
  assertBundleBinding(execFileSync("unzip", ["-p", join(native, "android/app/build/outputs/apk/release/app-release.apk"), "assets/index.android.bundle"], { maxBuffer: 32 * 1024 * 1024 }));
  copyFileSync(join(native, "android/app/build/outputs/apk/release/app-release.apk"), artifact);
}
const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const receipt = { at: new Date().toISOString(), platform, variant: "Release;bundled-JavaScript;no-Metro", applicationId: beta ? "com.askmagicmike.internalbeta" : "com.askmagicmike.r3preview", artifact,
  sha256: createHash("sha256").update(readFileSync(artifact)).digest("hex"), bytes: readFileSync(artifact).length,
  source: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]), dirty: !!git(["status", "--porcelain"]),
  backend: binding ? { kind: binding.kind, origin: binding.origin, expiresAt: binding.expiresAt, scope: binding.localScopeId, receipt: binding.verificationReceipt } : "DISCONNECTED",
  signing: platform === "ios" ? "local Simulator ad-hoc;not an Apple Development/device/distribution identity" : ownerSigning ? { kind: "owner-controlled-local-beta", certificateSHA256: ownerSigning.certificateSHA256, alias: ownerSigning.alias, versionCode: env.AMM_NATIVE_BETA_VERSION_CODE } : "Expo template Android debug certificate;NOT a store identity",
  milliseconds: Date.now() - start, log, uploaded: false, installed: false, distributed: false };
writeFileSync(join(out, `${platform}-build-receipt.json`), JSON.stringify(receipt, null, 2), { mode: 0o600 });
console.log(JSON.stringify(receipt));
