import Link from "next/link";
import { PhonePushSetup } from "./PhonePushSetup";

export const dynamic = "force-dynamic";

export default function PhoneNotificationSetupPage() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/notifications" className="text-sm text-amber-300">← Notification center</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Ask Magic Mike</p>
        <h1 className="mt-2 text-3xl font-bold">Free phone lead alerts</h1>
        <p className="mt-3 text-zinc-300">Encrypted Web Push uses the phone’s native notification system with no per-message fee. Alerts contain only urgency, intent, general area, score, and a secure Lead Center link—never contact details on the lock screen.</p>
        <div className="my-6 rounded-xl border border-sky-300/20 bg-sky-950/25 p-4 text-sm text-sky-100">
          On iPhone/iPad, first use Safari’s Share menu → Add to Home Screen, open the installed Ask Magic Mike app, then return here and tap enable. Android and desktop browsers can enable directly.
        </div>
        <PhonePushSetup publicKey={publicKey} />
      </div>
    </main>
  );
}
