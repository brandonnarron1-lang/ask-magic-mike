import { cookies } from "next/headers";
import type { Metadata } from "next";
import { PhonePushSetup } from "../../admin/notifications/phone/PhonePushSetup";
import { PHONE_SETUP_COOKIE, verifyPhoneSetupToken } from "../../lib/phoneSetupSession";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Secure Phone Setup | Ask Magic Mike",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

function Unavailable({ error }: { error?: string }) {
  const message = error === "rate_limited"
    ? "Too many setup attempts were made. Wait a few minutes before requesting another link."
    : error === "already_claimed"
      ? "This install link has already been claimed on another browser context. Request a fresh link only if the intended phone did not complete setup."
      : error === "claim_unavailable"
        ? "Secure one-time setup verification is temporarily unavailable. No device was registered; try again after service is restored."
        : "This Brandon-only phone setup session is missing or expired. Request a new secure setup link; no admin password should be entered here.";
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-300/25 bg-black/60 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-3 text-3xl font-bold">Fresh setup link required</h1>
        <p className="mt-4 text-zinc-300">{message}</p>
      </div>
    </main>
  );
}

export default async function PhoneAlertSetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const session = verifyPhoneSetupToken(cookieStore.get(PHONE_SETUP_COOKIE)?.value);
  if (!session) return <Unavailable error={params.error} />;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-2 text-3xl font-bold">Connect Brandon’s phone alerts</h1>
        <p className="mt-3 text-zinc-300">This temporary session can register only a Brandon copy-notification device. It cannot open the Lead Center, register Mike’s phone, view leads, or change routing.</p>
        <div className="my-6 rounded-xl border border-sky-300/20 bg-sky-950/25 p-4 text-sm text-sky-100">
          This session was transferred inside the installed Home Screen app. Basic Auth credentials are not required, and the temporary setup token is no longer present in the URL.
        </div>
        <PhonePushSetup publicKey={publicKey} mode="brandon" />
      </div>
    </main>
  );
}
