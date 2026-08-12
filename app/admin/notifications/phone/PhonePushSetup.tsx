"use client";

import { useCallback, useEffect, useState } from "react";

type Role = "primary" | "copy";
type Device = { id: string; role: Role; device: string };

export function phonePushCapabilityError(publicKey: string) {
  if (!publicKey) return "Phone alerts are not configured on the server yet.";
  if (
    typeof window === "undefined"
    || !("Notification" in window)
    || !("serviceWorker" in navigator)
    || !("PushManager" in window)
  ) {
    return "This browser cannot enable phone alerts. Use Safari from an installed Home Screen app on iPhone/iPad, or a current Android or desktop browser.";
  }
  return null;
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

  const refresh = useCallback(async (markReady = false) => {
    setLoadingDevices(true);
    try {
      const response = await fetch("/admin/api/push/subscriptions", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("subscription_list_failed");
      setDevices(Array.isArray(result.subscriptions) ? result.subscriptions : []);
      if (markReady) setStatus(phonePushCapabilityError(publicKey) || "Ready to register this phone.");
    } catch {
      setStatus("Registered devices could not be loaded. Check your connection and try again.");
    } finally {
      setLoadingDevices(false);
    }
  }, [publicKey]);

  useEffect(() => { void refresh(true); }, [refresh]);

  async function enable() {
    const capabilityError = phonePushCapabilityError(publicKey);
    if (capabilityError) {
      setStatus(capabilityError);
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
        <label className="mb-2 block text-sm font-semibold text-amber-100" htmlFor="push-role">This phone belongs to</label>
        <select id="push-role" value={role} disabled={processing} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded-lg border border-amber-300/30 bg-zinc-950 px-3 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60">
          <option value="primary">Mike — primary alert</option>
          <option value="copy">Brandon — copy alert</option>
        </select>
        <button type="button" disabled={processing} onClick={() => void enable()} className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-black hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60">
          {processing ? "Working…" : "Enable free phone alerts on this device"}
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
