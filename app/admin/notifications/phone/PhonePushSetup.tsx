"use client";

import { useCallback, useEffect, useState } from "react";

type Role = "primary" | "copy";
type Device = { id: string; role: Role; device: string };
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

export function PhonePushSetup({ publicKey }: { publicKey: string }) {
  const [role, setRole] = useState<Role>("primary");
  const [status, setStatus] = useState("Checking this device…");
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [readiness, setReadiness] = useState<PhonePushReadiness | null>(null);

  const refresh = useCallback(async (markReady = false) => {
    setLoadingDevices(true);
    try {
      const response = await fetch("/admin/api/push/subscriptions", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("subscription_list_failed");
      setDevices(Array.isArray(result.subscriptions) ? result.subscriptions : []);
      if (markReady) {
        const current = phonePushReadiness(publicKey);
        setReadiness(current);
        setStatus(current.message);
      }
    } catch {
      setStatus("Registered devices could not be loaded. Check your connection and try again.");
    } finally {
      setLoadingDevices(false);
    }
  }, [publicKey]);

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
      const response = await fetch("/admin/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error("subscription_registration_failed");
      await refresh();
      setStatus(`Phone alerts enabled for the ${role === "primary" ? "Mike" : "Brandon copy"} role.`);
    } catch {
      setStatus("Secure phone registration failed. Check the connection and browser notification settings, then try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function copySetupLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/admin/notifications/phone`);
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
      const response = await fetch("/admin/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error("push_test_failed");
      setStatus("[TEST] Brandon phone alert sent. Confirm it appeared on this device.");
    } catch {
      setStatus("The Brandon test alert was not delivered. Confirm notifications are allowed, then try again.");
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
        <label className="mb-2 block text-sm font-semibold text-amber-100" htmlFor="push-role">This phone belongs to</label>
        <select id="push-role" value={role} disabled={processing} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded-lg border border-amber-300/30 bg-zinc-950 px-3 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60">
          <option value="primary">Mike — primary alert</option>
          <option value="copy">Brandon — copy alert</option>
        </select>
        <button type="button" disabled={processing || !readiness?.canRegister} onClick={() => void enable()} className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
          {processing ? "Working…" : readiness?.needsIosHomeScreen ? "Install to Home Screen first" : "Enable free phone alerts on this device"}
        </button>
        <p aria-live="polite" className="mt-3 text-sm text-zinc-300">{status}</p>
      </div>

      <div>
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
      </div>
    </div>
  );
}
