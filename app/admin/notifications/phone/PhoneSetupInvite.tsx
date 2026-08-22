"use client";

import { useEffect, useState } from "react";

type InviteState = {
  url: string;
  expiresAt: number;
};

function safeInvite(value: unknown): InviteState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.url !== "string" || typeof record.expires_at !== "string") return null;
  try {
    const url = new URL(record.url, window.location.origin);
    const expiresAt = Date.parse(record.expires_at);
    const pathMatch = url.pathname.match(/^\/phone-alerts\/install\/([^/]+)$/);
    if (
      url.origin !== window.location.origin
      || !pathMatch
      || !pathMatch[1]?.includes(".")
      || url.search
      || url.hash
      || !Number.isFinite(expiresAt)
      || expiresAt <= Date.now()
    ) return null;
    return { url: url.toString(), expiresAt };
  } catch {
    return null;
  }
}

export function PhoneSetupInvite() {
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [status, setStatus] = useState("Generate a fresh link only when Brandon is ready to install the Home Screen app.");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!invite) return;
    const delay = Math.max(0, invite.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setInvite(null);
      setStatus("That setup link expired. Generate a fresh link when Brandon is ready.");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [invite]);

  async function generate() {
    setProcessing(true);
    setInvite(null);
    setStatus("Generating a restricted Brandon setup link…");
    try {
      const response = await fetch("/admin/api/phone-alerts/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttl_minutes: 20 }),
      });
      const result = await response.json().catch(() => null);
      const validated = safeInvite(result);
      if (!response.ok || !validated) throw new Error("invite_generation_failed");
      setInvite(validated);
      setStatus(`Secure Brandon-only link ready. It expires at ${new Date(validated.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch {
      setStatus("The secure setup link could not be generated. Confirm the production setup key and admin session, then retry.");
    } finally {
      setProcessing(false);
    }
  }

  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setStatus("Secure setup link copied. Send it only to Brandon and have him open it in Safari.");
    } catch {
      setStatus("Copy was blocked by this browser. Use Share secure link instead.");
    }
  }

  async function share() {
    if (!invite || !navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({
        title: "Ask Magic Mike phone setup",
        text: "Brandon: open this temporary Ask Magic Mike install link in Safari, then add that page to your Home Screen and open the Magic Mike icon.",
        url: invite.url,
      });
      setStatus("Secure install link shared. The recipient still must add the page to the Home Screen, open the installed app, and allow notifications.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Sharing was not completed. Copy the secure link instead.");
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-sky-300/25 bg-sky-950/25 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Brandon copy device</p>
      <h2 className="mt-2 text-xl font-bold text-white">Create secure setup link</h2>
      <p className="mt-2 text-sm leading-6 text-sky-50/85">The link lasts 20 minutes and installs a restricted Brandon copy setup. The installed app transfers the short-lived session into its own protected cookie context; the link cannot open leads, change routing, or register Mike.</p>
      <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-50"><strong>One-time bearer link:</strong> anyone who receives it before first claim could register a copy-alert device. Share it only with Brandon when his phone is ready, and replace it if delivery is uncertain.</p>
      <button type="button" disabled={processing} onClick={() => void generate()} className="mt-4 w-full rounded-lg bg-sky-300 px-4 py-3 font-bold text-sky-950 disabled:cursor-wait disabled:opacity-60">
        {processing ? "Generating…" : invite ? "Replace with fresh link" : "Generate Brandon setup link"}
      </button>
      {invite ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => void copy()} className="rounded-lg border border-sky-200/40 px-4 py-3 font-semibold text-sky-50">Copy secure link</button>
          <button type="button" onClick={() => void share()} className="rounded-lg border border-sky-200/40 px-4 py-3 font-semibold text-sky-50">Share secure link</button>
        </div>
      ) : null}
      <p aria-live="polite" className="mt-3 text-sm text-sky-100/80">{status}</p>
    </section>
  );
}
