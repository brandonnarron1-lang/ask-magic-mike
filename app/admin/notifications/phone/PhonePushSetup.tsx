"use client";

import { useCallback, useEffect, useState } from "react";

type Role = "primary" | "copy";
type Device = { id: string; role: Role; device: string };
type SetupMode = "admin" | "brandon";
type PhonePushCapabilities = {
  isIos: boolean;
  isStandalone: boolean;
  hasNotification: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
};

export type PhonePushReadiness = {
  canRegister: boolean;
  needsIosHomeScreen: boolean;
  message: string;
};

function browserCapabilities(): PhonePushCapabilities {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isIos: false, isStandalone: false, hasNotification: false, hasServiceWorker: false, hasPushManager: false };
  }
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return {
    isIos,
    isStandalone: window.matchMedia?.("(display-mode: standalone)").matches === true || navigatorWithStandalone.standalone === true,
    hasNotification: "Notification" in window,
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
  };
}

export function phonePushReadiness(publicKey: string, capabilities = browserCapabilities()): PhonePushReadiness {
  if (!publicKey) {
    return { canRegister: false, needsIosHomeScreen: false, message: "Phone alerts are not configured on the server yet." };
  }
  if (capabilities.isIos && !capabilities.isStandalone) {
    return {
      canRegister: false,
      needsIosHomeScreen: true,
      message: "Finish iPhone setup from the installed Home Screen app. Apple blocks push registration inside Messages and ordinary Safari tabs.",
    };
  }
  if (!capabilities.hasNotification || !capabilities.hasServiceWorker || !capabilities.hasPushManager) {
    return {
      canRegister: false,
      needsIosHomeScreen: false,
      message: "This browser cannot enable phone alerts. Use the installed Home Screen app on iPhone/iPad, or a current Android or desktop browser.",
    };
  }
  return { canRegister: true, needsIosHomeScreen: false, message: "Ready to register this phone." };
}

export function phonePushCapabilityError(publicKey: string) {
  const readiness = phonePushReadiness(publicKey);
  return readiness.canRegister ? null : readiness.message;
}

function decodeKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PhonePushSetup({ publicKey, mode = "admin" }: { publicKey: string; mode?: SetupMode }) {
  const [role, setRole] = useState<Role>(mode === "brandon" ? "copy" : "primary");
  const [status, setStatus] = useState("Checking this device…");
  const [devices, setDevices] = useState<Device[]>([]);
  const [registeredCopyId, setRegisteredCopyId] = useState<string | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(mode === "admin");
  const [processing, setProcessing] = useState(false);
  const [readiness, setReadiness] = useState<PhonePushReadiness | null>(null);

  const refresh = useCallback(async (markReady = false) => {
    if (markReady) {
      const current = phonePushReadiness(publicKey);
      setReadiness(current);
      setStatus(current.message);
    }
    if (mode === "brandon") {
      setLoadingDevices(false);
      return;
    }
    setLoadingDevices(true);
    try {
      const response = await fetch("/admin/api/push/subscriptions", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("subscription_list_failed");
      setDevices(Array.isArray(result.subscriptions) ? result.subscriptions : []);
    } catch {
      if (!markReady) setStatus("Registered devices could not be loaded. Check your connection and try again.");
    } finally {
      setLoadingDevices(false);
    }
  }, [mode, publicKey]);

  useEffect(() => { void refresh(true); }, [refresh]);

  async function enable() {
    const current = phonePushReadiness(publicKey);
    setReadiness(current);
    if (!current.canRegister) {
      setStatus(current.message);
      return;
    }
    setProcessing(true);
    try {
      setStatus("Requesting notification permission…");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Notifications were not allowed. Enable them in browser or phone settings and try again.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      });
      const setupMode = mode === "brandon";
      const response = await fetch(setupMode ? "/api/phone-alerts/subscription" : "/admin/api/push/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(setupMode ? { "X-AMM-Phone-Setup": "1" } : {}),
        },
        body: JSON.stringify(setupMode
          ? { subscription: subscription.toJSON() }
          : { role, subscription: subscription.toJSON() }),
      });
      const result = await response.json().catch(() => ({})) as { id?: unknown; error?: unknown };
      if (!response.ok) {
        if (response.status === 401) throw new Error("phone_setup_session_expired");
        throw new Error(typeof result.error === "string" ? result.error : "subscription_registration_failed");
      }
      if (setupMode && typeof result.id === "string") setRegisteredCopyId(result.id);
      await refresh();
      setStatus(`Phone alerts enabled for the ${setupMode || role === "copy" ? "Brandon copy" : "Mike"} role.`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "registration_failed";
      if (code === "phone_setup_session_expired") {
        setStatus("This secure setup link expired. Request a fresh Brandon setup link and add it to the Home Screen again.");
      } else {
        setStatus(`Secure phone registration failed (${code.replace(/[^a-z0-9_-]/gi, "_").slice(0, 48)}). Check notification settings and try again.`);
      }
    } finally {
      setProcessing(false);
    }
  }

  async function copySetupLink() {
    try {
      const path = mode === "brandon" ? "/phone-alerts/setup" : "/admin/notifications/phone";
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setStatus("Setup link copied. Open Safari, paste the link, then use Share → Add to Home Screen.");
    } catch {
      setStatus("In Messages, tap ••• → Open in Safari. Then use Safari Share → Add to Home Screen.");
    }
  }

  async function remove(id: string) {
    setProcessing(true);
    try {
      const response = await fetch(`/admin/api/push/subscriptions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("subscription_delete_failed");
      setStatus("Device removed from lead alerts.");
      await refresh();
    } catch {
      setStatus("The device could not be removed. Check the connection and try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function sendBrandonTest(id: string) {
    setProcessing(true);
    try {
      const setupMode = mode === "brandon";
      const response = await fetch(setupMode ? "/api/phone-alerts/test" : "/admin/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(setupMode ? { "X-AMM-Phone-Setup": "1" } : {}),
        },
        body: JSON.stringify({ subscription_id: id }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error("phone_setup_session_expired");
      if (!response.ok || result.ok !== true) {
        throw new Error(typeof result.error === "string" ? result.error : "push_test_failed");
      }
      setStatus("[TEST] Brandon phone alert sent. Confirm it appeared on this device.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "push_test_failed";
      setStatus(code === "phone_setup_session_expired"
        ? "This secure setup session expired. Request a fresh Brandon setup link."
        : `The Brandon test alert was not delivered (${code.replace(/[^a-z0-9_-]/gi, "_").slice(0, 48)}).`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-300/25 bg-black/60 p-5">
        {readiness?.needsIosHomeScreen ? (
          <div className="mb-5 rounded-xl border border-sky-300/30 bg-sky-950/35 p-4 text-sky-50">
            <p className="font-bold">One-time iPhone installation required</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>In Messages, tap <strong>•••</strong> and choose <strong>Open in Safari</strong>.</li>
              <li>In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
              <li>Open the new <strong>Magic Mike</strong> icon and return to this setup page.</li>
              <li>Tap enable and choose <strong>Allow</strong> when iPhone asks about notifications.</li>
            </ol>
            <button type="button" onClick={() => void copySetupLink()} className="mt-4 w-full rounded-lg border border-sky-200/40 px-4 py-3 font-semibold text-sky-50">Copy setup link for Safari</button>
          </div>
        ) : null}
        {mode === "admin" ? <>
          <label className="mb-2 block text-sm font-semibold text-amber-100" htmlFor="push-role">This phone belongs to</label>
          <select id="push-role" value={role} disabled={processing} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded-lg border border-amber-300/30 bg-zinc-950 px-3 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60">
            <option value="primary">Mike — primary alert</option>
            <option value="copy">Brandon — copy alert</option>
          </select>
        </> : <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"><strong>Authorized destination:</strong> Brandon copy alerts only</p>}
        <button type="button" disabled={processing || !readiness?.canRegister} onClick={() => void enable()} className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
          {processing ? "Working…" : readiness?.needsIosHomeScreen ? "Install to Home Screen first" : "Enable free phone alerts on this device"}
        </button>
        <p aria-live="polite" className="mt-3 text-sm text-zinc-300">{status}</p>
      </div>

      {mode === "admin" ? <div>
        <h2 className="text-lg font-semibold text-white">Registered devices</h2>
        <div className="mt-3 space-y-2">
          {devices.length ? devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div><strong className="text-amber-200">{device.role === "primary" ? "Mike" : "Brandon copy"}</strong><p className="mt-1 max-w-xl truncate text-zinc-400">{device.device}</p></div>
              <div className="flex shrink-0 gap-2">
                {device.role === "copy" ? <button type="button" disabled={processing} onClick={() => void sendBrandonTest(device.id)} className="rounded-md border border-amber-300/40 px-3 py-2 text-amber-100 disabled:cursor-wait disabled:opacity-60">Send Brandon test</button> : null}
                <button type="button" disabled={processing} onClick={() => void remove(device.id)} className="rounded-md border border-red-300/30 px-3 py-2 text-red-200 disabled:cursor-wait disabled:opacity-60">Remove</button>
              </div>
            </div>
          )) : <p className="text-sm text-zinc-400">{loadingDevices ? "Loading registered devices…" : "No phones registered yet."}</p>}
        </div>
      </div> : registeredCopyId ? <div className="rounded-2xl border border-emerald-300/25 bg-emerald-950/30 p-5">
        <p className="font-semibold text-emerald-100">This device is registered for Brandon copy alerts.</p>
        <button type="button" disabled={processing} onClick={() => void sendBrandonTest(registeredCopyId)} className="mt-4 w-full rounded-lg border border-emerald-200/40 px-4 py-3 font-bold text-emerald-50 disabled:cursor-wait disabled:opacity-60">Send Brandon test alert</button>
        <p className="mt-3 text-xs text-emerald-100/75">The test is labeled INTERNAL QA and creates no lead or KPI event.</p>
      </div> : null}
    </div>
  );
}
