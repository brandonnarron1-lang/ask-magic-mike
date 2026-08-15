"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SetPasswordForm({ enabled }: { enabled: boolean }) {
  const query = useSearchParams();
  const token = query.get("token") || "";
  const invalid = query.get("error") === "INVALID_TOKEN" || !token;
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || invalid || pending) return;
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    setPending(true);
    const response = await fetch("/api/lead-center-auth/reset-password", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password, token }),
    });
    setPending(false);
    if (!response.ok) {
      setMessage("The link is invalid or expired. Request a new secure link.");
      return;
    }
    setComplete(true);
    setMessage("Password set. Existing sessions were revoked; sign in with your new password.");
  }

  if (complete) {
    return (
      <div className="mt-8 space-y-5">
        <p role="status" className="text-sm leading-6 text-emerald-200">{message}</p>
        <Link className="inline-block rounded-lg bg-amber-400 px-4 py-3 font-bold text-black" href="/lead-center-login">
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" aria-describedby="set-password-status">
      <label className="block text-sm text-zinc-200">
        New password
        <input
          required
          type="password"
          name="password"
          minLength={14}
          maxLength={128}
          autoComplete="new-password"
          disabled={!enabled || invalid || pending}
          className="mt-2 w-full rounded-lg border border-amber-300/25 bg-black px-4 py-3 text-white outline-none focus:border-amber-300"
        />
      </label>
      <label className="block text-sm text-zinc-200">
        Confirm password
        <input
          required
          type="password"
          name="confirmation"
          minLength={14}
          maxLength={128}
          autoComplete="new-password"
          disabled={!enabled || invalid || pending}
          className="mt-2 w-full rounded-lg border border-amber-300/25 bg-black px-4 py-3 text-white outline-none focus:border-amber-300"
        />
      </label>
      <button
        type="submit"
        disabled={!enabled || invalid || pending}
        className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
      <p id="set-password-status" role="status" className="min-h-6 text-sm text-rose-200">
        {message || (invalid ? "This link is invalid or expired. Request a new secure link." : !enabled ? "Per-user access is not active yet." : "Use at least 14 characters.")}
      </p>
      {invalid ? (
        <Link className="inline-block text-sm text-amber-300 underline-offset-4 hover:underline" href="/lead-center-password-help">
          Request a new link
        </Link>
      ) : null}
    </form>
  );
}
