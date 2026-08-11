"use client";

import { useEffect, useState } from "react";

type Role = "primary" | "copy";
type Device = { id: string; role: Role; device: string };

function decodeKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PhonePushSetup({ publicKey }: { publicKey: string }) {
  const [role, setRole] = useState<Role>("primary");
  const [status, setStatus] = useState("Checking this device…");
  const [devices, setDevices] = useState<Device[]>([]);

  async function refresh() {
    const response = await fetch("/admin/api/push/subscriptions", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (response.ok) setDevices(Array.isArray(result.subscriptions) ? result.subscriptions : []);
  }

  useEffect(() => { void refresh(); }, []);

  async function enable() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !publicKey) {
      setStatus("This browser cannot enable phone alerts, or the server key is not configured.");
      return;
    }
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
    if (!response.ok) {
      setStatus("The phone granted permission, but secure registration failed. Try again.");
      return;
    }
    setStatus(`Phone alerts enabled for the ${role === "primary" ? "Mike" : "Brandon copy"} role.`);
    await refresh();
  }

  async function remove(id: string) {
    const response = await fetch(`/admin/api/push/subscriptions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) {
      setStatus("Device removed from lead alerts.");
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-300/25 bg-black/60 p-5">
        <label className="mb-2 block text-sm font-semibold text-amber-100" htmlFor="push-role">This phone belongs to</label>
        <select id="push-role" value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded-lg border border-amber-300/30 bg-zinc-950 px-3 py-3 text-white">
          <option value="primary">Mike — primary alert</option>
          <option value="copy">Brandon — copy alert</option>
        </select>
        <button type="button" onClick={() => void enable()} className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-black hover:bg-amber-300">
          Enable free phone alerts on this device
        </button>
        <p aria-live="polite" className="mt-3 text-sm text-zinc-300">{status}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">Registered devices</h2>
        <div className="mt-3 space-y-2">
          {devices.length ? devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div><strong className="text-amber-200">{device.role === "primary" ? "Mike" : "Brandon copy"}</strong><p className="mt-1 max-w-xl truncate text-zinc-400">{device.device}</p></div>
              <button type="button" onClick={() => void remove(device.id)} className="rounded-md border border-red-300/30 px-3 py-2 text-red-200">Remove</button>
            </div>
          )) : <p className="text-sm text-zinc-400">No phones registered yet.</p>}
        </div>
      </div>
    </div>
  );
}
