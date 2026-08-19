import type { Metadata } from "next";
import Link from "next/link";
import { getLeadCenterRbacState } from "../../src/lib/admin/rbac-policy";
import { PasswordHelpForm } from "./PasswordHelpForm";
import { nonIndexablePageMetadata } from "../lib/publicMetadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = nonIndexablePageMetadata(
  "Lead Center Password Help",
  "Secure password setup and reset flow for approved Lead Center accounts.",
);

export default function LeadCenterPasswordHelpPage() {
  const state = getLeadCenterRbacState();
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-16 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-7 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-3 text-3xl font-bold">Set or reset password</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Enter the email for an approved Lead Center account. The secure link expires after 60 minutes.
        </p>
        <PasswordHelpForm enabled={state.ready} />
        <Link className="mt-3 inline-block text-sm text-amber-300 underline-offset-4 hover:underline" href="/lead-center-login">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
