"use client";

import { useState, type FormEvent } from "react";

export function PasswordHelpForm({ enabled }: { enabled: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || pending) return;
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    try {
      await fetch("/api/lead-center-auth/request-password-reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/lead-center-set-password`,
        }),
      });
    } catch {
      // Keep the response deliberately non-enumerating for approved and unknown accounts.
    } finally {
      setPending(false);
      setMessage("If that approved account exists, a one-time password link has been sent.");
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" aria-describedby="password-help-status">
      <label className="block text-sm text-zinc-200">
        Approved account email
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          disabled={!enabled || pending}
          className="mt-2 w-full rounded-lg border border-amber-300/25 bg-black px-4 py-3 text-white outline-none focus:border-amber-300"
        />
      </label>
      <button
        type="submit"
        disabled={!enabled || pending}
        className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Requesting…" : "Send secure link"}
      </button>
      <p id="password-help-status" role="status" className="min-h-6 text-sm text-zinc-300">
        {message || (!enabled ? "Per-user access is not active yet." : "")}
      </p>
    </form>
  );
}
