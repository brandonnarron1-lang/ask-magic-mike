import type { Metadata } from "next";
import Image from "next/image";
import { Clock3, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
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
    <main className="min-h-screen bg-[#050708] px-5 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-amber-300/25 bg-[radial-gradient(circle_at_top_right,rgba(212,167,44,0.12),transparent_42%),rgba(0,0,0,0.72)] p-6 shadow-2xl shadow-black/40">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-300">
          <Clock3 aria-hidden="true" className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Fresh install link required</h1>
        <p className="mt-4 leading-7 text-zinc-300">This Brandon-only phone install link is invalid or expired. Ask an authorized Lead Center operator to create a new link when the phone is ready.</p>
        <p className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">No phone was registered and no notification was sent.</p>
      </div>
    </main>
  );
}

export default async function PhoneAlertInstallPage({ params }: InstallPageProps) {
  const { token } = await params;
  const session = verifyPhoneSetupToken(token);
  if (!session) return <FreshLinkRequired />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050708] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_25%_0%,rgba(212,167,44,0.16),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.10),transparent_38%)]" />
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/70 shadow-2xl shadow-black/60 backdrop-blur-sm">
        <header className="border-b border-white/10 bg-[linear-gradient(120deg,rgba(212,167,44,0.12),transparent_48%)] p-5 sm:p-7">
          <div className="flex items-center gap-4">
            <Image
              src="/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-128.png"
              alt="Mike Eatmon, Our Town Properties"
              width={72}
              height={72}
              priority
              className="h-16 w-16 shrink-0 rounded-full border border-amber-300/40 shadow-lg shadow-amber-500/10 sm:h-[72px] sm:w-[72px]"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
              <p className="mt-1 text-sm text-zinc-400">Our Town Properties · secure operator setup</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-100"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" /> Copy role only</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sky-100"><Smartphone aria-hidden="true" className="h-3.5 w-3.5" /> iPhone Home Screen</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-amber-100"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" /> Expires automatically</span>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Install Brandon copy alerts</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">This short-lived install link can register only a Brandon copy-notification device. It cannot view leads, register Mike, change routing, or send a consumer message.</p>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          <section className="rounded-2xl border border-sky-300/20 bg-sky-950/25 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 text-sky-100">
                <Smartphone aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-200">Four quick steps</p>
                <h2 className="mt-1 text-xl font-bold text-sky-50">Complete these steps before the link expires</h2>
              </div>
            </div>
            <ol className="mt-5 grid gap-3 text-sm leading-6 text-sky-50/90 sm:grid-cols-2">
              <li className="flex gap-3 rounded-xl border border-white/5 bg-black/25 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-300 font-bold text-sky-950">1</span><span>Make sure this page is open in Safari.</span></li>
              <li className="flex gap-3 rounded-xl border border-white/5 bg-black/25 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-300 font-bold text-sky-950">2</span><span>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Leave <strong>Open as Web App</strong> enabled when shown.</span></li>
              <li className="flex gap-3 rounded-xl border border-white/5 bg-black/25 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-300 font-bold text-sky-950">3</span><span>Leave Safari and open the new <strong>Magic Mike</strong> icon from the Home Screen.</span></li>
              <li className="flex gap-3 rounded-xl border border-white/5 bg-black/25 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-300 font-bold text-sky-950">4</span><span>The installed app will claim the one-time temporary link inside its own secure cookie context. Tap <strong>Enable free phone alerts</strong>, then choose <strong>Allow</strong>.</span></li>
            </ol>
          </section>

          <div className="flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50 sm:p-5">
            <LockKeyhole aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <p><strong>Keep this link private.</strong> It is a short-lived, one-time bearer link. Anyone who receives it before first claim could register a copy-alert device. Do not bookmark or forward it. If the installed app says the link was already claimed or expired, generate a fresh link and repeat the installation while the new link is active.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
