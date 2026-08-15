"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { leadCenterAuthClient } from "../../src/lib/admin/rbac-client";

function safeReturnTo(value: string | null) {
  return value?.startsWith("/admin") ? value : "/admin";
}

export function LoginForm({ enabled }: { enabled: boolean }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || pending) return;
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const result = await leadCenterAuthClient.signIn.email({
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
      rememberMe: false,
    });
    setPending(false);
    if (result.error) {
      setError("Sign-in was not accepted. Check the account details or contact the system owner.");
      return;
    }
    const query = new URLSearchParams(window.location.search);
    window.location.assign(safeReturnTo(query.get("returnTo")));
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" aria-describedby="login-status">
      <label className="block text-sm text-zinc-200">
        Work email
        <input
          required
          type="email"
          name="email"
          autoComplete="username"
          disabled={!enabled || pending}
          className="mt-2 w-full rounded-lg border border-amber-300/25 bg-black px-4 py-3 text-white outline-none focus:border-amber-300"
        />
      </label>
      <label className="block text-sm text-zinc-200">
        Password
        <input
          required
          type="password"
          name="password"
          minLength={14}
          maxLength={128}
          autoComplete="current-password"
          disabled={!enabled || pending}
          className="mt-2 w-full rounded-lg border border-amber-300/25 bg-black px-4 py-3 text-white outline-none focus:border-amber-300"
        />
      </label>
      <button
        type="submit"
        disabled={!enabled || pending}
        className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Open Lead Center"}
      </button>
      <p className="text-center text-sm">
        <Link className="text-amber-300 underline-offset-4 hover:underline" href="/lead-center-password-help">
          Set or reset your password
        </Link>
      </p>
      <p id="login-status" role="status" className="min-h-6 text-sm text-rose-200">
        {error || (!enabled ? "Per-user access is staged but not active. Use the current authorized access method." : "")}
      </p>
    </form>
  );
}
