import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const ADB = "/opt/homebrew/share/android-commandlinetools/platform-tools/adb";
const SERIAL = "emulator-5560";
const DEVICE = "amm_r3_qa_20261019";
const HOST = "host.exp.exponent"; // Verified vendor APK, not a fabricated product ID.
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export function android(args: string[]) {
  return execFileSync(ADB, ["-s", SERIAL, ...args], { encoding: "utf8", timeout: 20000, maxBuffer: 8e6 }).trim();
}
export function assertOwnedAndroid() {
  if (android(["shell", "getprop", "ro.boot.qemu.avd_name"]) !== DEVICE || android(["shell", "getprop", "sys.boot_completed"]) !== "1"
    || android(["shell", "getprop", "ro.build.version.sdk"]) !== "35" || !android(["shell", "dumpsys", "package", HOST]).includes("versionName=57.0.9")) throw Error("exact_owned_synthetic_vendor_host_required");
  return { serial: SERIAL, avd: DEVICE, sdk: 35, vendorHost: HOST, vendorVersion: "57.0.9", ownAppIdentity: false };
}
export function assertOwnedBinaryAndroid() {
  const app = "com.askmagicmike.r3preview";
  if (android(["shell", "getprop", "ro.boot.qemu.avd_name"]) !== DEVICE || android(["shell", "getprop", "sys.boot_completed"]) !== "1"
    || android(["shell", "getprop", "ro.build.version.sdk"]) !== "35" || !android(["shell", "dumpsys", "package", app]).includes("versionName=0.0.0")) throw Error("exact_owned_synthetic_app_required");
  return { serial: SERIAL, avd: DEVICE, sdk: 35, app, ownBinary: true };
}
export function androidOpenBinary() {
  const device = assertOwnedBinaryAndroid();
  android(["shell", "am", "start", "-S", "-W", "-n", `${device.app}/.MainActivity`]);
}
export function hierarchy() {
  const xml = android(["exec-out", "uiautomator", "dump", "/dev/tty"]);
  const decode = (text: string) => text.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const nodes = [...xml.matchAll(/<node\s+([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([a-zA-Z0-9_-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])])));
  return { xml, nodes };
}
export async function androidVisible(label: string, options: { scroll?: boolean; timeoutMs?: number } = {}) {
  const end = Date.now() + (options.timeoutMs ?? 25000);
  let swipes = 0;
  do {
    const current = hierarchy();
    // Prefer the accessible control over its preceding visible text label.
    // Typing into a label leaves Expo's global developer shortcuts active.
    const node = current.nodes.find(n => n["content-desc"] === label) ?? current.nodes.find(n => n.text === label);
    if (node) return node;
    if (options.scroll && swipes++ < 9) android(["shell", "input", "swipe", "540", "1770", "540", "760", "220"]);
    await pause(150);
  } while (Date.now() < end);
  throw Error("native_visible_target_unavailable:" + label);
}
export async function androidTap(label: string, scroll = false) {
  const node = await androidVisible(label, { scroll });
  const bounds = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(node.bounds || "");
  if (!bounds || node.enabled === "false") throw Error("native_target_not_actionable:" + label);
  const [left, top, right, bottom] = bounds.slice(1).map(Number);
  if (right <= left || bottom <= top) throw Error("native_target_has_no_geometry");
  android(["shell", "input", "tap", String(Math.round((left + right) / 2)), String(Math.round((top + bottom) / 2))]);
  await pause(180);
}
export async function androidEnter(label: string, syntheticText: string) {
  if (!/^[A-Za-z0-9 %.-]{1,100}$/.test(syntheticText)) throw Error("bounded_synthetic_keyboard_input_required");
  await androidTap(label, true);
  const field = await androidVisible(label);
  if (field.class !== "android.widget.EditText" || field.focused !== "true") throw Error("native_input_focus_required:" + label);
  android(["shell", "input", "text", syntheticText.replaceAll(" ", "%s")]);
  android(["shell", "input", "keyevent", "111"]); // Hide keyboard, not a save or form submission.
  await pause(180);
}
export function androidScreenshot(file: string) {
  writeFileSync(file, execFileSync(ADB, ["-s", SERIAL, "exec-out", "screencap", "-p"], { timeout: 20000, maxBuffer: 8e6 }), { mode: 0o600 });
}
export function androidOpen(metroPort: number, restart = false) {
  assertOwnedAndroid();
  android(["reverse", "tcp:" + metroPort, "tcp:" + metroPort]);
  if (restart) {
    // Expo Go's deep-link-only LauncherActivity may exit when its process was
    // revived by a vendor background job after force-stop. Start the package's
    // real MAIN/LAUNCHER first, then the local experience (no data reset).
    android(["shell", "am", "start", "-S", "-W", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER", HOST]);
  }
  android(["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", `exp://127.0.0.1:${metroPort}`, HOST]);
}
export async function androidVendorStartup() {
  const end = Date.now() + 45000;
  do {
    const nodes = hierarchy().nodes;
    if (nodes.some(n => n.text === "Inspect") && nodes.some(n => n.text === "Touchables")) {
      // A vendor inspector intercepts product taps. Disable only that observed
      // tool, never advance a product flow or dismiss an unknown permission.
      android(["shell", "input", "keyevent", "82"]);
      await androidVisible("Toggle element inspector");
      await androidTap("Toggle element inspector");
      continue;
    }
    if (nodes.some(n => n.text === "Your next step, at your pace")) return;
    // Expo Go's first-launch developer-menu explanation is not a permission,
    // account login or product action. Never accept arbitrary Continue dialogs.
    if (nodes.some(n => n.text?.startsWith("This is the developer menu. It gives you access"))) {
      await androidTap("Continue");
    }
    if (nodes.some(n => n.text === "SDK version: 57.0.0") && nodes.some(n => n.text === "DevTools") && nodes.some(n => n["content-desc"] === "Close")) {
      await androidTap("Close");
    }
    await pause(300);
  } while (Date.now() < end);
  throw Error("native_vendor_startup_not_completed");
}
