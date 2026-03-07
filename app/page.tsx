"use client";

import { useState } from "react";

type LeadPayload = {
  address: string;
  email?: string;
  name?: string;
  phone?: string;
  notes?: string;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload: LeadPayload = {
      address: (formData.get("address") as string)?.trim(),
      email: (formData.get("email") as string)?.trim() || undefined,
      name: (formData.get("name") as string)?.trim() || undefined,
      phone: (formData.get("phone") as string)?.trim() || undefined,
      notes: (formData.get("notes") as string)?.trim() || undefined,
    };

    try {
      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }

      setMessage(data?.message || "Submitted.");
      e.currentTarget.reset();
    } catch (err: any) {
      setMessage(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-3xl font-semibold">Ask Magic Mike</h1>
        <p className="mt-2 text-zinc-600">
          Enter an address and we’ll take it from there. (This is wired to Supabase + OpenAI + Resend.)
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded border bg-white p-4 shadow">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-zinc-800">
              Property address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="123 Main St, City, NC"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-800">
                Name (optional)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Brandon"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
                Email (optional)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="you@domain.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-800">
              Phone (optional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="555-123-4567"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-800">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
              rows={3}
              placeholder="What would you like help with?"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Get started"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-zinc-800">{message}</p> : null}

        <p className="mt-6 text-xs text-zinc-400">
          Calendly: https://calendly.com/askmagicmike
        </p>
      </div>
    </main>
  );
}
