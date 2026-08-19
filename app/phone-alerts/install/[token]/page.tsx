import type { Metadata } from "next";
import { verifyPhoneSetupToken } from "../../../lib/phoneSetupSession";

export const dynamic = "force-dynamic";

type InstallPageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: InstallPageProps): Promise<Metadata> {
  const { token } = await params;
  const valid = Boolean(verifyPhoneSetupToken(token));
  return {
    title: "Install Phone Alerts | Ask Magic Mike",
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
    manifest: valid
      ? `/phone-alerts/install/${encodeURIComponent(token)}/manifest.webmanifest`
      : undefined,
  };
}

function FreshLinkRequired() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-300/25 bg-black/60 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-3 text-3xl font-bold">Fresh install link required</h1>
        <p className="mt-4 text-zinc-300">This Brandon-only phone install link is invalid or expired. Ask an authorized Lead Center operator to create a new link when the phone is ready.</p>
      </div>
    </main>
  );
}

export default async function PhoneAlertInstallPage({ params }: InstallPageProps) {
  const { token } = await params;
  const session = verifyPhoneSetupToken(token);
  if (!session) return <FreshLinkRequired />;

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-2 text-3xl font-bold">Install Brandon copy alerts</h1>
        <p className="mt-3 text-zinc-300">This one-time install can register only a Brandon copy-notification device. It cannot view leads, register Mike, change routing, or send a consumer message.</p>

        <section className="my-6 rounded-2xl border border-sky-300/25 bg-sky-950/25 p-5">
          <h2 className="text-xl font-bold text-sky-50">Complete these steps before the link expires</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-sky-50/90">
            <li>Make sure this page is open in Safari.</li>
            <li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Leave <strong>Open as Web App</strong> enabled when shown.</li>
            <li>Leave Safari and open the new <strong>Magic Mike</strong> icon from the Home Screen.</li>
            <li>The installed app will redeem the temporary link in its own secure session. Tap <strong>Enable free phone alerts</strong>, then choose <strong>Allow</strong>.</li>
          </ol>
        </section>

        <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
          Do not bookmark, forward, or reopen this link after setup. If the installed app says the session expired, generate a fresh link and repeat the installation while the new link is active.
        </div>
      </div>
    </main>
  );
}
