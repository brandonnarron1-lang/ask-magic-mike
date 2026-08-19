import type { Metadata } from "next";
import { getLeadCenterRbacState } from "../../src/lib/admin/rbac-policy";
import { LoginForm } from "./LoginForm";
import { nonIndexablePageMetadata } from "../lib/publicMetadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = nonIndexablePageMetadata(
  "Lead Center Sign In",
  "Authorized Ask Magic Mike and Our Town Properties staff access only.",
);

export default function LeadCenterLoginPage() {
  const state = getLeadCenterRbacState();
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-16 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-7 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-3 text-3xl font-bold">Lead Center sign in</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Authorized staff only. Sessions expire, access is role-scoped, and protected actions are audited.
        </p>
        <LoginForm enabled={state.ready} />
      </section>
    </main>
  );
}
