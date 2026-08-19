import type { Metadata } from "next";
import { Suspense } from "react";
import { getLeadCenterRbacState } from "../../src/lib/admin/rbac-policy";
import { SetPasswordForm } from "./SetPasswordForm";
import { nonIndexablePageMetadata } from "../lib/publicMetadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = nonIndexablePageMetadata(
  "Set Lead Center Password",
  "Secure password selection flow for an approved Lead Center account.",
);

export default function LeadCenterSetPasswordPage() {
  const state = getLeadCenterRbacState();
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-16 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-7 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-3 text-3xl font-bold">Choose a secure password</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Passwords must contain at least 14 characters. Completing this step revokes existing sessions.
        </p>
        <Suspense fallback={<p className="mt-8 text-sm text-zinc-300">Checking secure link…</p>}>
          <SetPasswordForm enabled={state.ready} />
        </Suspense>
      </section>
    </main>
  );
}
